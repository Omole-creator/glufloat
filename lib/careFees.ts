/**
 * Care fees: what a doctor, a field agent and an advisor earn from a patient's
 * payment. Pure (no I/O), so `npx tsx scripts/care-fees-test.ts` proves every
 * rule. The server side is lib/careFeesServer.ts.
 *
 * Founder's decisions (advisor's model, 2026-10-16):
 *  - Doctor 22.23% of every payment by a patient they look after, for as long
 *    as the patient stays with them and keeps paying.
 *  - 30% instead when no field agent brought the doctor (they found GluFloat
 *    themselves, or a colleague invited them).
 *  - Agent 11.12% and advisor 10%, only for the patient's first 12 months.
 *    The advisor is the agent's manager; an agent with none has no advisor share.
 *  - A doctor who invites a colleague gets N3,000 once, when the colleague's
 *    first patient pays. Agents earn nothing from a colleague's referral.
 *  - Paid weekly, no minimum.
 *
 * Everything is in kobo. Shares are rounded DOWN, so the parts can never add
 * up to more than the payment.
 */

export const DOCTOR_RATE_WITH_AGENT = 0.2223;
export const DOCTOR_RATE_DIRECT = 0.3;
export const AGENT_RATE = 0.1112;
export const ADVISOR_RATE = 0.1;
/** Agent and advisor shares stop this long after the patient's first payment. */
export const AGENT_WINDOW_DAYS = 365;
/** N3,000 to a doctor when a colleague they invited gets their first paying patient. */
export const COLLEAGUE_BONUS_KOBO = 300_000;

const DAY_MS = 86_400_000;

export type EarningKind = "care" | "agent" | "advisor" | "colleague";

export type Share = { kind: Exclude<EarningKind, "colleague">; rate: number; amount: number };

/**
 * How one payment is shared.
 *  - `hasAgent`: a field agent brought this doctor. This sets the doctor's
 *    rate for good, even if the agent is later switched off.
 *  - `agentActive`: the agent is still active, so they are paid (default true).
 *  - `hasAdvisor`: that agent has an active advisor.
 *  - `firstPaidAt`: when this patient first paid while with this doctor
 *    (null = this is the first payment).
 */
export function splitPayment(opts: {
  amountKobo: number;
  hasAgent: boolean;
  agentActive?: boolean;
  hasAdvisor: boolean;
  paidAt: Date;
  firstPaidAt: Date | null;
}): Share[] {
  const amount = Math.max(0, Math.floor(opts.amountKobo));
  if (amount <= 0) return [];
  const doctorRate = opts.hasAgent ? DOCTOR_RATE_WITH_AGENT : DOCTOR_RATE_DIRECT;
  const out: Share[] = [{ kind: "care", rate: doctorRate, amount: Math.floor(amount * doctorRate) }];
  if (opts.hasAgent && opts.agentActive !== false && agentWindowOpen(opts.firstPaidAt, opts.paidAt)) {
    out.push({ kind: "agent", rate: AGENT_RATE, amount: Math.floor(amount * AGENT_RATE) });
    if (opts.hasAdvisor) out.push({ kind: "advisor", rate: ADVISOR_RATE, amount: Math.floor(amount * ADVISOR_RATE) });
  }
  return out.filter((s) => s.amount > 0);
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
