import { COMMISSION_CAP, COMMISSION_RATE, naira } from "./partners";

export interface PartnerReportData {
  partner: { name: string; profession: string; code: string };
  period: { label: string; grain: string };
  clicks: number;
  signups: number;
  trials: number;
  earned: number;
  activeSubs: number;
  pending: number;
  paidOut: number;
  lifetimeClicks: number;
  lifetimePeople: number;
  lifetimeEarned: number;
}

/**
 * The subject and body of the email an admin sends a partner, by hand, once a
 * month. There is no automated send and no email service wired into this
 * app — the button just opens the admin's own mail client
 * (`mailto:`) with this pre-filled, so it costs nothing to build and needs no
 * new credentials. Same house rule as the PDF and the partner dashboard:
 * counts and money only, never a referred person's name or any detail of
 * them (see the "partner PDF must never carry patient data" rule).
 */
export function partnerReportEmail(d: PartnerReportData): { subject: string; body: string } {
  const subject = `Your Glufloat partner report, ${d.period.label}`;

  const body = [
    `Hi ${d.partner.name},`,
    `Here is your Glufloat partner report for ${d.period.label}.`,
    [
      `Your numbers this period:`,
      `- People who clicked your link: ${d.clicks}`,
      `- People who made an account: ${d.signups}`,
      `- People who started the free trial: ${d.trials}`,
      `- People of yours paying right now: ${d.activeSubs}`,
    ].join("\n"),
    [
      `The money:`,
      `- Earned this period: ${naira(d.earned)}`,
      `- Owed to you now: ${naira(d.pending)}`,
      `- Paid to you so far, all time: ${naira(d.paidOut)}`,
    ].join("\n"),
    [
      `Since you joined:`,
      `- People who clicked your link: ${d.lifetimeClicks}`,
      `- People you have brought: ${d.lifetimePeople}`,
      `- Total you have earned: ${naira(d.lifetimeEarned)}`,
    ].join("\n"),
    `You earn ${Math.round(COMMISSION_RATE * 100)}% of every payment a person you brought makes, for up to ${COMMISSION_CAP} payments each. Glufloat costs N1,500 a month, so that is N600 to you each time one of them pays.`,
    `This report shows counts and money only. We never share the name, email or any detail of the people you refer.`,
    `Thank you for partnering with us.`,
    `Glufloat`,
  ].join("\n\n");

  return { subject, body };
}
