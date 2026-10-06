/**
 * The money maths behind /admin/finance (lib/finance.ts). No server needed.
 *   npx tsx scripts/finance-test.ts
 * Run after ANY edit to lib/finance.ts.
 */
import {
  cashEstimate,
  calendarRows,
  comparisons,
  founderBalances,
  growth,
  growthRows,
  investorMetrics,
  paystackFee,
  pnl,
  type FinanceInput,
} from "../lib/finance";
import { parsePeriod } from "../lib/period";
import type { ExpenseRow } from "../lib/financeConfig";

let fails = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`);
  if (!ok) fails++;
}
const t = (s: string) => new Date(s).getTime();
const N = (naira: number) => naira * 100;

// ---- Paystack fee ------------------------------------------------------------
check("fee on N1,500 is 1.5% with no N100", paystackFee(N(1500)) === N(22.5), String(paystackFee(N(1500))));
check("fee on N2,500 adds the N100", paystackFee(N(2500)) === N(137.5), String(paystackFee(N(2500))));
check("fee on N4,500", paystackFee(N(4500)) === N(167.5), String(paystackFee(N(4500))));
check("fee capped at N2,000", paystackFee(N(1_000_000)) === N(2000));
check("no fee on nothing", paystackFee(0) === 0);

// ---- A small, known business ---------------------------------------------------
const exp = (spent_on: string, amount: number, category: string, paid_by: ExpenseRow["paid_by"] = "company"): ExpenseRow => ({
  id: spent_on + category + amount,
  spent_on,
  amount: N(amount),
  category,
  description: "test",
  vendor: null,
  paid_by,
});
const input: FinanceInput = {
  now: t("2026-10-15T12:00:00"),
  payments: [
    { at: t("2026-08-10T10:00:00"), amount: N(1500), payer: "a" },
    { at: t("2026-09-05T10:00:00"), amount: N(1500), payer: "a" },
    { at: t("2026-09-06T10:00:00"), amount: N(4500), payer: "b" },
    { at: t("2026-10-03T10:00:00"), amount: N(2500), payer: "c" },
  ],
  subs: [
    { status: "active", end: t("2026-11-02T00:00:00"), amount: N(2500) },
    { status: "active", end: t("2026-11-05T00:00:00"), amount: N(1500) },
    { status: "expired", end: t("2026-09-20T00:00:00"), amount: N(4500) },
  ],
  commissions: [{ at: t("2026-09-06T10:00:00"), amount: N(1800) }],
  payouts: [{ at: t("2026-09-30T10:00:00"), amount: N(1800) }],
  expenses: [
    exp("2026-09-01", 20000, "hosting"),
    exp("2026-09-10", 5000, "marketing", "omole"),
    exp("2026-10-02", 3000, "software", "favour"),
    exp("2026-10-04", 2000, "marketing"),
  ],
  income: [
    { id: "g", received_on: "2026-09-15", amount: N(500000), kind: "grant", source: "Grant", note: null },
    { id: "s", received_on: "2026-09-20", amount: N(10000), kind: "other_revenue", source: "Talk", note: null },
  ],
  loans: [
    { id: "c", founder: "omole", kind: "cash_in", happened_on: "2026-08-01", amount: N(100000), note: null },
    { id: "r", founder: "omole", kind: "repaid", happened_on: "2026-10-01", amount: N(20000), note: null },
  ],
};

const sep = pnl(input, { from: t("2026-09-01T00:00:00"), to: t("2026-10-01T00:00:00") });
check("September revenue = subs + other sales, never the grant", sep.revenue === N(1500 + 4500 + 10000), String(sep.revenue));
check("September Paystack fees", sep.paystackFees === N(22.5 + 167.5), String(sep.paystackFees));
check("September commissions counted", sep.commissions === N(1800));
check("hosting is a cost of serving", sep.manualCostOfRevenue === N(20000));
check("marketing is a running cost", sep.operating === N(5000));
check(
  "net = revenue - every cost",
  sep.net === sep.revenue - sep.paystackFees - sep.commissions - N(20000) - N(5000),
  String(sep.net),
);
check("gross margin uses gross profit", Math.abs((sep.grossMargin ?? 0) - sep.grossProfit / sep.revenue) < 1e-9);
check("a margin on no revenue is null", pnl(input, { from: t("2026-07-01T00:00:00"), to: t("2026-07-02T00:00:00") }).netMargin === null);

// ---- Growth -------------------------------------------------------------------------
check("growth from nothing is null, not infinity", growth(100, 0) === null);
check("growth +50%", growth(150, 100) === 0.5);
const months = growthRows(input, calendarRows("month", input.now));
check("months start at launch (July 2026)", months[0].label === "Jul 2026", months[0].label);
check("current month is marked so far", months.at(-1)!.partial === true);
check("past months are not partial", months.slice(0, -1).every((r) => !r.partial));
const sepRow = months.find((r) => r.from === t("2026-09-01T00:00:00"))!;
const augRev = N(1500);
check("September growth vs August", sepRow.revenueGrowth === growth(sep.revenue, augRev), String(sepRow.revenueGrowth));
// October is 15 days in: it must be compared with Sept 1-15 only.
const octRow = months.at(-1)!;
const sepFirstHalf = pnl(input, { from: t("2026-09-01T00:00:00"), to: t("2026-09-01T00:00:00") + (input.now - t("2026-10-01T00:00:00")) });
check("a running month is compared like for like", octRow.revenueGrowth === growth(octRow.pnl.revenue, sepFirstHalf.revenue), `${octRow.revenueGrowth}`);
const quarters = calendarRows("quarter", input.now);
check("quarters start at Q3 2026", quarters[0].label === "Q3 2026" && quarters.at(-1)!.label === "Q4 2026");

const cmpOct = comparisons(parsePeriod({ grain: "month", y: "2026", m: "10" }), input.now)!;
check("month comparison: previous is September", cmpOct.prevLabel === "September 2026");
check("no year-ago comparison before launch", cmpOct.yearAgo === null);
const cmpOct27 = comparisons(parsePeriod({ grain: "month", y: "2027", m: "10" }), t("2027-12-01T00:00:00"))!;
check("year ago of October 2027 is October 2026", cmpOct27.yearAgoLabel === "October 2026" && cmpOct27.yearAgo !== null);
check("running month cut to same days", cmpOct.prev.to - cmpOct.prev.from === input.now - t("2026-10-01T00:00:00"));
const cmpDay = comparisons(parsePeriod({ grain: "day", d: "2028-02-29" }), t("2028-03-10T00:00:00"))!;
check("29 Feb compares with 28 Feb a year before", cmpDay.yearAgoLabel.startsWith("28 Feb 2027"), cmpDay.yearAgoLabel);
check("all time has no comparison", comparisons(parsePeriod({ grain: "all" }), input.now) === null);

// ---- Founders and cash ------------------------------------------------------------------
const [omole, favour] = founderBalances(input);
check("Omole: bill + cash - repaid", omole.owed === N(5000 + 100000 - 20000), String(omole.owed));
check("Favour: bill only", favour.owed === N(3000));
const cash = cashEstimate(input);
const expectCash =
  N(1500 + 1500 + 4500 + 2500) - N(22.5 + 22.5 + 167.5 + 137.5) + N(500000 + 10000) + N(100000) - N(20000 + 2000) - N(1800) - N(20000);
check("cash ignores founder-paid bills, counts payouts not earned commissions", cash === expectCash, `${cash} vs ${expectCash}`);

// ---- Investor metrics ------------------------------------------------------------------
const m = investorMetrics(input, { from: t("2026-09-01T00:00:00"), to: t("2026-10-01T00:00:00") });
check("MRR = live subs only", m.mrr === N(4000), String(m.mrr));
check("ARR = MRR x 12", m.arr === m.mrr * 12);
check("paying = 2", m.paying === 2);
check("ARPU", m.arpu === N(2000));
check("ever paid = 3 payers", m.everPaid === 3);
check("new payers in September = 1 (b)", m.newPayers === 1, String(m.newPayers));
check("CAC = marketing / new payers", m.cac === N(5000), String(m.cac));
check("raised counts grants, not sales", m.raised === N(500000));
check("owed to founders", m.founderOwed === N(85000 + 3000));
check("break-even is a whole number of customers", m.breakEven === null || Number.isInteger(m.breakEven));

console.log(fails ? `\n${fails} FAILED` : "\nAll finance checks pass.");
process.exit(fails ? 1 : 0);
