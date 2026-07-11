import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import AdminLogin from "../AdminLogin";
import PartnerPanel from "./PartnerPanel";
import ReferredUsers from "./ReferredUsers";
import { COMMISSION_CAP, COMMISSION_RATE, naira } from "@/lib/partners";
import { getPartnerStats, type Range } from "@/lib/partnerStats";

export const dynamic = "force-dynamic";

const RANGES: Record<Range, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
};

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; year?: string; partner?: string }>;
}) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <AdminLogin />;

  const sp = await searchParams;
  const range = (sp.range && sp.range in RANGES ? sp.range : "week") as Range;
  const thisYear = new Date().getFullYear();
  const year = Number(sp.year) || thisYear;

  const years: number[] = [];
  for (let y = 2026; y <= Math.max(thisYear + 1, 2027); y++) years.push(y);

  const { rows, totals } = await getPartnerStats(range, year);
  const open = sp.partner ? rows.find((r) => r.partner.id === sp.partner) : undefined;

  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ range, year: String(year), ...extra });
    return `/admin/partners?${p}`;
  };

  const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );

  const chip = (on: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-display font-bold transition-colors ${
      on ? "bg-brand text-white" : "border border-line bg-white text-ink hover:border-brand"
    }`;

  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink/50";
  const td = "px-3 py-3 text-sm text-ink";

  return (
    <main className="min-h-screen bg-mist px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Partner dashboard</h1>
            <p className="mt-1 text-ink-soft">
              Dietitians, nurses, pharmacists and doctors who send you people.
              They earn {Math.round(COMMISSION_RATE * 100)}% of every payment,
              for up to {COMMISSION_CAP} payments per person they bring.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-line bg-white px-5 py-2 font-display font-bold text-ink hover:border-brand"
          >
            Back to dashboard
          </Link>
        </div>

        {/* period */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <Link key={r} href={q({ range: r })} className={chip(r === range)}>
              {RANGES[r]}
            </Link>
          ))}
          <span className="mx-2 h-5 w-px bg-line" />
          {years.map((y) => (
            <Link key={y} href={q({ year: String(y) })} className={chip(y === year)}>
              {y}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Tile label="Link clicks" value={totals.clicks.toLocaleString()} />
          <Tile label="Free trials" value={totals.trials.toLocaleString()} sub={`${totals.signups} signed up`} />
          <Tile label="Active subs" value={totals.activeSubs.toLocaleString()} sub="paying right now" />
          <Tile label="Total earnings" value={naira(totals.earned)} sub={RANGES[range].toLowerCase()} />
          <Tile
            label="Pending payout"
            value={totals.pending > 0 ? naira(totals.pending) : "Nothing"}
            sub="you owe this now"
          />
          <Tile label="Paid out" value={naira(totals.paidOut)} sub="all time" />
        </div>

        {/* add a partner + the list */}
        <PartnerPanel
          rows={rows.map((r) => ({
            id: r.partner.id,
            seq: r.partner.seq,
            code: r.partner.code,
            name: r.partner.name,
            profession: r.partner.profession,
            email: r.partner.email,
            phone: r.partner.phone,
            active: r.partner.active,
            clicks: r.clicks,
            signups: r.signups,
            trials: r.trials,
            activeSubs: r.activeSubs,
            earned: r.earned,
            pending: r.pending,
            paidOut: r.paidOut,
          }))}
          openId={sp.partner ?? null}
          query={{ range, year: String(year) }}
        />

        {/* one partner, opened */}
        {open && (
          <section className="mt-8 rounded-2xl border border-line bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">
                  {open.partner.name}{" "}
                  <span className="font-normal text-ink-soft">
                    ({open.partner.profession})
                  </span>
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{open.partner.email}</p>
              </div>
              <Link href={q({})} className="text-sm text-ink-soft underline hover:text-brand">
                Close
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Tile label="Owed now" value={naira(open.pending)} />
              <Tile label="Paid so far" value={naira(open.paidOut)} />
              <Tile label="People still paying" value={String(open.activeSubs)} />
            </div>

            {/* the people they brought, and the payouts */}
            <ReferredUsers partnerId={open.partner.id} />
          </section>
        )}

        {rows.length > 0 && (
          <p className="mt-6 text-xs text-ink-soft">
            Everyone a partner brings in is a normal Glufloat account and still
            counts in the total users on the main dashboard. Nothing is
            double-counted, and nothing is hidden from it.
          </p>
        )}
      </div>
    </main>
  );
}
