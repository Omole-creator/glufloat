import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "./AdminLogin";
import AdminShell from "./AdminShell";
import ExportButton, { type ExportData } from "./ExportButton";
import PeriodPicker from "@/components/PeriodPicker";
import { inPeriod, parsePeriod, type PeriodParams } from "@/lib/period";
import { GROUPS, groupLabel, inGroup, type Group } from "@/lib/userType";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const naira = (kobo: number) => "N" + Math.round(kobo / 100).toLocaleString();
const SUB_PRICE_KOBO = 150000; // N1,500

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
  searchParams: Promise<PeriodParams>;
}) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <AdminLogin />;

  const sp = await searchParams;

  /**
   * A real window, not "the last 30 days". "This month" used to mean the 30 days
   * up to right now, so you could never open June of last year, or compare one
   * quarter with another. Now the period is chosen and named: June 2027 means
   * June 2027, whenever you look at it.
   */
  const period = parsePeriod(sp);

  const nowD = new Date();
  // The month-by-month table follows whichever year the period is pointing at.
  const year = period.y;

  const admin = createAdminClient();
  const [{ data: profiles }, { data: subs }, { data: payments }] = await Promise.all([
    admin.from("profiles").select("id,email,name,trial_start,created_at,user_type"),
    admin.from("subscriptions").select("user_id,status,current_period_end,amount"),
    admin.from("payments").select("user_id,email,amount,status,paid_at"),
  ]);

  const now = Date.now();
  const P = profiles ?? [];
  const S = subs ?? [];
  const Y = (payments ?? []).filter((p) => p.status === "success");
  const profById = new Map(P.map((p) => [p.id, p]));
  const profByEmail = new Map(P.map((p) => [p.email.toLowerCase(), p]));

  const isLive = (s: (typeof S)[number]) =>
    (s.status === "active" || s.status === "non-renewing") &&
    s.current_period_end &&
    new Date(s.current_period_end).getTime() > now;

  /**
   * Who a payment belongs to. Paystack's webhook may identify the payer by id or
   * only by the email they typed, so both paths are tried, exactly as the webhook
   * itself does. A payment we cannot place lands in "Not set" with the accounts
   * that never answered, rather than being quietly dropped from the totals.
   */
  const payerType = (p: (typeof Y)[number]) =>
    (p.user_id ? profById.get(p.user_id) : undefined)?.user_type ??
    (p.email ? profByEmail.get(p.email.toLowerCase()) : undefined)?.user_type ??
    null;

  const subType = (s: (typeof S)[number]) =>
    profById.get(s.user_id)?.user_type ?? null;

  /**
   * Every number, for one kind of person.
   *
   * A health worker signing up to look at the app almost never subscribes, so
   * mixed in with everybody else they drag trial-to-paid down and it stops
   * meaning anything. Each group is measured on its own, and "Everyone" is the
   * same maths over all of them, so the totals still add up.
   */
  function metricsFor(g: Group) {
    const people = P.filter((p) => inGroup(p.user_type, g));
    const theirSubs = S.filter((s) => inGroup(subType(s), g));
    const theirPay = Y.filter((p) => inGroup(payerType(p), g));

    const signups = people.length;
    const trialsStarted = people.filter((p) => p.trial_start).length;
    const activeSubs = theirSubs.filter(isLive).length;
    const everSubscribed = theirSubs.length;
    const churnedNow = everSubscribed - activeSubs;

    return {
      group: g,
      signups,
      signupsInRange: people.filter((p) => inPeriod(p.created_at, period)).length,
      trialsStarted,
      activeSubs,
      everSubscribed,
      churnedNow,
      conversion: trialsStarted
        ? Math.round((everSubscribed / trialsStarted) * 100)
        : 0,
      churnRate: everSubscribed
        ? Math.round((churnedNow / everSubscribed) * 100)
        : 0,
      revenue: theirPay.reduce((n, p) => n + (p.amount || 0), 0),
      revenueInRange: theirPay
        .filter((p) => inPeriod(p.paid_at, period))
        .reduce((n, p) => n + (p.amount || 0), 0),
      mrr: activeSubs * SUB_PRICE_KOBO,
    };
  }

  const byType = GROUPS.map(metricsFor);
  const all = byType[0]; // "all" is first in GROUPS

  // The headline tiles are still the whole business, unchanged.
  const {
    signups,
    signupsInRange,
    trialsStarted,
    activeSubs,
    everSubscribed,
    conversion,
    revenue,
    revenueInRange: revenueRange,
    mrr,
    churnedNow,
    churnRate: churnRateOverall,
  } = all;

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
    range: period.label,
    stats: [
      { label: `Signups (${period.label.toLowerCase()})`, value: signupsInRange.toLocaleString() },
      { label: "Signups (all time)", value: signups.toLocaleString() },
      { label: "Trials started", value: trialsStarted.toLocaleString() },
      { label: "Trial to paid", value: `${conversion}%` },
      { label: "Active subscribers", value: activeSubs.toLocaleString() },
      { label: "MRR", value: naira(mrr) },
      { label: `Revenue (${period.label.toLowerCase()})`, value: naira(revenueRange) },
      { label: "Revenue (all time)", value: naira(revenue) },
      { label: "Churn (all time)", value: `${churnRateOverall}%` },
    ],
    byType: byType.map((m) => ({
      who: groupLabel(m.group),
      signups: m.signups.toLocaleString(),
      trials: m.trialsStarted.toLocaleString(),
      conversion: m.trialsStarted ? `${m.conversion}%` : "-",
      paying: m.activeSubs.toLocaleString(),
      revenue: naira(m.revenue),
    })),
    monthly,
  };

  return (
    <AdminShell
      title="The numbers"
      intro="Live from your database. The PDF holds totals only, no personal data."
      actions={<ExportButton data={exportData} />}
    >
      <>
        {/* Any period, not just the one we happen to be in. */}
        <PeriodPicker period={period} basePath="/admin" />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label={`Signups · ${period.label}`} value={signupsInRange.toLocaleString()} sub={`${signups} all time`} />
          <Tile label="Active trials" value={P.filter((p) => p.trial_start && (now - new Date(p.trial_start).getTime()) / DAY_MS < 3).length.toLocaleString()} sub={`${trialsStarted} started ever`} />
          <Tile label="Trial → paid" value={`${conversion}%`} sub={`${everSubscribed} converted`} />
          <Tile label="Active subscribers" value={activeSubs.toLocaleString()} sub="paying right now" />
          <Tile label="MRR" value={naira(mrr)} sub="active subs × N1,500" />
          <Tile label={`Revenue · ${period.label}`} value={naira(revenueRange)} sub={`${naira(revenue)} all time`} />
          <Tile label="Churn (all time)" value={`${churnRateOverall}%`} sub={`${churnedNow} lapsed`} />
          <Tile label="Total revenue" value={naira(revenue)} />
        </div>

        {/*
          The same numbers again, but split by who the person is.

          This is the point of the whole thing. A health worker signing up to look
          at the app almost never subscribes, so mixed in with everybody else they
          drag trial-to-paid down and the number stops meaning anything. Read the
          Diabetic row: that is the real business. "Everyone" is the same maths
          over all of them, so the totals still tie back to the tiles above.
        */}
        <h2 className="mt-10 font-display text-lg font-bold text-ink">
          Every number, by who they are{" "}
          <Link href="/admin/users" className="text-sm font-normal text-brand hover:underline">
            see and search everyone
          </Link>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[54rem] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Signups · {period.label}</th>
                <th className="px-4 py-3">Signups (all)</th>
                <th className="px-4 py-3">Trials</th>
                <th className="px-4 py-3">Trial → paid</th>
                <th className="px-4 py-3">Paying now</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3">Revenue · {period.label}</th>
                <th className="px-4 py-3">Revenue (all)</th>
                <th className="px-4 py-3">Churn</th>
              </tr>
            </thead>
            <tbody>
              {byType.map((m) => {
                const everyone = m.group === "all";
                return (
                  <tr
                    key={m.group}
                    className={`border-b border-line/60 ${
                      everyone ? "bg-mist font-display font-bold text-ink" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-ink">
                      {groupLabel(m.group)}
                      {m.group === "none" && (
                        <span className="block text-xs font-normal text-ink-soft">
                          signed up before we asked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{m.signupsInRange.toLocaleString()}</td>
                    <td className="px-4 py-2.5">{m.signups.toLocaleString()}</td>
                    <td className="px-4 py-2.5">{m.trialsStarted.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      {m.trialsStarted ? `${m.conversion}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5">{m.activeSubs.toLocaleString()}</td>
                    <td className="px-4 py-2.5">{naira(m.mrr)}</td>
                    <td className="px-4 py-2.5">{naira(m.revenueInRange)}</td>
                    <td className="px-4 py-2.5">{naira(m.revenue)}</td>
                    <td className="px-4 py-2.5">
                      {m.everSubscribed ? `${m.churnRate}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          A dash means nobody in that group has got that far yet, which is not the
          same as zero percent. Everyone who signed up before the question existed
          sits in Not set, and nobody was guessed into a group.
        </p>

        {/* month on month */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-ink">
            Retention &amp; churn, month on month &middot; {year}
          </h2>
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

        {/*
          The newest 12 only. Say so: an older person dropping off the bottom of
          this table as new ones arrive looks exactly like an account being
          deleted, and it worried the founder. The full list is /admin/users.
        */}
        <h2 className="mt-10 font-display text-lg font-bold text-ink">
          The newest 12 signups{" "}
          <Link href="/admin/users" className="text-sm font-normal text-brand hover:underline">
            see and search all {signups.toLocaleString()}
          </Link>
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
      </>
    </AdminShell>
  );
}
