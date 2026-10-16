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
import { COLLEAGUE_BONUS_KOBO, splitPayment } from "@/lib/careFees";

type DoctorPractice = {
  id: string;
  kind: string | null;
  status: string;
  agent_id: string | null;
  invited_by: string | null;
};

type AgentRow = { id: string; status: string; manager_id: string | null; role: string };

/** The doctor's practice this patient is with right now, or null. */
export async function patientsDoctor(admin: SupabaseClient, uid: string): Promise<{ practice: DoctorPractice } | null> {
  const { data, error } = await admin
    .from("hospital_patients")
    .select("id,joined_at,hospitals(id,kind,status,agent_id,invited_by)")
    .eq("user_id", uid)
    .eq("status", "active")
    .order("joined_at", { ascending: false });
  if (error || !data) return null;
  for (const r of data as unknown as { hospitals: DoctorPractice | null }[]) {
    const h = r.hospitals;
    if (h && h.kind === "doctor" && h.status === "active") return { practice: h };
  }
  return null;
}

export async function earnCareFees(
  admin: SupabaseClient,
  p: { uid: string; reference: string; amount: number; paidAt: string },
): Promise<void> {
  try {
    const link = await patientsDoctor(admin, p.uid);
    if (!link) return;
    const practice = link.practice;
    const paidAt = new Date(p.paidAt || Date.now());

    // The patient's first payment while with this doctor (the agent's 12 months start there).
    const { data: first } = await admin
      .from("clinician_earnings")
      .select("earned_at")
      .eq("kind", "care")
      .eq("patient_user_id", p.uid)
      .eq("source_hospital_id", practice.id)
      .order("earned_at", { ascending: true })
      .limit(1);
    const firstPaidAt = first && first.length ? new Date(first[0].earned_at as string) : null;

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

    const rows = shares.map((s) => ({
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

/** True once supabase/doctors-schema.sql has been pasted in. */
export async function doctorsReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("field_agents").select("id").limit(1);
  return !error;
}

export type EarningRow = {
  id: string;
  reference: string;
  kind: "care" | "agent" | "advisor" | "colleague";
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
