/**
 * The money maths behind /admin/finance. Pure: no database, no clock of its
 * own (the caller passes `now`), so scripts/finance-test.ts can prove every
 * number with no server.
 *
 * Three rules this file keeps:
 *
 * 1. **Revenue is only what customers paid for.** Subscriptions (from
 *    `payments`) plus "other sales" typed in by hand. A grant, an investment
 *    or a founder's money is CASH, never revenue. Counting them as sales is the
 *    oldest way to make a pitch deck lie.
 * 2. **Costs that happen on their own are counted on their own.** Paystack's
 *    fee on every payment, and the partner's 40% commission, are worked out
 *    from the data, so nobody has to remember to type them in (and nobody may,
 *    or they count twice).
 * 3. **A period still running is compared like for like.** Twelve days of
 *    October against the first twelve days of September, never against all of
 *    September. Otherwise every month looks like it is shrinking until it ends.
 */

import { categoryOf, type ExpenseRow, type Founder, type IncomeRow, type LoanMoveRow } from "./financeConfig";
import { parsePeriod, step, type Period } from "./period";
import { tierForAmount, TIER_AMOUNTS, type Tier } from "./pricing";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Glufloat launched in July 2026. Windows never start before it. */
export const LAUNCH = new Date(2026, 6, 1);

export type FinanceInput = {
  /** Successful, real (not test-account) payments. Kobo. */
  payments: { at: number; amount: number; payer: string }[];
  subs: { status: string; end: number | null; amount: number | null }[];
  commissions: { at: number; amount: number }[];
  payouts: { at: number; amount: number }[];
  expenses: ExpenseRow[];
  income: IncomeRow[];
  loans: LoanMoveRow[];
  now: number;
};

/**
 * Paystack's published fee for a local card, transfer or USSD payment: 1.5%,
 * plus N100 on anything of N2,500 or more, never more than N2,000 a payment.
 * An estimate: the real fee is on each settlement in the Paystack dashboard.
 */
export function paystackFee(kobo: number): number {
  if (kobo <= 0) return 0;
  const fee = kobo * 0.015 + (kobo >= 250_000 ? 10_000 : 0);
  return Math.min(Math.round(fee), 200_000);
}

/** A yyyy-mm-dd date column, as the local midnight it starts at. */
export const dayStart = (iso: string) => new Date(iso + "T00:00:00").getTime();

type Win = { from: number | null; to: number | null };
const inWin = (t: number, w: Win) => (w.from === null || t >= w.from) && (w.to === null || t < w.to);

export type PnL = {
  subscriptionRevenue: number;
  otherRevenue: number;
  revenue: number;
  paystackFees: number;
  commissions: number;
  /** Typed-in expenses that are a cost of serving customers (hosting, dietitians). */
  manualCostOfRevenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operating: number;
  totalExpenses: number;
  net: number;
  /** null when there was no revenue, because a margin on nothing means nothing. */
  grossMargin: number | null;
  netMargin: number | null;
  payments: number;
};

export function pnl(input: FinanceInput, w: Win): PnL {
  const pays = input.payments.filter((p) => inWin(p.at, w));
  const subscriptionRevenue = sum(pays.map((p) => p.amount));
  const paystackFees = sum(pays.map((p) => paystackFee(p.amount)));
  const otherRevenue = sum(
    input.income.filter((i) => i.kind === "other_revenue" && inWin(dayStart(i.received_on), w)).map((i) => i.amount),
  );
  const commissions = sum(input.commissions.filter((c) => inWin(c.at, w)).map((c) => c.amount));
  let manualCostOfRevenue = 0;
  let operating = 0;
  for (const e of input.expenses) {
    if (!inWin(dayStart(e.spent_on), w)) continue;
    if (categoryOf(e.category).kind === "cost_of_revenue") manualCostOfRevenue += e.amount;
    else operating += e.amount;
  }
  const revenue = subscriptionRevenue + otherRevenue;
  const costOfRevenue = paystackFees + commissions + manualCostOfRevenue;
  const grossProfit = revenue - costOfRevenue;
  const totalExpenses = costOfRevenue + operating;
  const net = revenue - totalExpenses;
  return {
    subscriptionRevenue,
    otherRevenue,
    revenue,
    paystackFees,
    commissions,
    manualCostOfRevenue,
    costOfRevenue,
    grossProfit,
    operating,
    totalExpenses,
    net,
    grossMargin: revenue ? grossProfit / revenue : null,
    netMargin: revenue ? net / revenue : null,
    payments: pays.length,
  };
}

/** Growth from `prev` to `cur`. null when there was nothing before to grow from. */
export function growth(cur: number, prev: number): number | null {
  if (!prev) return null;
  return (cur - prev) / Math.abs(prev);
}

// ---- Windows ------------------------------------------------------------------

export type Row = { label: string; from: number; to: number; partial: boolean };

/** Calendar months, quarters or years from launch to now, oldest first. */
export function calendarRows(kind: "month" | "quarter" | "year", now: number): Row[] {
  const rows: Row[] = [];
  const startMonth = kind === "year" ? 0 : kind === "quarter" ? Math.floor(LAUNCH.getMonth() / 3) * 3 : LAUNCH.getMonth();
  const d = new Date(LAUNCH.getFullYear(), startMonth, 1);
  const stepMonths = kind === "month" ? 1 : kind === "quarter" ? 3 : 12;
  while (d.getTime() <= now) {
    const next = new Date(d.getFullYear(), d.getMonth() + stepMonths, 1);
    const label =
      kind === "month"
        ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
        : kind === "quarter"
          ? `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`
          : String(d.getFullYear());
    rows.push({ label, from: d.getTime(), to: next.getTime(), partial: next.getTime() > now });
    d.setMonth(d.getMonth() + stepMonths);
  }
  return rows;
}

export type GrowthRow = Row & { pnl: PnL; revenueGrowth: number | null; netChange: number | null };

/**
 * Each row against the one before it. A row still running is compared with the
 * same number of days of the row before, so a half-finished month is not
 * reported as a fall.
 */
export function growthRows(input: FinanceInput, rows: Row[]): GrowthRow[] {
  return rows.map((r, i) => {
    const cur = pnl(input, r);
    if (i === 0) return { ...r, pnl: cur, revenueGrowth: null, netChange: null };
    const prevRow = rows[i - 1];
    const prevTo = r.partial ? Math.min(prevRow.to, prevRow.from + (input.now - r.from)) : prevRow.to;
    const prev = pnl(input, { from: prevRow.from, to: prevTo });
    return {
      ...r,
      pnl: cur,
      revenueGrowth: growth(cur.revenue, prev.revenue),
      netChange: cur.net - prev.net,
    };
  });
}

/** The same-sized window before, and the same window a year before. */
export function comparisons(period: Period, now: number) {
  if (period.grain === "all" || !period.from || !period.to) return null;
  const prevP = parsePeriod(step(period, -1));
  const yearP =
    period.grain === "day" || period.grain === "week"
      ? parsePeriod({
          grain: period.grain,
          // The year comes from the date itself; 29 February has no twin.
          d: `${Number(period.d.slice(0, 4)) - 1}${period.d.slice(4).replace("-02-29", "-02-28")}`,
        })
      : parsePeriod({ grain: period.grain, y: String(period.y - 1), m: String(period.m), q: String(period.q) });
  const from = period.from.getTime();
  const to = period.to.getTime();
  const partial = to > now && from <= now;
  const elapsed = partial ? now - from : to - from;
  const cut = (p: Period) => ({
    from: p.from!.getTime(),
    to: Math.min(p.to!.getTime(), p.from!.getTime() + elapsed),
  });
  // parsePeriod clamps any year before launch up to the launch year, so a
  // "year ago" from before GluFloat existed would come back as THIS period.
  // There is nothing to compare with then.
  const yearOk = yearP.from!.getTime() < from && yearP.to!.getTime() > LAUNCH.getTime();
  return {
    current: { from, to: partial ? now : to },
    prev: cut(prevP),
    prevLabel: prevP.label,
    yearAgo: yearOk ? cut(yearP) : null,
    yearAgoLabel: yearP.label,
    partial,
    future: from > now,
  };
}

// ---- Subscriptions --------------------------------------------------------------

export const isLiveSub = (s: FinanceInput["subs"][number], now: number) =>
  (s.status === "active" || s.status === "non-renewing") && !!s.end && s.end > now;

/** Lapsed in [from, to) as a share of those still active at `from`. */
export function churnIn(input: FinanceInput, from: number, to: number) {
  const churned = input.subs.filter(
    (s) => s.end !== null && s.end >= from && s.end < to && s.end < input.now && !isLiveSub(s, input.now),
  ).length;
  const activeStart = input.subs.filter((s) => s.end !== null && s.end >= from).length;
  return { churned, activeStart, rate: activeStart ? churned / activeStart : null };
}

/** The first time each payer ever paid. */
function firstPayments(input: FinanceInput): Map<string, number> {
  const first = new Map<string, number>();
  for (const p of input.payments) {
    const cur = first.get(p.payer);
    if (cur === undefined || p.at < cur) first.set(p.payer, p.at);
  }
  return first;
}

// ---- Investor metrics ----------------------------------------------------------------

export type Metrics = ReturnType<typeof investorMetrics>;

export function investorMetrics(input: FinanceInput, w: Win) {
  const now = input.now;
  const live = input.subs.filter((s) => isLiveSub(s, now));
  const mrr = sum(live.map((s) => s.amount || 0));
  const paying = live.length;
  const arpu = paying ? mrr / paying : null;

  const nowD = new Date(now);
  const monthStart = (back: number) => new Date(nowD.getFullYear(), nowD.getMonth() - back, 1).getTime();
  // The last three FULL months: a month still running would drag every average down.
  const trailing = [3, 2, 1].map((b) => ({ from: monthStart(b), to: monthStart(b - 1) }))
    .filter((m) => m.to > LAUNCH.getTime());
  const trailingPnl = trailing.map((m) => pnl(input, m));
  const months = trailingPnl.length;
  const t = trailingPnl.reduce(
    (a, p) => ({
      revenue: a.revenue + p.revenue,
      sub: a.sub + p.subscriptionRevenue,
      gross: a.gross + p.grossProfit,
      expenses: a.expenses + p.totalExpenses,
      auto: a.auto + p.paystackFees + p.commissions,
      manual: a.manual + p.manualCostOfRevenue + p.operating,
      net: a.net + p.net,
    }),
    { revenue: 0, sub: 0, gross: 0, expenses: 0, auto: 0, manual: 0, net: 0 },
  );
  const grossMargin = t.revenue ? t.gross / t.revenue : null;
  const grossBurn = months ? t.expenses / months : 0;
  const netBurn = months ? Math.max(0, -t.net / months) : 0;

  const lastMonth = trailing[trailing.length - 1];
  const churn = lastMonth ? churnIn(input, lastMonth.from, lastMonth.to) : { churned: 0, activeStart: 0, rate: null };
  // A customer is only worth something over their life if each month leaves money
  // after serving them. On a negative margin the number means nothing, so: a dash.
  const ltv = arpu !== null && grossMargin !== null && grossMargin > 0 && churn.rate ? (arpu * grossMargin) / churn.rate : null;

  // Cost of winning a customer, in the period on screen.
  const first = firstPayments(input);
  const newPayers = [...first.values()].filter((at) => inWin(at, w)).length;
  const acquisitionSpend = sum(
    input.expenses
      .filter((e) => categoryOf(e.category).acquisition && inWin(dayStart(e.spent_on), w))
      .map((e) => e.amount),
  );
  const cac = newPayers ? acquisitionSpend / newPayers : null;
  const ltvToCac = ltv !== null && cac ? ltv / cac : null;
  const payback = cac !== null && arpu && grossMargin && grossMargin > 0 ? cac / (arpu * grossMargin) : null;

  // Break-even: the typed-in monthly costs, over what one customer leaves after
  // Paystack and the partner take their share. With nobody paying yet it uses
  // the Basic price, and says so.
  const priceUsed = arpu ?? TIER_AMOUNTS.basic;
  const variableShare = t.sub ? t.auto / t.sub : paystackFee(TIER_AMOUNTS.basic) / TIER_AMOUNTS.basic;
  const contribution = priceUsed * (1 - variableShare);
  const fixedMonthly = months ? t.manual / months : 0;
  const breakEven = contribution > 0 ? Math.ceil(fixedMonthly / contribution) : null;

  // Compound monthly growth of revenue over the last six full months.
  const six = [6, 5, 4, 3, 2, 1]
    .map((b) => ({ from: monthStart(b), to: monthStart(b - 1) }))
    .filter((m) => m.from >= new Date(LAUNCH.getFullYear(), LAUNCH.getMonth(), 1).getTime())
    .map((m) => pnl(input, m).revenue);
  const firstNonZero = six.findIndex((r) => r > 0);
  const cmgr =
    firstNonZero >= 0 && six.length - 1 - firstNonZero >= 1 && six[six.length - 1] > 0
      ? Math.pow(six[six.length - 1] / six[firstNonZero], 1 / (six.length - 1 - firstNonZero)) - 1
      : null;

  const cash = cashEstimate(input);
  const runway = netBurn > 0 && cash > 0 ? cash / netBurn : null;

  const raised = sum(input.income.filter((i) => i.kind !== "other_revenue").map((i) => i.amount));
  const founders = founderBalances(input);

  return {
    mrr,
    arr: mrr * 12,
    paying,
    arpu,
    everPaid: first.size,
    newPayers,
    churnRate: churn.rate,
    churnMonth: lastMonth ? new Date(lastMonth.from).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : null,
    grossMargin,
    ltv,
    cac,
    acquisitionSpend,
    ltvToCac,
    payback,
    grossBurn,
    netBurn,
    trailingMonths: months,
    cash,
    runway,
    breakEven,
    breakEvenAtBasic: arpu === null,
    fixedMonthly,
    cmgr,
    raised,
    founderOwed: founders.reduce((n, f) => n + f.owed, 0),
  };
}

/**
 * Money in the GluFloat account, worked out from the records: everything paid
 * in, less everything the company itself paid out. Spending a founder did from
 * their own pocket never left the company account, so it is not taken off here
 * (it is a loan instead). It is only as right as what has been typed in.
 */
export function cashEstimate(input: FinanceInput): number {
  const inflow =
    sum(input.payments.map((p) => p.amount - paystackFee(p.amount))) +
    sum(input.income.map((i) => i.amount)) +
    sum(input.loans.filter((l) => l.kind === "cash_in").map((l) => l.amount));
  const outflow =
    sum(input.expenses.filter((e) => e.paid_by === "company").map((e) => e.amount)) +
    sum(input.payouts.map((p) => p.amount)) +
    sum(input.loans.filter((l) => l.kind === "repaid").map((l) => l.amount));
  return inflow - outflow;
}

// ---- Founder loans ------------------------------------------------------------------

export function founderBalances(input: FinanceInput, w: Win = { from: null, to: null }) {
  return (["omole", "favour"] as Founder[]).map((f) => {
    const spent = sum(
      input.expenses.filter((e) => e.paid_by === f && inWin(dayStart(e.spent_on), w)).map((e) => e.amount),
    );
    const moves = input.loans.filter((l) => l.founder === f && inWin(dayStart(l.happened_on), w));
    const cashIn = sum(moves.filter((l) => l.kind === "cash_in").map((l) => l.amount));
    const repaid = sum(moves.filter((l) => l.kind === "repaid").map((l) => l.amount));
    return { founder: f, spent, cashIn, repaid, lent: spent + cashIn, owed: spent + cashIn - repaid };
  });
}

// ---- Breakdowns ------------------------------------------------------------------------

export function revenueByPlan(input: FinanceInput, w: Win): { tier: Tier; amount: number; count: number }[] {
  const out = new Map<Tier, { amount: number; count: number }>();
  for (const p of input.payments) {
    if (!inWin(p.at, w)) continue;
    const t = tierForAmount(p.amount);
    const cur = out.get(t) ?? { amount: 0, count: 0 };
    out.set(t, { amount: cur.amount + p.amount, count: cur.count + 1 });
  }
  return (["basic", "plus", "dietitian"] as Tier[]).map((tier) => ({ tier, ...(out.get(tier) ?? { amount: 0, count: 0 }) }));
}

export function expensesByCategory(input: FinanceInput, w: Win) {
  const out = new Map<string, number>();
  for (const e of input.expenses) {
    if (!inWin(dayStart(e.spent_on), w)) continue;
    const label = categoryOf(e.category).label;
    out.set(label, (out.get(label) ?? 0) + e.amount);
  }
  return [...out].map(([label, amount]) => ({ label, amount }));
}

export function sum(ns: number[]): number {
  return ns.reduce((n, x) => n + x, 0);
}

/** "12%", "-4%", or a dash when there is nothing to compare with. */
export function pctLabel(x: number | null, digits = 0): string {
  if (x === null || !Number.isFinite(x)) return "—";
  const v = (x * 100).toFixed(digits);
  return `${x > 0 ? "+" : ""}${v}%`;
}

/** A share, never signed: "64%". */
export function shareLabel(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}
