import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "./AdminLogin";
import ExportButton, { type ExportData } from "./ExportButton";
import RangeSelect from "./RangeSelect";
import YearSelect from "./YearSelect";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const naira = (kobo: number) => "N" + Math.round(kobo / 100).toLocaleString();
const SUB_PRICE_KOBO = 150000; // N1,500

const RANGES: Record<string, { days: number; label: string }> = {
  day: { days: 1, label: "Today" },
  week: { days: 7, label: "This week" },
  month: { days: 30, label: "This month" },
  quarter: { days: 90, label: "This quarter" },
  year: { days: 365, label: "This year" },
};

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; year?: string }>;
}) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <AdminLogin />;

  const sp = await searchParams;
  const range = sp.range && RANGES[sp.range] ? sp.range : "month";
  const rangeStart = Date.now() - RANGES[range].days * DAY_MS;

  const nowD = new Date();
  const curYear = nowD.getFullYear();
  const year = Number(sp.year) || curYear;
  const years: number[] = [];
  for (let y = 2026; y <= curYear + 2; y++) years.push(y);

  const admin = createAdminClient();
  const [{ data: profiles }, { data: subs }, { data: payments }] = await Promise.all([
    admin.from("profiles").select("id,email,name,trial_start,created_at"),
    admin.from("subscriptions").select("user_id,status,current_period_end,amount"),
    admin.from("payments").select("email,amount,status,paid_at"),
  ]);

  const now = Date.now();
  const P = profiles ?? [];
  const S = subs ?? [];
  const Y = (payments ?? []).filter((p) => p.status === "success");
  const profById = new Map(P.map((p) => [p.id, p]));

  const isLive = (s: (typeof S)[number]) =>
    (s.status === "active" || s.status === "non-renewing") &&
    s.current_period_end &&
    new Date(s.current_period_end).getTime() > now;

  // Range-scoped
  const signupsInRange = P.filter(
    (p) => new Date(p.created_at).getTime() >= rangeStart,
  ).length;
  const revenueRange = Y.filter(
    (p) => p.paid_at && new Date(p.paid_at).getTime() >= rangeStart,
  ).reduce((n, p) => n + (p.amount || 0), 0);

  // Lifetime
  const signups = P.length;
  const trialsStarted = P.filter((p) => p.trial_start).length;
  const activeSubs = S.filter(isLive).length;
  const everSubscribed = S.length;
  const conversion = trialsStarted
    ? Math.round((everSubscribed / trialsStarted) * 100)
    : 0;
  const revenue = Y.reduce((n, p) => n + (p.amount || 0), 0);
  const mrr = activeSubs * SUB_PRICE_KOBO;
  const churnedNow = everSubscribed - activeSubs;
  const churnRateOverall = everSubscribed
    ? Math.round((churnedNow / everSubscribed) * 100)
    : 0;

  // First success payment per email (for "new subscribers" per month)
  const firstPaid = new Map<string, number>();
  for (const p of Y) {
    if (!p.email || !p.paid_at) continue;
    const t = new Date(p.paid_at).getTime();
    const cur = firstPaid.get(p.email);
    if (cur === undefined || t < cur) firstPaid.set(p.email, t);
  }

  // Month-on-month for the selected year, from launch (July 2026) forward.
  const LAUNCH = new Date(2026, 6, 1).getTime();
  const curMonthStart = new Date(nowD.getFullYear(), nowD.getMonth(), 1).getTime();
  const monthly = [];
  for (let m = 0; m < 12; m++) {
    const mStart = new Date(year, m, 1).getTime();
    const mEnd = new Date(year, m + 1, 1).getTime();
    if (mStart < LAUNCH || mStart > curMonthStart) continue; // pre-launch or future
    const label = new Date(mStart).toLocaleDateString("en", {
      month: "short",
      year: "numeric",
    });
    const newSubs = [...firstPaid.values()].filter(
      (t) => t >= mStart && t < mEnd,
    ).length;
    const churned = S.filter((s) => {
      if (!s.current_period_end) return false;
      const end = new Date(s.current_period_end).getTime();
      return end >= mStart && end < mEnd && end < now && !isLive(s);
    }).length;
    const activeEnd = S.filter(
      (s) =>
        s.current_period_end && new Date(s.current_period_end).getTime() >= mEnd,
    ).length;
    const activeStart = S.filter(
      (s) =>
        s.current_period_end &&
        new Date(s.current_period_end).getTime() >= mStart,
    ).length;
    const churnRate = activeStart ? Math.round((churned / activeStart) * 100) : 0;
    monthly.push({
      month: label,
      newSubs,
      churned,
      activeEnd,
      churnRate,
      retention: activeStart ? 100 - churnRate : 0,
    });
  }

  // Who churned (screen only, has email for outreach)
  const churnedList = S.filter(
    (s) =>
      s.current_period_end &&
      new Date(s.current_period_end).getTime() < now &&
      !isLive(s),
  )
    .map((s) => ({
      email: profById.get(s.user_id)?.email ?? "—",
      name: profById.get(s.user_id)?.name ?? "—",
      ended: s.current_period_end as string,
    }))
    .sort((a, b) => new Date(b.ended).getTime() - new Date(a.ended).getTime());

  const recent = [...P]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 12);

  const exportData: ExportData = {
    range: RANGES[range].label,
    stats: [
      { label: `Signups (${RANGES[range].label.toLowerCase()})`, value: signupsInRange.toLocaleString() },
      { label: "Signups (all time)", value: signups.toLocaleString() },
      { label: "Trials started", value: trialsStarted.toLocaleString() },
      { label: "Trial to paid", value: `${conversion}%` },
      { label: "Active subscribers", value: activeSubs.toLocaleString() },
      { label: "MRR", value: naira(mrr) },
      { label: `Revenue (${RANGES[range].label.toLowerCase()})`, value: naira(revenueRange) },
      { label: "Revenue (all time)", value: naira(revenue) },
      { label: "Churn (all time)", value: `${churnRateOverall}%` },
    ],
    monthly,
  };

  return (
    <main className="min-h-screen bg-mist px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              Glufloat — the numbers
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Live from your database. The PDF holds totals only, no personal
              data.
            </p>
          </div>
          <ExportButton data={exportData} />
        </div>

        {/* period dropdown */}
        <div className="mt-6">
          <RangeSelect range={range} year={year} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label={`Signups · ${RANGES[range].label}`} value={signupsInRange.toLocaleString()} sub={`${signups} all time`} />
          <Tile label="Active trials" value={P.filter((p) => p.trial_start && (now - new Date(p.trial_start).getTime()) / DAY_MS < 3).length.toLocaleString()} sub={`${trialsStarted} started ever`} />
          <Tile label="Trial → paid" value={`${conversion}%`} sub={`${everSubscribed} converted`} />
          <Tile label="Active subscribers" value={activeSubs.toLocaleString()} sub="paying right now" />
          <Tile label="MRR" value={naira(mrr)} sub="active subs × N1,500" />
          <Tile label={`Revenue · ${RANGES[range].label}`} value={naira(revenueRange)} sub={`${naira(revenue)} all time`} />
          <Tile label="Churn (all time)" value={`${churnRateOverall}%`} sub={`${churnedNow} lapsed`} />
          <Tile label="Total revenue" value={naira(revenue)} />
        </div>

        {/* month on month */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">
            Retention & churn, month on month
          </h2>
          <YearSelect range={range} year={year} years={years} />
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">New subs</th>
                <th className="px-4 py-3">Churned</th>
                <th className="px-4 py-3">Active (end)</th>
                <th className="px-4 py-3">Churn %</th>
                <th className="px-4 py-3">Retention %</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="px-4 py-2.5 text-ink">{m.month}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{m.newSubs}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{m.churned}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{m.activeEnd}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{m.churnRate}%</td>
                  <td className="px-4 py-2.5 text-ink-soft">{m.retention}%</td>
                </tr>
              ))}
              {monthly.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-ink-soft" colSpan={6}>
                    No data for {year} yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* who churned */}
        <h2 className="mt-10 font-display text-lg font-bold text-ink">
          Who churned <span className="text-sm font-normal text-ink-soft">(reach out to ask why)</span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Ended</th>
              </tr>
            </thead>
            <tbody>
              {churnedList.map((u, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="px-4 py-2.5 text-ink">{u.name}</td>
                  <td className="px-4 py-2.5">
                    <a href={`mailto:${u.email}`} className="text-brand hover:underline">
                      {u.email}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">
                    {new Date(u.ended).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {churnedList.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-ink-soft" colSpan={3}>
                    No one has churned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* recent signups */}
        <h2 className="mt-10 font-display text-lg font-bold text-ink">
          Recent signups
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Trial</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="px-4 py-2.5 text-ink">{p.name || "—"}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{p.email}</td>
                  <td className="px-4 py-2.5 text-ink-soft">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">
                    {p.trial_start ? "started" : "—"}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-ink-soft" colSpan={4}>
                    No signups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
