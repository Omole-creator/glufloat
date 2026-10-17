/**
 * Patients pay their dietitian through GluFloat (2026-10-17,
 * supabase/patient-pays-schema.sql). Pure rules, no database, so
 * scripts/patient-pays-test.ts proves every one.
 *
 * Founder's decisions, asked one at a time:
 *  - She sets her own monthly price per patient, at least N4,500 (the
 *    Premium price, so a patient never finds GluFloat cheaper by leaving
 *    her). N4,500 until she changes it.
 *  - GluFloat keeps N2,000 of each payment, and Paystack's fee comes out of
 *    GluFloat's N2,000, never out of hers. So her share is exactly
 *    "her price minus N2,000", a number she can trust.
 *  - Each patient gets 14 free days from the day they join, then pays one
 *    month at a time.
 */

/** The least a dietitian may charge a patient a month, in naira. */
export const PATIENT_PRICE_MIN = 4_500;
/** The most, in naira: a typo guard, not a business rule. */
export const PATIENT_PRICE_MAX = 1_000_000;
/** What GluFloat keeps from each payment, in naira. */
export const GLUFLOAT_SHARE = 2_000;
/**
 * The volume discount (founder, 2026-10-17): while MORE than this many
 * patients have paid her in the last 30 days, GluFloat keeps the lower share
 * on every new payment. Drop back to this many or fewer and it is N2,000 again.
 */
export const VOLUME_PATIENTS = 25;
/** What GluFloat keeps per payment for a practice over VOLUME_PATIENTS, in naira. */
export const GLUFLOAT_SHARE_VOLUME = 1_750;
/** The days the paying-patient count looks back over. */
export const VOLUME_WINDOW_DAYS = 30;
/** Free days for each new patient of a dietitian. */
export const PATIENT_FREE_DAYS = 14;
/** One payment buys this many days. */
export const PATIENT_PAID_DAYS = 30;
/** The plan name stored on a patient-pays practice. */
export const PATIENT_PAYS_PLAN = "patient_pays";
/** Paystack metadata `kind` on a patient's payment to their dietitian. */
export const PATIENT_PAY_KIND = "practice_patient";

type PriceHolder = { kind?: string | null; patient_price?: number | null };

/** A dietitian's practice (every one is patient-pays once #32 has run). */
export function isPatientPays(h: { kind?: string | null; plan?: string | null } | null | undefined): boolean {
  return h?.kind === "dietitian" && h.plan === PATIENT_PAYS_PLAN;
}

/** Her price in naira: what she set, or the minimum. Never below the minimum. */
export function patientPrice(h: PriceHolder | null | undefined): number {
  const p = Number(h?.patient_price);
  if (!Number.isFinite(p) || p < PATIENT_PRICE_MIN) return PATIENT_PRICE_MIN;
  return Math.min(PATIENT_PRICE_MAX, Math.round(p));
}

/**
 * What GluFloat keeps per payment, in naira, for a practice with this many
 * patients who paid her in the last 30 days (this payment's patient counted).
 */
export function glufloatShareFor(payingPatients = 0): number {
  return payingPatients > VOLUME_PATIENTS ? GLUFLOAT_SHARE_VOLUME : GLUFLOAT_SHARE;
}

/** Her share of a payment, in kobo. Zero for anything at or under GluFloat's share. */
export function dietitianShareKobo(amountKobo: number, payingPatients = 0): number {
  const a = Math.round(Number(amountKobo) || 0);
  return Math.max(0, a - glufloatShareFor(payingPatients) * 100);
}

/** Her share of her own price, in naira. */
export function dietitianShareNaira(priceNaira: number, payingPatients = 0): number {
  return Math.max(0, Math.round(priceNaira) - glufloatShareFor(payingPatients));
}

/** Her share as a whole percentage of her price ("67%"). */
export function dietitianPercent(priceNaira: number, payingPatients = 0): number {
  if (priceNaira <= 0) return 0;
  return Math.round((dietitianShareNaira(priceNaira, payingPatients) / priceNaira) * 100);
}

/**
 * Check a price she typed. Returns the whole naira number, or an error
 * sentence. Commas and a naira sign are allowed ("₦6,000").
 */
export function parsePatientPrice(raw: unknown): { price: number } | { error: string } {
  const digits = String(raw ?? "").replace(/[₦,\s]/g, "").replace(/^N/i, "");
  if (!/^\d+$/.test(digits)) return { error: "Type your price as a number, for example 6000." };
  const n = Number.parseInt(digits, 10);
  if (n < PATIENT_PRICE_MIN) return { error: `Your price must be at least ₦${PATIENT_PRICE_MIN.toLocaleString("en-NG")}.` };
  if (n > PATIENT_PRICE_MAX) return { error: "That price is too high. Please check it." };
  return { price: n };
}

/**
 * The new end of a patient's time after one payment. A paused patient's
 * saved days come first (a pause never loses or makes days); otherwise the
 * month is added after whatever time is left, or from now if it has run out.
 */
export function nextPaidUntil(
  p: { status: string; paid_until?: string | null; paused_left_ms?: number | null },
  now = Date.now(),
): Date {
  const DAY = 86_400_000;
  let from: number;
  if (p.status === "paused") from = now + Math.max(0, Number(p.paused_left_ms ?? 0));
  else {
    const end = p.paid_until ? new Date(p.paid_until).getTime() : 0;
    from = Math.max(now, Number.isFinite(end) ? end : 0);
  }
  return new Date(from + PATIENT_PAID_DAYS * DAY);
}

/** Days left on a patient's time (0 when run out or never set). */
export function daysLeft(paidUntil: string | null | undefined, now = Date.now()): number {
  if (!paidUntil) return 0;
  return Math.max(0, Math.ceil((new Date(paidUntil).getTime() - now) / 86_400_000));
}

/** "₦6,000" */
export function naira(n: number): string {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}
