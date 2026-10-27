/**
 * Server side of care fees (the rules are lib/careFees.ts). Called once per
 * successful patient payment from lib/paymentGrant.ts, which already makes
 * sure each Paystack payment is granted exactly once. On top of that, the
 * unique key (reference, kind) on clinician_earnings means a re-run can never
 * pay twice.
 *
 * It must never cost a patient their access: every failure is swallowed, and
 * before supabase/doctors-schema.sql runs it simply finds no doctor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { TRIAL_DAYS } from "@/lib/trial";
import { COLLEAGUE_BONUS_KOBO, REVIEW_FEE_KOBO, reviewReference, splitPayment, splitRepPatientPayment } from "@/lib/careFees";
import { repPatientLink } from "@/lib/repPatients";

type DoctorPractice = {
  id: string;
  kind: string | null;
  status: string;
  agent_id: string | null;
  invited_by: string | null;
};

type AgentRow = { id: string; status: string; manager_id: string | null; role: string };

/** The doctor's practice this patient is with right now, or null. */
export async function patientsDoctor(admin: SupabaseClient, uid: string): Promise<{ practice: DoctorPractice; joinedAt: string | null } | null> {
  const { data, error } = await admin
    .from("hospital_patients")
    .select("id,joined_at,hospitals(id,kind,status,agent_id,invited_by)")
    .eq("user_id", uid)
    .eq("status", "active")
    .order("joined_at", { ascending: false });
  if (error || !data) return null;
  for (const r of data as unknown as { joined_at: string | null; hospitals: DoctorPractice | null }[]) {
    const h = r.hospitals;
    if (h && h.kind === "doctor" && h.status === "active") return { practice: h, joinedAt: r.joined_at };
  }
  return null;
}

export async function earnCareFees(
  admin: SupabaseClient,
  p: { uid: string; reference: string; amount: number; paidAt: string },
): Promise<void> {
  try {
    // A patient a rep brought with their PATIENT link (/p/<code>): the rep
    // gets a third for the patient's first 12 months. This link wins over a
    // doctor's rep shares (the rep found the patient first), so the two can
    // never both be paid on one payment. A doctor's colleague bonus below is
    // separate and still runs.
    const repLink = await repPatientLink(admin, p.uid);
    if (repLink) await earnRepPatientFee(admin, p, repLink);

    const link = await patientsDoctor(admin, p.uid);
    if (!link) return;
    const practice = link.practice;
    const paidAt = new Date(p.paidAt || Date.now());

    // The patient's first payment while with this doctor (the agent's 12 months
    // start there). Read from payments: since 2026-10-20 a payment no longer
    // writes a doctor's 'care' row to count from. This payment is already in
    // payments (lib/paymentGrant.ts inserts it first), so a first payment
    // finds itself and the window is open.
    let firstQuery = admin
      .from("payments")
      .select("paid_at")
      .eq("user_id", p.uid)
      .eq("status", "success")
      .not("paid_at", "is", null);
    if (link.joinedAt) firstQuery = firstQuery.gte("paid_at", link.joinedAt);
    const { data: first } = await firstQuery.order("paid_at", { ascending: true }).limit(1);
    const firstPaidAt = first && first.length ? new Date(first[0].paid_at as string) : null;

    let agent: AgentRow | null = null;
    let advisor: AgentRow | null = null;
    if (practice.agent_id) {
      const { data: a } = await admin.from("field_agents").select("id,status,manager_id,role").eq("id", practice.agent_id).maybeSingle();
      agent = (a as AgentRow | null) ?? null;
      if (agent?.manager_id && agent.role !== "advisor") {
        const { data: m } = await admin.from("field_agents").select("id,status,manager_id,role").eq("id", agent.manager_id).maybeSingle();
        advisor = m && (m as AgentRow).status === "active" ? (m as AgentRow) : null;
      }
    }

    const shares = splitPayment({
      amountKobo: p.amount,
      hasAgent: !!practice.agent_id,
      agentActive: !!agent && agent.status === "active",
      agentIsAdvisor: agent?.role === "advisor",
      hasAdvisor: !!advisor,
      paidAt,
      firstPaidAt,
    });

    const rows = (repLink ? [] : shares).map((s) => ({
      reference: p.reference,
      kind: s.kind,
      hospital_id: s.kind === "care" ? practice.id : null,
      // The advisor's share goes to the agent's advisor, or to the advisor
      // himself when he brought the doctor.
      agent_id:
        s.kind === "agent" ? agent?.id ?? null : s.kind === "advisor" ? (agent?.role === "advisor" ? agent.id : advisor?.id ?? null) : null,
      source_hospital_id: practice.id,
      patient_user_id: p.uid,
      payment_amount: p.amount,
      rate: s.rate,
      amount: s.amount,
      earned_at: paidAt.toISOString(),
    }));
    if (rows.length) await admin.from("clinician_earnings").upsert(rows, { onConflict: "reference,kind", ignoreDuplicates: true });

    // The colleague bonus: once, to the doctor who invited this one, on this
    // doctor's first paying patient.
    if (practice.invited_by) {
      const { data: inviter } = await admin.from("hospitals").select("id,kind,status").eq("id", practice.invited_by).maybeSingle();
      if (inviter && inviter.kind === "doctor" && inviter.status === "active") {
        await admin.from("clinician_earnings").upsert(
          {
            reference: `colleague:${practice.id}`,
            kind: "colleague",
            hospital_id: inviter.id,
            source_hospital_id: practice.id,
            patient_user_id: null,
            payment_amount: p.amount,
            rate: null,
            amount: COLLEAGUE_BONUS_KOBO,
            earned_at: paidAt.toISOString(),
          },
          { onConflict: "reference,kind", ignoreDuplicates: true },
        );
      }
    }
  } catch {
    /* never block a patient's access over a care fee */
  }
}

async function earnRepPatientFee(
  admin: SupabaseClient,
  p: { uid: string; reference: string; amount: number; paidAt: string },
  repLink: { agentId: string; attachedAt: string },
): Promise<void> {
  try {
    const paidAt = new Date(p.paidAt || Date.now());
    const { data: rep } = await admin.from("field_agents").select("id,status").eq("id", repLink.agentId).maybeSingle();
    // The 12 months start at the patient's first payment since they were tied
    // to the rep. This payment is already in payments, so a first payment
    // finds itself.
    const { data: first } = await admin
      .from("payments")
      .select("paid_at")
      .eq("user_id", p.uid)
      .eq("status", "success")
      .not("paid_at", "is", null)
      .gte("paid_at", repLink.attachedAt)
      .order("paid_at", { ascending: true })
      .limit(1);
    const firstPaidAt = first && first.length ? new Date(first[0].paid_at as string) : null;
    const shares = splitRepPatientPayment({ amountKobo: p.amount, agentActive: rep?.status === "active", paidAt, firstPaidAt });
    if (!shares.length) return;
    await admin.from("clinician_earnings").upsert(
      shares.map((s) => ({
        reference: p.reference,
        kind: s.kind,
        hospital_id: null,
        agent_id: repLink.agentId,
        source_hospital_id: null,
        patient_user_id: p.uid,
        payment_amount: p.amount,
        rate: s.rate,
        amount: s.amount,
        earned_at: paidAt.toISOString(),
      })),
      { onConflict: "reference,kind", ignoreDuplicates: true },
    );
  } catch {
    /* never block a patient's access over a rep's fee */
  }
}

/** True while this person has a paid GluFloat plan running (any tier). */
export async function payingNow(admin: SupabaseClient, uid: string): Promise<boolean> {
  const { data } = await admin.from("subscriptions").select("status,current_period_end").eq("user_id", uid).maybeSingle();
  const end = data?.current_period_end ? new Date(data.current_period_end as string).getTime() : 0;
  return !!data && (data.status === "active" || data.status === "non-renewing") && end > Date.now();
}

/**
 * May a GluFloat doctor see this patient's record (meals, sugar tests, flags,
 * report)? While they pay, and during their free trial (founder, 2026-10-20).
 * The trial is 7 x 24h from trial_start, the same rule as lib/hospitalRoster.ts.
 * The review button and its N1,000 still need payingNow().
 */
export async function doctorCanSeeRecord(admin: SupabaseClient, uid: string): Promise<boolean> {
  if (await payingNow(admin, uid)) return true;
  const { data } = await admin.from("profiles").select("trial_start").eq("id", uid).maybeSingle();
  const start = data?.trial_start ? new Date(data.trial_start as string).getTime() : 0;
  return start > 0 && Date.now() - start < TRIAL_DAYS * 86_400_000;
}

/** Has this doctor already earned this month's review fee for this patient? */
export async function reviewFeeThisMonth(admin: SupabaseClient, practiceId: string, uid: string, at = new Date()): Promise<boolean> {
  const { data } = await admin
    .from("clinician_earnings")
    .select("id")
    .eq("reference", reviewReference(practiceId, uid, at))
    .eq("kind", "care")
    .maybeSingle();
  return !!data;
}

/**
 * A doctor pressed "Mark as reviewed" on a patient (founder, 2026-10-20).
 * N1,000 is credited at once, once per patient per calendar month (WAT), and
 * only while the patient has a paid GluFloat plan. The unique (reference,
 * kind) on clinician_earnings makes a second press, or two at once, pay
 * nothing more. The review itself is remembered on the patient row
 * (doctor-review-schema.sql) whether or not a fee is due; before that SQL
 * runs it is simply not remembered.
 */
export async function creditReview(
  admin: SupabaseClient,
  p: { practiceId: string; patientRowId: string; uid: string; reviewer: string },
): Promise<{ credited: boolean; already: boolean; paying: boolean }> {
  const at = new Date();
  await admin.from("hospital_patients").update({ reviewed_at: at.toISOString(), reviewed_by: p.reviewer }).eq("id", p.patientRowId);
  if (await reviewFeeThisMonth(admin, p.practiceId, p.uid, at)) return { credited: false, already: true, paying: true };
  const paying = await payingNow(admin, p.uid);
  if (!paying) return { credited: false, already: false, paying: false };
  const { data, error } = await admin
    .from("clinician_earnings")
    .upsert(
      {
        reference: reviewReference(p.practiceId, p.uid, at),
        kind: "care",
        hospital_id: p.practiceId,
        source_hospital_id: p.practiceId,
        patient_user_id: p.uid,
        payment_amount: null,
        rate: null,
        amount: REVIEW_FEE_KOBO,
        earned_at: at.toISOString(),
      },
      { onConflict: "reference,kind", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(error.message);
  return { credited: !!data && data.length > 0, already: !data || data.length === 0, paying: true };
}

/** True once supabase/doctors-schema.sql has been pasted in. */
export async function doctorsReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("field_agents").select("id").limit(1);
  return !error;
}

export type EarningRow = {
  id: string;
  reference: string;
  /** "dietitian": her share of a patient's payment to her (patient-pays-schema.sql). */
  kind: "care" | "agent" | "advisor" | "colleague" | "dietitian";
  hospital_id: string | null;
  agent_id: string | null;
  source_hospital_id: string | null;
  patient_user_id: string | null;
  payment_amount: number | null;
  amount: number;
  earned_at: string;
  payout_id: string | null;
};

export type PayoutRow = {
  id: string;
  hospital_id: string | null;
  agent_id: string | null;
  amount: number;
  status: "sending" | "paid" | "failed";
  reference: string;
  note: string | null;
  created_at: string;
};

/** Totals for one person: owed (not yet sent), on its way, and paid. */
export function earningTotals(earnings: EarningRow[], payouts: PayoutRow[]) {
  const status = new Map(payouts.map((p) => [p.id, p.status]));
  let owed = 0;
  let sending = 0;
  let paid = 0;
  for (const e of earnings) {
    const s = e.payout_id ? status.get(e.payout_id) : undefined;
    if (!e.payout_id || s === "failed" || s === undefined) owed += e.amount;
    else if (s === "sending") sending += e.amount;
    else paid += e.amount;
  }
  return { owed, sending, paid, total: owed + sending + paid };
}
