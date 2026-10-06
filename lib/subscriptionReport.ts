import { inPeriod, type Period } from "@/lib/period";
import { GROUPS, inGroup, type Group } from "@/lib/userType";

/**
 * Subscriptions, split by who the person is and month by month. Moved here
 * unchanged from app/admin/page.tsx so the dashboard's PDF and the finance
 * screen read exactly the same numbers. Callers pass rows with our own test
 * accounts already removed.
 */

export type ReportProfile = {
  id: string;
  email: string;
  name: string | null;
  trial_start: string | null;
  created_at: string;
  user_type: string | null;
};
export type ReportSub = { user_id: string; status: string; current_period_end: string | null; amount: number | null };
export type ReportPayment = { user_id: string | null; email: string | null; amount: number; status: string; paid_at: string };

export function subscriptionReport({
  P,
  S,
  Y,
  period,
  now,
  launch,
}: {
  P: ReportProfile[];
  S: ReportSub[];
  /** Successful payments only. */
  Y: ReportPayment[];
  period: Period;
  now: number;
  launch: Date;
}) {
  const profById = new Map(P.map((p) => [p.id, p]));
  const profByEmail = new Map(P.map((p) => [p.email.toLowerCase(), p]));

  const isLive = (s: ReportSub) =>
    (s.status === "active" || s.status === "non-renewing") &&
    !!s.current_period_end &&
    new Date(s.current_period_end).getTime() > now;

  const payerType = (p: ReportPayment) =>
    (p.user_id ? profById.get(p.user_id) : undefined)?.user_type ??
    (p.email ? profByEmail.get(p.email.toLowerCase()) : undefined)?.user_type ??
    null;
  const subType = (s: ReportSub) => profById.get(s.user_id)?.user_type ?? null;

  function metricsFor(g: Group) {
    const people = P.filter((p) => inGroup(p.user_type, g));
    const theirSubs = S.filter((s) => inGroup(subType(s), g));
    const theirPay = Y.filter((p) => inGroup(payerType(p), g));
    const trialsStarted = people.filter((p) => p.trial_start).length;
    const live = theirSubs.filter(isLive);
    const everSubscribed = theirSubs.length;
    return {
      group: g,
      signups: people.length,
      signupsInRange: people.filter((p) => inPeriod(p.created_at, period)).length,
      trialsStarted,
      activeSubs: live.length,
      everSubscribed,
      churnedNow: everSubscribed - live.length,
      conversion: trialsStarted ? Math.round((everSubscribed / trialsStarted) * 100) : 0,
      churnRate: everSubscribed
        ? Math.round(((everSubscribed - live.length) / everSubscribed) * 100)
        : 0,
      revenue: theirPay.reduce((n, p) => n + (p.amount || 0), 0),
      revenueInRange: theirPay
        .filter((p) => inPeriod(p.paid_at, period))
        .reduce((n, p) => n + (p.amount || 0), 0),
      // What the live subscriptions are worth a month, at the price each one
      // actually pays (Basic, Plus or Dietitian), not one flat price.
      monthly: live.reduce((n, s) => n + (s.amount || 0), 0),
    };
  }
  const byType = GROUPS.map(metricsFor);

  // ---- Month on month, for the year of the period on screen ----------------
  const year = period.y;
  const nowD = new Date(now);
  const firstPaid = new Map<string, number>();
  for (const p of Y) {
    if (!p.email || !p.paid_at) continue;
    const t = new Date(p.paid_at).getTime();
    const cur = firstPaid.get(p.email);
    if (cur === undefined || t < cur) firstPaid.set(p.email, t);
  }
  const curMonthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1).getTime();
  const monthly: {
    month: string;
    newSubs: number;
    churned: number;
    activeEnd: number;
    churnRate: number;
    retention: number;
  }[] = [];
  for (let m = 0; m < 12; m++) {
    const mStart = new Date(year, m, 1).getTime();
    const mEnd = new Date(year, m + 1, 1).getTime();
    if (mStart < launch.getTime() || mStart > curMonthStart) continue;
    const churned = S.filter((s) => {
      if (!s.current_period_end) return false;
      const end = new Date(s.current_period_end).getTime();
      return end >= mStart && end < mEnd && end < now && !isLive(s);
    }).length;
    const activeStart = S.filter(
      (s) => s.current_period_end && new Date(s.current_period_end).getTime() >= mStart,
    ).length;
    const churnRate = activeStart ? Math.round((churned / activeStart) * 100) : 0;
    monthly.push({
      month: new Date(mStart).toLocaleDateString("en", { month: "short", year: "numeric" }),
      newSubs: [...firstPaid.values()].filter((t) => t >= mStart && t < mEnd).length,
      churned,
      activeEnd: S.filter(
        (s) => s.current_period_end && new Date(s.current_period_end).getTime() >= mEnd,
      ).length,
      churnRate,
      retention: activeStart ? 100 - churnRate : 0,
    });
  }

  const churnedList = S.filter(
    (s) => s.current_period_end && new Date(s.current_period_end).getTime() < now && !isLive(s),
  )
    .map((s) => ({
      email: profById.get(s.user_id)?.email ?? "—",
      name: profById.get(s.user_id)?.name ?? "—",
      ended: s.current_period_end as string,
    }))
    .sort((a, b) => new Date(b.ended).getTime() - new Date(a.ended).getTime());

  return { byType, all: byType[0], monthly, churnedList, year };
}
