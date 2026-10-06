import Link from "next/link";
import { isAdmin } from "@/lib/recordings";
import AdminLogin from "../../AdminLogin";
import AdminShell from "../../AdminShell";
import AdminCard from "../../AdminCard";
import PeriodPicker from "@/components/PeriodPicker";
import LedgerForm from "../LedgerForm";
import LedgerList from "../LedgerList";
import SetupNotice from "../SetupNotice";
import { parsePeriod, type PeriodParams } from "@/lib/period";
import { dayStart, founderBalances } from "@/lib/finance";
import { loadFinance } from "@/lib/financeData";
import { FOUNDERS, naira, type Founder } from "@/lib/financeConfig";

export const dynamic = "force-dynamic";

/**
 * What Omole and Favour have put into GluFloat, and what GluFloat still owes
 * them. Two ways money gets in: a founder pays a bill from their own pocket
 * (recorded as an expense, "Who paid" set to them), or puts cash into the
 * company account. GluFloat paying them back takes it down.
 *
 * "Still owed" ignores the period on purpose, like "owed now" on the partner
 * screen: a debt is owed whatever month you are looking at. The lists and the
 * "in this period" line follow the picker.
 */
export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<PeriodParams & { founder?: string }>;
}) {
  if (!(await isAdmin())) return <AdminLogin />;

  const sp = await searchParams;
  const period = parsePeriod(sp);
  const only = (FOUNDERS.find((f) => f.key === sp.founder)?.key ?? null) as Founder | null;
  const { input, ready } = await loadFinance();
  const win = { from: period.from?.getTime() ?? null, to: period.to?.getTime() ?? null };
  const inWin = (iso: string) => {
    const t = dayStart(iso);
    return (win.from === null || t >= win.from) && (win.to === null || t < win.to);
  };

  const all = founderBalances(input);
  const thisPeriod = founderBalances(input, win);
  const totalOwed = all.reduce((n, f) => n + f.owed, 0);

  const spending = input.expenses.filter(
    (e) => e.paid_by !== "company" && inWin(e.spent_on) && (!only || e.paid_by === only),
  );
  const moves = input.loans.filter((l) => inWin(l.happened_on) && (!only || l.founder === only));

  const keepPeriod = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "founder"),
  );
  const tabHref = (f: string | null) => {
    const q = new URLSearchParams(keepPeriod);
    if (f) q.set("founder", f);
    return `/admin/finance/loans?${q}`;
  };

  return (
    <AdminShell title="Founder loans" subtitle={`What the founders have put into GluFloat. Lists show ${period.label}.`}>
      <PeriodPicker period={period} basePath="/admin/finance/loans" keep={["founder"]} />
      {!ready && <SetupNotice />}

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_0.8fr]">
        {all.map((f, i) => {
          const who = FOUNDERS.find((x) => x.key === f.founder)!;
          const p = thisPeriod[i];
          return (
            <section key={f.founder} className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-display text-base font-bold text-white">
                  {who.name[0]}
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-ink">{who.name}</h2>
                  <p className="text-xs text-ink-soft">{who.role}</p>
                </div>
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">Still owed by GluFloat</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{naira(f.owed)}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eef2f7] pt-4 text-sm">
                <div>
                  <dt className="text-xs text-ink-soft">Paid bills</dt>
                  <dd className="font-display font-bold tabular-nums text-ink">{naira(f.spent)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft">Cash put in</dt>
                  <dd className="font-display font-bold tabular-nums text-ink">{naira(f.cashIn)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft">Paid back</dt>
                  <dd className="font-display font-bold tabular-nums text-ink">{naira(f.repaid)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-soft">
                {period.label}: lent {naira(p.lent)}, paid back {naira(p.repaid)}.
              </p>
            </section>
          );
        })}
        <section className="flex flex-col justify-between rounded-2xl bg-brand p-5 text-white sm:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/70">Owed to founders, total</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums">{naira(totalOwed)}</p>
          </div>
          <p className="mt-4 text-xs text-white/80">
            Investors ask for this number. It is money GluFloat owes, not money the founders gave away.
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <AdminCard title="A founder paid a bill" sub="Saved as an expense too, so it counts in profit and loss once.">
          <LedgerForm
            table="expense"
            submitLabel="Save"
            key={`spend-${only ?? "both"}`}
            idPrefix="loan-spend"
            defaults={{ paid_by: only ?? "omole" }}
            only={{ paid_by: ["omole", "favour"] }}
            disabled={!ready}
          />
        </AdminCard>
        <AdminCard title="Cash in, or a repayment" sub="Cash a founder put into the GluFloat account, or money GluFloat paid back.">
          <LedgerForm
            table="loan"
            submitLabel="Save"
            key={`move-${only ?? "both"}`}
            idPrefix="loan-move"
            defaults={only ? { founder: only } : undefined}
            disabled={!ready}
          />
        </AdminCard>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink">The record</h2>
        <nav aria-label="Whose record" className="inline-flex rounded-xl border border-[#e3e9f1] bg-white p-1">
          {[{ key: null, label: "Both" }, ...FOUNDERS.map((f) => ({ key: f.key, label: f.name }))].map((t) => {
            const on = (t.key ?? null) === only;
            return (
              <Link
                key={t.label}
                href={tabHref(t.key)}
                aria-current={on ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 font-display text-sm font-bold transition-colors ${
                  on ? "bg-brand text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminCard title="Bills paid by a founder" sub={`What it was spent on · ${period.label}`} flush>
          <LedgerList table="expense" rows={spending} ready={ready} empty="No founder spending in this period." />
        </AdminCard>
        <AdminCard title="Cash in and repayments" sub={period.label} flush>
          <LedgerList table="loan" rows={moves} ready={ready} empty="Nothing in this period." />
        </AdminCard>
      </div>
    </AdminShell>
  );
}
