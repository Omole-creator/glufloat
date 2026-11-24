import { tierForAmount } from "@/lib/pricing";
/**
 * Care fees: what a doctor, a field agent and an advisor earn from a patient's
 * payment. Pure (no I/O), so `npx tsx scripts/care-fees-test.ts` proves every
 * rule. The server side is lib/careFeesServer.ts.
 *
 * Founder's decisions (advisor's model, 2026-10-16, revised the same day):
 *  - Doctor: N1,000 for each patient they mark as reviewed, once a calendar
 *    month (WAT), only while that patient has a paid Glufloat plan. Credited
 *    the moment they press "Mark as reviewed" (founder, 2026-10-20). This
 *    replaced 22.23% of every payment, which doctors read as a referral fee.
 *    A payment itself no longer earns the doctor anything.
 *  - Agent 11.12% and their advisor 10%, only for the patient's first 12
 *    months. An agent with no advisor still gets 11.12%; the 10% stays with
 *    Glufloat.
 *  - A doctor the advisor brought HIMSELF: the advisor gets 15% for the
 *    patient's first 12 months, and nobody else but the doctor.
 *  - A doctor who invites a colleague gets N3,000 once, when the colleague's
 *    first patient pays for Glufloat PREMIUM (founder, 2026-11-16: a doctor's
 *    patients are offered Premium only).
 *  - The rep (or advisor) who brought Doctor A earns N300 a month from each
 *    paying patient of a doctor Doctor A invited (Doctor B, "second degree"),
 *    for that patient's first 12 months; a yearly payment counts as 12 months
 *    (N3,600). One step only: nothing from a doctor Doctor B invites. No
 *    advisor share on it (founder, 2026-11-16).
 *  - Paid weekly, no minimum.
 *  - A rep's link for PATIENTS (/p/<ref_code>, founder, 2026-10-27): a third
 *    of each payment by that patient for their first 12 months (N1,500 of
 *    Premium's N4,500, Glufloat keeps N3,000), any plan, monthly or yearly.
 *    No advisor share.
 *
 * Everything is in kobo. Shares are rounded DOWN, so the parts can never add
 * up to more than the payment.
 */

/** N1,000 to a doctor for one patient reviewed in one month. */
export const REVIEW_FEE_KOBO = 100_000;
export const AGENT_RATE = 0.1112;
/** The advisor's share on a doctor one of their agents brought. */
export const ADVISOR_RATE = 0.1;
/** The advisor's share on a doctor the advisor brought himself. */
export const ADVISOR_DIRECT_RATE = 0.15;
/** Agent and advisor shares stop this long after the patient's first payment. */
export const AGENT_WINDOW_DAYS = 365;
/** A rep's share of a patient they brought with their patient link: a third. */
export const REP_PATIENT_SHARE = 1 / 3;
/** N3,000 to a doctor when a colleague they invited gets their first paying patient. */
export const COLLEAGUE_BONUS_KOBO = 300_000;
/** N300 a month to the rep from each paying patient of a doctor their doctor invited. */
export const SECOND_DEGREE_FEE_KOBO = 30_000;

const DAY_MS = 86_400_000;

/** "dietitian": her share of a patient's payment to her (patient-pays-schema.sql). */
export type EarningKind = "care" | "agent" | "advisor" | "colleague" | "dietitian";

export type Share = { kind: Exclude<EarningKind, "colleague" | "dietitian">; rate: number; amount: number };

/**
 * How one payment is shared.
 *  - `hasAgent`: a field agent (or the advisor) brought this doctor.
 *  - `agentActive`: that person is still active, so they are paid (default true).
 *  - `agentIsAdvisor`: the person who brought the doctor IS the advisor.
 *  - `hasAdvisor`: an agent's active advisor (ignored when agentIsAdvisor).
 *  - `firstPaidAt`: when this patient first paid while with this doctor
 *    (null = this is the first payment).
 */
export function splitPayment(opts: {
  amountKobo: number;
  hasAgent: boolean;
  agentActive?: boolean;
  agentIsAdvisor?: boolean;
  hasAdvisor: boolean;
  paidAt: Date;
  firstPaidAt: Date | null;
}): Share[] {
  const amount = Math.max(0, Math.floor(opts.amountKobo));
  if (amount <= 0) return [];
  // The doctor is paid for reviews (REVIEW_FEE_KOBO), never from a payment.
  const out: Share[] = [];
  if (opts.hasAgent && opts.agentActive !== false && agentWindowOpen(opts.firstPaidAt, opts.paidAt)) {
    if (opts.agentIsAdvisor) {
      out.push({ kind: "advisor", rate: ADVISOR_DIRECT_RATE, amount: Math.floor(amount * ADVISOR_DIRECT_RATE) });
    } else {
      out.push({ kind: "agent", rate: AGENT_RATE, amount: Math.floor(amount * AGENT_RATE) });
      if (opts.hasAdvisor) out.push({ kind: "advisor", rate: ADVISOR_RATE, amount: Math.floor(amount * ADVISOR_RATE) });
    }
  }
  return out.filter((s) => s.amount > 0);
}

/**
 * One payment by a patient a rep brought with their patient link. Kind
 * "agent", so it is owed and paid out exactly like the rep's doctor shares.
 */
export function splitRepPatientPayment(opts: {
  amountKobo: number;
  agentActive: boolean;
  paidAt: Date;
  firstPaidAt: Date | null;
}): Share[] {
  const amount = Math.max(0, Math.floor(opts.amountKobo));
  if (amount <= 0 || !opts.agentActive || !agentWindowOpen(opts.firstPaidAt, opts.paidAt)) return [];
  const share = Math.floor(amount / 3);
  return share > 0 ? [{ kind: "agent", rate: REP_PATIENT_SHARE, amount: share }] : [];
}

/**
 * The rep's N300 from one payment by a patient of a doctor their doctor
 * invited. A yearly payment buys 12 months, so it earns 12 x N300. Nothing
 * once the patient's first 12 months are over, or when the rep is off.
 */
export function secondDegreeFee(opts: { amountKobo: number; yearly: boolean; agentActive: boolean; paidAt: Date; firstPaidAt: Date | null }): number {
  if (!(opts.amountKobo > 0) || !opts.agentActive || !agentWindowOpen(opts.firstPaidAt, opts.paidAt)) return 0;
  return SECOND_DEGREE_FEE_KOBO * (opts.yearly ? 12 : 1);
}

/**
 * A nurse partner (founder, 2026-11-24): N1,000 a month to the nurse and N450
 * a month to the person who brought her (the advisor, or a rep), from each of
 * her patients' payments for Glufloat Premium, for the patient's first 12
 * months (counted from their first payment with her). A yearly payment buys
 * 12 months, so it earns 12 times each. Her patients are offered Premium
 * only; a Basic or Plus payment earns nothing. No percentage, no review.
 */
export const NURSE_FEE_KOBO = 100_000;
export const NURSE_BRINGER_FEE_KOBO = 45_000;

export function nurseFees(opts: {
  amountKobo: number;
  yearly: boolean;
  hasBringer: boolean;
  bringerActive: boolean;
  paidAt: Date;
  firstPaidAt: Date | null;
}): { nurse: number; bringer: number } {
  if (!(opts.amountKobo > 0) || tierForAmount(opts.amountKobo) !== "dietitian" || !agentWindowOpen(opts.firstPaidAt, opts.paidAt))
    return { nurse: 0, bringer: 0 };
  const months = opts.yearly ? 12 : 1;
  return {
    nurse: NURSE_FEE_KOBO * months,
    bringer: opts.hasBringer && opts.bringerActive ? NURSE_BRINGER_FEE_KOBO * months : 0,
  };
}

/** The colleague bonus is paid only on a Glufloat Premium payment (monthly, yearly or with a creator's code). */
export function earnsColleagueBonus(amountKobo: number): boolean {
  return tierForAmount(amountKobo) === "dietitian";
}

/** "2026-10": the calendar month (WAT) a review falls in. */
export function reviewMonthWAT(at: Date): string {
  const wat = new Date(at.getTime() + 3_600_000);
  return `${wat.getUTCFullYear()}-${String(wat.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The key of a review fee in clinician_earnings (kind 'care'). The table's
 * unique (reference, kind) makes it once per doctor, patient and month.
 */
export function reviewReference(practiceId: string, patientUid: string, at: Date): string {
  return `review:${practiceId}:${patientUid}:${reviewMonthWAT(at)}`;
}

/** Inside the patient's first 12 months (counted from their first payment)? */
export function agentWindowOpen(firstPaidAt: Date | null, paidAt: Date): boolean {
  if (!firstPaidAt) return true;
  return paidAt.getTime() - firstPaidAt.getTime() < AGENT_WINDOW_DAYS * DAY_MS;
}

/** What Glufloat keeps, before Paystack's fee. */
export function glufloatShare(amountKobo: number, shares: Share[]): number {
  return Math.floor(amountKobo) - shares.reduce((n, s) => n + s.amount, 0);
}

/** "N1,000" from kobo. */
export function nairaFromKobo(kobo: number): string {
  return `₦${Math.floor(kobo / 100).toLocaleString("en-NG")}`;
}

/** Monday 00:00 WAT of the week this moment falls in, as a Date (UTC instant). */
export function weekStartWAT(at: Date): Date {
  const wat = new Date(at.getTime() + 3_600_000);
  const day = (wat.getUTCDay() + 6) % 7; // Monday = 0
  const monday = Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), wat.getUTCDate() - day);
  return new Date(monday - 3_600_000);
}

/** Account numbers are shown as ******1234, never in full. */
export function maskAccount(n: string | null | undefined): string {
  const d = String(n ?? "").replace(/\D/g, "");
  return d.length >= 4 ? `******${d.slice(-4)}` : d;
}
