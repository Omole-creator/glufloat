/**
 * Care fees: what a doctor, a field agent and an advisor earn from a patient's
 * payment. Pure (no I/O), so `npx tsx scripts/care-fees-test.ts` proves every
 * rule. The server side is lib/careFeesServer.ts.
 *
 * Founder's decisions (advisor's model, 2026-10-16, revised the same day):
 *  - Doctor: N1,000 for each patient they mark as reviewed, once a calendar
 *    month (WAT), only while that patient has a paid GluFloat plan. Credited
 *    the moment they press "Mark as reviewed" (founder, 2026-10-20). This
 *    replaced 22.23% of every payment, which doctors read as a referral fee.
 *    A payment itself no longer earns the doctor anything.
 *  - Agent 11.12% and their advisor 10%, only for the patient's first 12
 *    months. An agent with no advisor still gets 11.12%; the 10% stays with
 *    GluFloat.
 *  - A doctor the advisor brought HIMSELF: the advisor gets 15% for the
 *    patient's first 12 months, and nobody else but the doctor.
 *  - A doctor who invites a colleague gets N3,000 once, when the colleague's
 *    first patient pays. Agents earn nothing from a colleague's referral.
 *  - Paid weekly, no minimum.
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
/** N3,000 to a doctor when a colleague they invited gets their first paying patient. */
export const COLLEAGUE_BONUS_KOBO = 300_000;

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

/** What GluFloat keeps, before Paystack's fee. */
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
