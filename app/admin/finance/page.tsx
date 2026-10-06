import { TrendingUp, TrendingDown, Wallet, Percent, Repeat } from "lucide-react";
import { isAdmin } from "@/lib/recordings";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/adminFetch";
import { isInternalEmail } from "@/lib/internalAccounts";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminCard from "../AdminCard";
import AdminSection, { AdminJump } from "../AdminSection";
import BarList from "../BarList";
import PeriodPicker from "@/components/PeriodPicker";
import FinanceStat from "./FinanceStat";
import MoneyBars from "./MoneyBars";
import GrowthTables, { type GrowthLine } from "./GrowthTables";
import FinanceExport, { type FinanceExportData } from "./FinanceExport";
import LedgerForm from "./LedgerForm";
import LedgerList from "./LedgerList";
import SetupNotice from "./SetupNotice";
import { parsePeriod, periodBuckets, type PeriodParams } from "@/lib/period";
import {
  calendarRows,
  comparisons,
  expensesByCategory,
  founderBalances,
  growth,
  growthRows,
  investorMetrics,
  LAUNCH,
  pnl,
  revenueByPlan,
  shareLabel,
  dayStart,
  type PnL,
} from "@/lib/finance";
import { loadFinance } from "@/lib/financeData";
import { FOUNDERS, naira, nairaShort, nairaWhole as whole } from "@/lib/financeConfig";
import { TIER_LABEL } from "@/lib/pricing";
import { groupLabel } from "@/lib/userType";
import { subscriptionReport } from "@/lib/subscriptionReport";

export const dynamic = "force-dynamic";

/** cur against prev: null means "new" (nothing before), 0 means no change. */
const delta = (cur: number, prev: number) => (cur && !prev ? null : (growth(cur, prev) ?? 0));

export default async function FinancePage({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  if (!(await isAdmin())) return <AdminLogin />;

  const sp = await searchParams;
  const period = parsePeriod(sp);
  const { input, ready } = await loadFinance();
  const now = input.now;
  const win = { from: period.from?.getTime() ?? null, to: period.to?.getTime() ?? null };

  const cur = pnl(input, win);
  const cmp = comparisons(period, now);
  const prev = cmp ? pnl(input, cmp.prev) : null;
  const curLike = cmp ? pnl(input, cmp.current) : cur; // like for like, if the period is still running
  const yearAgo = cmp?.yearAgo ? pnl(input, cmp.yearAgo) : null;
  const vsLabel = cmp ? `vs ${cmp.partial ? "same days of " : ""}${cmp.prevLabel}` : undefined;

  const m = investorMetrics(input, win);
  const founders = founderBalances(input);

  // ---- Chart and the table under it -----------------------------------------
  const buckets = periodBuckets(period, LAUNCH);
  const bucketPnl = buckets.map((b) => ({ label: b.label, p: pnl(input, { from: b.start, to: b.end }) }));

  // ---- Growth --------------------------------------------------------------------
  const toLines = (kind: "month" | "quarter" | "year"): GrowthLine[] =>
    growthRows(input, calendarRows(kind, now)).map((r) => ({
      label: r.label,
      partial: r.partial,
      revenue: r.pnl.revenue,
      expenses: r.pnl.totalExpenses,
      net: r.pnl.net,
      grossMargin: r.pnl.grossMargin,
      netMargin: r.pnl.netMargin,
      growth: r.revenueGrowth,
    }));
  const growthData = { month: toLines("month"), quarter: toLines("quarter"), year: toLines("year") };
  const lastFull = (rows: GrowthLine[]) => rows.filter((r) => !r.partial).at(-1);
  const mom = lastFull(growthData.month);
  const qoq = lastFull(growthData.quarter);
  const yoy = lastFull(growthData.year);

  // ---- Subscriptions (moved here from the dashboard) ------------------------------
  const admin = createAdminClient();
  const [{ rows: profilesRaw }, { rows: subsRaw }, { rows: paysRaw }] = await Promise.all([
    fetchAll<{ id: string; email: string; name: string | null; trial_start: string | null; created_at: string; user_type: string | null }>(
      () => admin.from("profiles").select("id,email,name,trial_start,created_at,user_type"),
    ),
    fetchAll<{ user_id: string; status: string; current_period_end: string | null; amount: number | null }>(() =>
      admin.from("subscriptions").select("user_id,status,current_period_end,amount"),
    ),
    fetchAll<{ user_id: string | null; email: string | null; amount: number; status: string; paid_at: string }>(() =>
      admin.from("payments").select("user_id,email,amount,status,paid_at"),
    ),
  ]);
  const internal = new Set(profilesRaw.filter((p) => isInternalEmail(p.email)).map((p) => p.id));
  const real = (uid: string | null | undefined) => !uid || !internal.has(uid);
  const subs = subscriptionReport({
    P: profilesRaw.filter((p) => !internal.has(p.id)),
    S: subsRaw.filter((s) => real(s.user_id)),
    Y: paysRaw.filter((p) => p.status === "success" && real(p.user_id) && !isInternalEmail(p.email)),
    period,
    now,
    launch: LAUNCH,
  });

  // ---- Other money in, for this period -------------------------------------------
  const incomeRows = input.income.filter((i) => {
    const t = dayStart(i.received_on);
    return (win.from === null || t >= win.from) && (win.to === null || t < win.to);
  });

  // ---- The statement, in the order an accountant reads it ----------------------------
  type Line = { label: string; key: keyof PnL; sign?: -1; strong?: boolean; indent?: boolean; margin?: "grossMargin" | "netMargin" };
  const statement: Line[] = [
    { label: "Subscriptions", key: "subscriptionRevenue", indent: true },
    { label: "Other sales", key: "otherRevenue", indent: true },
    { label: "Revenue", key: "revenue", strong: true },
    { label: "Paystack fees (estimated)", key: "paystackFees", sign: -1, indent: true },
    { label: "Partner commissions", key: "commissions", sign: -1, indent: true },
    { label: "Hosting, dietitians, bank charges", key: "manualCostOfRevenue", sign: -1, indent: true },
    { label: "Gross profit", key: "grossProfit", strong: true, margin: "grossMargin" },
    { label: "Running costs", key: "operating", sign: -1, indent: true },
    { label: "Net profit or loss", key: "net", strong: true, margin: "netMargin" },
  ];
  const val = (p: PnL, l: Line) => naira((l.sign ?? 1) * (p[l.key] as number));

  const periodQuery = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"),
  ).toString();

  const exportData: FinanceExportData = {
    period: period.label,
    compareLabel: cmp ? cmp.prevLabel : null,
    statement: statement.map((l) => ({
      label: l.label,
      value: val(cur, l),
      prev: prev ? val(prev, l) : undefined,
      strong: l.strong,
    })),
    metrics: [
      {
        group: "Recurring revenue (today)",
        rows: [
          { label: "Monthly recurring revenue (MRR)", value: naira(m.mrr) },
          { label: "Yearly run rate (ARR)", value: naira(m.arr) },
          { label: "Paying customers", value: String(m.paying) },
          { label: "Average revenue per customer", value: m.arpu === null ? "—" : naira(Math.round(m.arpu)) },
          { label: "Customers who have ever paid", value: String(m.everPaid) },
          { label: "Average monthly growth, last 6 months", value: shareLabel(m.cmgr) },
        ],
      },
      {
        group: "Unit economics",
        rows: [
          { label: "Gross margin, last 3 full months", value: shareLabel(m.grossMargin) },
          { label: `Customers lost in ${m.churnMonth ?? "the last full month"}`, value: shareLabel(m.churnRate) },
          { label: "Lifetime value per customer", value: m.ltv === null ? "—" : naira(Math.round(m.ltv)) },
          { label: `Cost to win a customer (${period.label})`, value: m.cac === null ? "—" : naira(Math.round(m.cac)) },
          { label: "Lifetime value : cost to win", value: m.ltvToCac === null ? "—" : `${m.ltvToCac.toFixed(1)} : 1` },
        ],
      },
      {
        group: "Cash and runway",
        rows: [
          { label: "Monthly spend, last 3 full months", value: naira(Math.round(m.grossBurn)) },
          { label: "Monthly loss (net burn)", value: naira(Math.round(m.netBurn)) },
          { label: "Cash, worked out from the records", value: naira(m.cash) },
          { label: "Runway", value: m.runway === null ? "—" : `${m.runway.toFixed(1)} months` },
          { label: "Paying customers needed to break even", value: m.breakEven === null ? "—" : String(m.breakEven) },
          { label: "Grants and investment received", value: naira(m.raised) },
          { label: "Owed to founders", value: naira(m.founderOwed) },
        ],
      },
    ],
    months: [...growthData.month].reverse().map((r) => ({
      label: r.label + (r.partial ? " (so far)" : ""),
      revenue: naira(r.revenue),
      growth: r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${Math.round(r.growth * 100)}%`,
      expenses: naira(r.expenses),
      net: naira(r.net),
      margin: shareLabel(r.netMargin),
    })),
    founders: founders.map((f) => {
      const who = FOUNDERS.find((x) => x.key === f.founder)!;
      return { name: `${who.name} (${who.role})`, lent: naira(f.lent), repaid: naira(f.repaid), owed: naira(f.owed) };
    }),
    categories: expensesByCategory(input, win)
      .sort((a, b) => b.amount - a.amount)
      .map((c) => ({ label: c.label, value: naira(c.amount) })),
  };

  const th = "px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50 whitespace-nowrap";
  const td = "px-5 py-3 text-ink-soft tabular-nums";

  return (
    <AdminShell
      title="Finance"
      subtitle={`${period.label}. Test and demo accounts are left out.`}
      actions={<FinanceExport data={exportData} csvHref={`/api/admin/finance/export?${periodQuery}`} />}
    >
      <PeriodPicker period={period} basePath="/admin/finance" />
      {!ready && <SetupNotice />}

      <AdminJump
        items={[
          { id: "pnl", label: "Profit and loss" },
          { id: "growth", label: "Growth" },
          { id: "investors", label: "For investors" },
          { id: "revenue", label: "Revenue" },
          { id: "subscriptions", label: "Subscriptions" },
          { id: "other-income", label: "Grants and investment" },
        ]}
      />

      {/* The five numbers everyone asks first. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <FinanceStat
          emphasis
          className="col-span-2 lg:col-span-1"
          icon={cur.net >= 0 ? TrendingUp : TrendingDown}
          label={cur.net >= 0 ? "Net profit" : "Net loss"}
          value={whole(cur.net)}
          sub={
            prev
              ? `${curLike.net >= prev.net ? "Better" : "Worse"} than ${cmp!.prevLabel} by ${whole(Math.abs(curLike.net - prev.net))}`
              : `${shareLabel(cur.netMargin)} net margin`
          }
        />
        <FinanceStat
          icon={TrendingUp}
          tone="blue"
          label="Revenue"
          value={whole(cur.revenue)}
          change={prev ? delta(curLike.revenue, prev.revenue) : undefined}
          changeLabel={vsLabel}
        />
        <FinanceStat
          icon={Wallet}
          tone="amber"
          label="Expenses"
          value={whole(cur.totalExpenses)}
          change={prev ? delta(curLike.totalExpenses, prev.totalExpenses) : undefined}
          changeLabel={vsLabel}
          goodWhen="down"
        />
        <FinanceStat
          icon={Percent}
          tone="green"
          label="Gross margin"
          value={shareLabel(cur.grossMargin)}
          sub={`Net margin ${shareLabel(cur.netMargin)}`}
        />
        <FinanceStat
          icon={Repeat}
          tone="green"
          label="Monthly recurring"
          value={whole(m.mrr)}
          sub={`${whole(m.arr)} a year · ${m.paying} paying`}
        />
      </div>

      <AdminSection id="pnl" title="Profit and loss" sub={period.label}>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard title="Money in and out" sub={`${period.label}, by ${period.grain === "year" || period.grain === "all" ? "month" : period.grain === "quarter" ? "week" : "day"}`}>
            <MoneyBars
              points={bucketPnl.map((b) => ({ label: b.label, revenue: b.p.revenue, expenses: b.p.totalExpenses }))}
            />
          </AdminCard>

          <AdminCard className="overflow-hidden" title="Statement" sub={cmp ? `Against ${cmp.prevLabel}${cmp.partial ? ", same days" : ""}` : "All time"} flush>
            <table className="w-full text-left text-sm">
              {prev && (
                <thead className="border-y border-[#e3e9f1] bg-[#f8fafc]">
                  <tr>
                    <th className={th}></th>
                    <th className={`${th} text-right`}>This period</th>
                    <th className={`${th} hidden text-right sm:table-cell`}>{cmp!.prevLabel}</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {statement.map((l) => (
                  <tr key={l.label} className={l.strong ? "border-t border-[#e3e9f1] bg-[#f8fafc]" : ""}>
                    <td className={`py-2.5 pr-2 ${l.indent ? "pl-8 text-ink-soft sm:pl-9" : "pl-5 font-bold text-ink sm:pl-6"}`}>
                      {l.label}
                      {l.margin && cur[l.margin] !== null && (
                        <span className="ml-1.5 text-xs font-normal text-ink-soft">{shareLabel(cur[l.margin])}</span>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-2.5 text-right tabular-nums ${
                        l.strong ? `font-bold ${(cur[l.key] as number) < 0 ? "text-verdict-red" : "text-ink"}` : "text-ink-soft"
                      }`}
                    >
                      {val(cur, l)}
                      {prev && <span className="block text-[11px] font-normal text-ink-soft sm:hidden">was {val(prev, l)}</span>}
                    </td>
                    {prev && (
                      <td className="hidden whitespace-nowrap px-5 py-2.5 text-right tabular-nums text-ink-soft sm:table-cell">
                        {val(prev, l)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {yearAgo && (
              <p className="border-t border-[#e3e9f1] px-5 py-3 text-xs text-ink-soft sm:px-6">
                Same time last year ({cmp!.yearAgoLabel}): {naira(yearAgo.revenue)} revenue,{" "}
                {naira(yearAgo.net)} profit or loss.
                {yearAgo.revenue > 0 && <> Revenue growth: <b className="text-ink">{shareLabel(delta(curLike.revenue, yearAgo.revenue))}</b>.</>}
              </p>
            )}
          </AdminCard>
        </div>

        <details className="mt-4 rounded-2xl border border-[#e3e9f1] bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 font-display text-sm font-bold text-ink sm:px-6 [&::-webkit-details-marker]:hidden">
            {`Show every ${period.grain === "year" || period.grain === "all" ? "month" : period.grain === "quarter" ? "week" : "day"} as a table`} &darr;
          </summary>
          <div className="max-h-96 overflow-auto border-t border-[#e3e9f1]">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="sticky top-0 bg-[#f8fafc]">
                <tr>
                  <th className={th}>When</th>
                  <th className={`${th} text-right`}>Revenue</th>
                  <th className={`${th} text-right`}>Expenses</th>
                  <th className={`${th} text-right`}>Profit or loss</th>
                </tr>
              </thead>
              <tbody>
                {[...bucketPnl].reverse().map((b) => (
                  <tr key={b.label} className="border-b border-[#eef2f7] last:border-0">
                    <td className="px-5 py-2.5 text-ink">{b.label}</td>
                    <td className={`${td} text-right`}>{naira(b.p.revenue)}</td>
                    <td className={`${td} text-right`}>{naira(b.p.totalExpenses)}</td>
                    <td className={`px-5 py-2.5 text-right font-semibold tabular-nums ${b.p.net < 0 ? "text-verdict-red" : "text-ink"}`}>
                      {naira(b.p.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </AdminSection>

      <AdminSection id="growth" title="Growth" sub="Every month, quarter and year since launch, each against the one before">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <FinanceStat label="Month on month" value={mom?.growth == null ? "—" : `${mom.growth > 0 ? "+" : ""}${Math.round(mom.growth * 100)}%`} sub={mom ? `${mom.label}, revenue` : "No full month yet"} />
          <FinanceStat label="Quarter on quarter" value={qoq?.growth == null ? "—" : `${qoq.growth > 0 ? "+" : ""}${Math.round(qoq.growth * 100)}%`} sub={qoq ? `${qoq.label}, revenue` : "No full quarter yet"} />
          <FinanceStat label="Year on year" value={yoy?.growth == null ? "—" : `${yoy.growth > 0 ? "+" : ""}${Math.round(yoy.growth * 100)}%`} sub={yoy ? `${yoy.label}, revenue` : "No full year yet"} />
          <FinanceStat label="Average monthly growth" value={shareLabel(m.cmgr)} sub="compounded, last 6 full months" />
        </div>
        <AdminCard title="Growth table" sub="Newest first. A row still running is compared with the same days of the row before." className="mt-4" flush>
          <GrowthTables data={growthData} />
        </AdminCard>
      </AdminSection>

      <AdminSection id="investors" title="For investors" sub="The numbers a funder or grant panel asks for">
        <div className="grid gap-4 lg:grid-cols-3">
          {exportData.metrics.map((g) => (
            <AdminCard key={g.group} title={g.group}>
              <dl className="divide-y divide-[#eef2f7]">
                {g.rows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-[13px] text-ink-soft">{r.label}</dt>
                    <dd className="shrink-0 font-display text-sm font-bold tabular-nums text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </AdminCard>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Cost to win a customer is marketing spend over new paying customers in {period.label}.
          {m.breakEvenAtBasic && " Break-even uses the N1,500 Basic price until someone is paying."}
          {" "}Cash counts only what has been recorded here and from Paystack.
        </p>
      </AdminSection>

      <AdminSection id="revenue" title="Revenue and spending" sub={period.label}>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminCard title="Revenue by plan">
            <BarList
              rows={revenueByPlan(input, win)
                .filter((r) => r.amount > 0)
                .map((r) => ({ label: TIER_LABEL[r.tier], value: r.amount, note: `${r.count} payment${r.count === 1 ? "" : "s"}` }))}
              format={nairaShort}
              empty="No payments in this period."
            />
          </AdminCard>
          <AdminCard title="Spending by category" link={{ href: `/admin/finance/expenses?${periodQuery}`, label: "Expenses" }}>
            <BarList
              rows={[
                ...expensesByCategory(input, win).map((c) => ({ label: c.label, value: c.amount })),
                ...(cur.paystackFees ? [{ label: "Paystack fees (estimated)", value: cur.paystackFees, note: "automatic" }] : []),
                ...(cur.commissions ? [{ label: "Partner commissions", value: cur.commissions, note: "automatic" }] : []),
              ]}
              format={nairaShort}
              max={14}
              empty="Nothing spent in this period."
            />
          </AdminCard>
        </div>
      </AdminSection>

      <AdminSection id="subscriptions" title="Subscriptions" sub="Who pays, month by month, and who stopped">
        <AdminCard title="By who they are" flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-y border-[#e3e9f1] bg-[#f8fafc]">
                <tr>
                  <th className={th}>Who</th>
                  <th className={th}>Sign-ups</th>
                  <th className={th}>Trials</th>
                  <th className={th}>Trial to paid</th>
                  <th className={th}>Paying now</th>
                  <th className={th}>Revenue · {period.label}</th>
                  <th className={th}>Revenue, all time</th>
                </tr>
              </thead>
              <tbody>
                {subs.byType.map((g) => (
                  <tr key={g.group} className={`border-b border-[#eef2f7] last:border-0 ${g.group === "all" ? "font-bold text-ink" : ""}`}>
                    <td className="px-5 py-3 text-ink">{groupLabel(g.group)}</td>
                    <td className={td}>{g.signups}</td>
                    <td className={td}>{g.trialsStarted}</td>
                    <td className={td}>{g.trialsStarted ? `${g.conversion}%` : "—"}</td>
                    <td className={td}>{g.activeSubs}</td>
                    <td className={td}>{naira(g.revenueInRange)}</td>
                    <td className={td}>{naira(g.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AdminCard title={`Month by month · ${subs.year}`} flush>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-[#e3e9f1] bg-[#f8fafc]">
                  <tr>
                    <th className={th}>Month</th>
                    <th className={th}>New</th>
                    <th className={th}>Lapsed</th>
                    <th className={th}>Active at end</th>
                    <th className={th}>Kept</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.monthly.map((r) => (
                    <tr key={r.month} className="border-b border-[#eef2f7] last:border-0">
                      <td className="px-5 py-3 text-ink">{r.month}</td>
                      <td className={td}>{r.newSubs}</td>
                      <td className={td}>{r.churned}</td>
                      <td className={td}>{r.activeEnd}</td>
                      <td className={td}>{r.activeEnd || r.churned ? `${r.retention}%` : "—"}</td>
                    </tr>
                  ))}
                  {subs.monthly.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-ink-soft" colSpan={5}>Nothing for {subs.year} yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AdminCard>

          <AdminCard title="Who stopped paying" sub="Reach out and ask why" flush>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-[#e3e9f1] bg-[#f8fafc]">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Ended</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.churnedList.map((u, i) => (
                    <tr key={i} className="border-b border-[#eef2f7] last:border-0">
                      <td className="px-5 py-3 text-ink">{u.name}</td>
                      <td className="px-5 py-3">
                        <a href={`mailto:${u.email}`} className="text-brand hover:underline">{u.email}</a>
                      </td>
                      <td className={td}>{new Date(u.ended).toLocaleDateString("en-GB")}</td>
                    </tr>
                  ))}
                  {subs.churnedList.length === 0 && (
                    <tr>
                      <td className="px-5 py-8 text-center text-ink-soft" colSpan={3}>Nobody has stopped paying.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      </AdminSection>

      <AdminSection id="other-income" title="Grants, investment and other sales" sub="Money in that did not come through Paystack">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <AdminCard title="Record money in" sub="Grants and investment are cash, not revenue. Other sales count as revenue.">
            <LedgerForm table="income" submitLabel="Save" idPrefix="income-new" disabled={!ready} />
          </AdminCard>
          <AdminCard title="Received" sub={period.label} flush>
            <LedgerList table="income" rows={incomeRows} ready={ready} empty="Nothing recorded in this period." />
          </AdminCard>
        </div>
      </AdminSection>
    </AdminShell>
  );
}
