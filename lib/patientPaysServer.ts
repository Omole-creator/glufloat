/**
 * The server half of "patients pay their dietitian through GluFloat"
 * (2026-10-17, supabase/patient-pays-schema.sql). Rules are in
 * lib/patientPays.ts.
 *
 * How a price GluFloat never set up on Paystack gets paid: there is no
 * Paystack payment page for it. When the patient taps Pay, the server asks
 * Paystack to start a payment for exactly her price (Transaction Initialize),
 * with a hidden note (metadata) saying who it is for. Paystack hands back a
 * checkout link, the patient pays by card, transfer or USSD as usual, and
 * comes back to /unlock. The claim route and the webhook verify the payment
 * with Paystack and send it here.
 *
 * The metadata can be trusted: only GluFloat's secret key can start a
 * Paystack payment that carries it, and the amount is read back from Paystack,
 * never from the browser.
 */
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";
import type { HospitalRow, PatientRow } from "@/lib/hospitalServer";
import { dietitianShareKobo, isPatientPays, nextPaidUntil, PATIENT_PAY_KIND, patientPrice } from "@/lib/patientPays";

/** Is #32 in the database? (The lock table must exist before anyone pays.) */
export async function patientPaysReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("patient_payments").select("reference", { head: true, count: "exact" }).limit(1);
  return !error;
}

type Joined = PatientRow & { hospitals: HospitalRow | null };

/** The signed-in person's place with a patient-pays dietitian, if any (active or paused). */
export async function patientPaysRow(admin: SupabaseClient, uid: string): Promise<Joined | null> {
  const { data } = await admin
    .from("hospital_patients")
    .select("*,hospitals(*)")
    .eq("user_id", uid)
    .in("status", ["active", "paused"]);
  const rows = ((data ?? []) as unknown as Joined[]).filter(
    (r) => r.hospitals && isPatientPays(r.hospitals) && r.hospitals.status !== "declined",
  );
  // The newest, the same pick hospitalStatusFor makes.
  rows.sort((a, b) => (b.joined_at ?? "").localeCompare(a.joined_at ?? ""));
  return rows[0] ?? null;
}

export type StartResult = { url: string } | { error: string; status: number };

/** Start a Paystack payment for one month with their dietitian, at her price. */
export async function startPatientPayment(admin: SupabaseClient, uid: string, email: string | null): Promise<StartResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { error: "Payments are not set up yet.", status: 500 };
  if (!(await patientPaysReady(admin))) return { error: "This is not ready yet. Please try again soon.", status: 503 };
  const row = await patientPaysRow(admin, uid);
  if (!row || !row.hospitals) return { error: "You are not with a dietitian on GluFloat.", status: 404 };
  if (!email) return { error: "Your account has no email. Please contact GluFloat.", status: 400 };

  const price = patientPrice(row.hospitals);
  const reference = `gf-pp-${randomBytes(9).toString("hex")}`;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: price * 100,
      reference,
      callback_url: `${SITE_URL}/unlock`,
      metadata: {
        kind: PATIENT_PAY_KIND,
        user_id: uid,
        hospital_id: row.hospitals.id,
        patient_row_id: row.id,
        price,
        custom_fields: [{ display_name: "Paying", variable_name: "paying", value: `1 month with ${row.hospitals.name}` }],
      },
    }),
    cache: "no-store",
  }).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  const url = body?.data?.authorization_url;
  if (!res || !res.ok || !body?.status || typeof url !== "string")
    return { error: "We could not start the payment. Please try again.", status: 502 };
  return { url };
}

/** Paystack's metadata, as an object (it can arrive as a JSON string). */
export function readMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Is this verified Paystack payment a patient paying their dietitian? */
export function isPatientPayment(meta: Record<string, unknown>): boolean {
  return meta.kind === PATIENT_PAY_KIND;
}

export type PatientGrantResult = "granted" | "already" | "conflict" | "no_patient" | "not_ready";

/**
 * Turn ONE successful patient payment into a month with their dietitian,
 * exactly once. The lock is patient_payments.reference (primary key),
 * inserted with ignoreDuplicates, the same shape as lib/paymentGrant.ts:
 * whichever of the claim and the webhook inserts first grants; the other is
 * told "already".
 *
 * `uid` is the person the money is for: the signed-in buyer on the claim, or
 * the metadata's user_id on the webhook. On the claim it must match the
 * metadata, so nobody can claim somebody else's payment.
 */
export async function grantPatientPayment(
  admin: SupabaseClient,
  p: { uid: string; reference: string; amount: number; paidAt: string; meta: Record<string, unknown> },
): Promise<PatientGrantResult> {
  if (typeof p.meta.user_id === "string" && p.meta.user_id !== p.uid) return "conflict";
  const hospitalId = typeof p.meta.hospital_id === "string" ? p.meta.hospital_id : null;
  const rowId = typeof p.meta.patient_row_id === "string" ? p.meta.patient_row_id : null;

  // Their place with her: the row named in the payment, still theirs.
  let row: Joined | null = null;
  if (rowId) {
    const { data } = await admin.from("hospital_patients").select("*,hospitals(*)").eq("id", rowId).maybeSingle();
    const r = data as Joined | null;
    if (r && r.user_id === p.uid && r.hospital_id === hospitalId && r.hospitals && isPatientPays(r.hospitals)) row = r;
  }
  const share = row ? dietitianShareKobo(p.amount) : 0;

  const { data: inserted, error } = await admin
    .from("patient_payments")
    .upsert(
      {
        reference: p.reference,
        hospital_id: row?.hospital_id ?? hospitalId,
        patient_row_id: row?.id ?? null,
        user_id: p.uid,
        amount: p.amount,
        dietitian_share: share,
        paid_at: p.paidAt,
      },
      { onConflict: "reference", ignoreDuplicates: true },
    )
    .select("reference");
  if (error) return "not_ready";
  if (!inserted || inserted.length === 0) {
    const { data: existing } = await admin.from("patient_payments").select("user_id").eq("reference", p.reference).maybeSingle();
    return existing?.user_id && existing.user_id !== p.uid ? "conflict" : "already";
  }
  // Kept with no patient, so GluFloat can see a payment that found nobody
  // (they left her between tapping Pay and paying) and refund or place it.
  if (!row || !row.hospitals) return "no_patient";

  // A month after whatever is left (or after their saved days, if paused).
  // Paying always brings a paused patient back.
  const until = nextPaidUntil(row);
  await admin
    .from("hospital_patients")
    .update({ paid_until: until.toISOString(), status: "active", paused_left_ms: null })
    .eq("id", row.id);
  await admin.from("patient_payments").update({ paid_until: until.toISOString() }).eq("reference", p.reference);

  // Her share: a care fee row (kind 'dietitian'), so her Earnings page,
  // /admin/payouts and Finance (as a cost) all see it. Unique on
  // (reference, kind): never twice.
  if (share > 0)
    await admin.from("clinician_earnings").upsert(
      {
        reference: p.reference,
        kind: "dietitian",
        hospital_id: row.hospital_id,
        source_hospital_id: row.hospital_id,
        patient_user_id: p.uid,
        payment_amount: p.amount,
        rate: Math.round((share / p.amount) * 10_000) / 10_000,
        amount: share,
        earned_at: p.paidAt,
      },
      { onConflict: "reference,kind", ignoreDuplicates: true },
    );

  // The whole payment is money a customer paid GluFloat, counted on
  // /admin/finance; her share is counted there as a cost (above).
  await admin.from("finance_income").insert({
    received_on: p.paidAt.slice(0, 10),
    amount: p.amount,
    kind: "other_revenue",
    source: `Dietitian patient: ${row.hospitals.name}`,
    note: `1 month, Paystack ${p.reference}`,
  });

  return "granted";
}
