import { Receipt, Landmark, Building2, Zap } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import AdminLogin from "../../AdminLogin";
import AdminShell from "../../AdminShell";
import AdminCard from "../../AdminCard";
import BarList from "../../BarList";
import PeriodPicker from "@/components/PeriodPicker";
import FinanceStat from "../FinanceStat";
import LedgerForm from "../LedgerForm";
import LedgerList from "../LedgerList";
import ExpenseFilters from "../ExpenseFilters";
import SetupNotice from "../SetupNotice";
import { parsePeriod, type PeriodParams } from "@/lib/period";
import { comparisons, dayStart, expensesByCategory, growth, pnl, sum } from "@/lib/finance";
import { loadFinance } from "@/lib/financeData";
import { categoryOf, naira, nairaShort, nairaWhole, PAYER_LABEL, type Payer } from "@/lib/financeConfig";

export const dynamic = "force-dynamic";

/**
 * Every naira spent. Record it on the left, see where it went on the right,
 * and the full list underneath. Paystack fees and partner commissions are
 * counted on their own and are shown here, but never typed in.
 */
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<PeriodParams & { cat?: string; by?: string }>;
}) {
  if (!(await isAdmin())) return <AdminLogin />;

  const sp = await searchParams;
  const period = parsePeriod(sp);
  const { input, ready } = await loadFinance();
  const win = { from: period.from?.getTime() ?? null, to: period.to?.getTime() ?? null };
  const inWin = (iso: string) => {
    const t = dayStart(iso);
    return (win.from === null || t >= win.from) && (win.to === null || t < win.to);
  };

  const cur = pnl(input, win);
  const cmp = comparisons(period, input.now);
  const prev = cmp ? pnl(input, cmp.prev) : null;
  const curLike = cmp ? pnl(input, cmp.current) : cur;

  const inPeriod = input.expenses.filter((e) => inWin(e.spent_on));
  const typedIn = sum(inPeriod.map((e) => e.amount));
  const byFounders = sum(inPeriod.filter((e) => e.paid_by !== "company").map((e) => e.amount));
  const auto = cur.paystackFees + cur.commissions;
  const cats = expensesByCategory(input, win).sort((a, b) => b.amount - a.amount);

  const shown = inPeriod.filter(
    (e) => (!sp.cat || e.category === sp.cat) && (!sp.by || e.paid_by === sp.by),
  );
  const filterLabel = [sp.cat ? categoryOf(sp.cat).label : null, sp.by ? PAYER_LABEL[sp.by as Payer] : null]
    .filter(Boolean)
    .join(" · ");

  const change = prev ? (curLike.totalExpenses && !prev.totalExpenses ? null : (growth(curLike.totalExpenses, prev.totalExpenses) ?? 0)) : undefined;

  return (
    <AdminShell title="Expenses" subtitle={`${period.label}. Everything spent to run GluFloat.`}>
      <PeriodPicker period={period} basePath="/admin/finance/expenses" keep={["cat", "by"]} />
      {!ready && <SetupNotice />}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <FinanceStat
          emphasis
          icon={Receipt}
          label="Spent in total"
          value={nairaWhole(cur.totalExpenses)}
          change={change}
          changeLabel={cmp ? `vs ${cmp.partial ? "same days of " : ""}${cmp.prevLabel}` : undefined}
          goodWhen="down"
        />
        <FinanceStat icon={Building2} tone="blue" label="Recorded here" value={nairaWhole(typedIn)} sub={`${inPeriod.length} entr${inPeriod.length === 1 ? "y" : "ies"}`} />
        <FinanceStat icon={Landmark} tone="amber" label="Paid by founders" value={nairaWhole(byFounders)} sub="becomes a founder loan" />
        <FinanceStat icon={Zap} tone="green" label="Counted automatically" value={nairaWhole(auto)} sub="Paystack fees and partner commissions" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <AdminCard title="Record an expense" sub="If a founder paid from their own pocket, pick them under Who paid. It is added to their loan.">
          <LedgerForm table="expense" submitLabel="Save expense" idPrefix="expense-new" disabled={!ready} />
        </AdminCard>
        <AdminCard title="Where the money went" sub={period.label}>
          <BarList
            rows={[
              ...cats.map((c) => ({ label: c.label, value: c.amount })),
              ...(cur.paystackFees ? [{ label: "Paystack fees (estimated)", value: cur.paystackFees, note: "automatic" }] : []),
              ...(cur.commissions ? [{ label: "Partner commissions", value: cur.commissions, note: "automatic" }] : []),
            ]}
            format={nairaShort}
            max={14}
            empty="Nothing spent in this period."
          />
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#eef2f7] pt-4 text-sm">
            <div>
              <dt className="text-xs text-ink-soft">Cost of serving customers</dt>
              <dd className="font-display font-bold tabular-nums text-ink">{naira(cur.costOfRevenue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Running costs</dt>
              <dd className="font-display font-bold tabular-nums text-ink">{naira(cur.operating)}</dd>
            </div>
          </dl>
        </AdminCard>
      </div>

      <AdminCard
        title="Every expense"
        sub={`${period.label}${filterLabel ? ` · ${filterLabel}` : ""} · ${shown.length} shown · ${naira(sum(shown.map((e) => e.amount)))}`}
        className="mt-4"
        flush
      >
        <div className="px-5 pb-4 sm:px-6">
          <ExpenseFilters />
        </div>
        <LedgerList
          table="expense"
          rows={shown}
          ready={ready}
          empty={filterLabel ? "Nothing matches these filters in this period." : "Nothing recorded in this period."}
        />
      </AdminCard>
    </AdminShell>
  );
}
