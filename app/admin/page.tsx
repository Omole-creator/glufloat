import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "./AdminLogin";
import AdminShell from "./AdminShell";
import AdminHero from "./AdminHero";
import AdminTile from "./AdminTile";
import AdminCard from "./AdminCard";
import AdminSection, { AdminJump } from "./AdminSection";
import BarList from "./BarList";
import DailyBars from "./DailyBars";
import ExportButton, { type ExportData } from "./ExportButton";
import PeriodPicker from "@/components/PeriodPicker";
import { inPeriod, parsePeriod, periodBuckets, type PeriodParams } from "@/lib/period";
import { groupLabel, typeLabel } from "@/lib/userType";
import { subscriptionReport } from "@/lib/subscriptionReport";
import { loadFinance } from "@/lib/financeData";
import { pnl, shareLabel } from "@/lib/finance";
import { nairaWhole as nairaExact } from "@/lib/financeConfig";
import { Wallet, TrendingUp, TrendingDown, Repeat } from "lucide-react";
import { readingHealth, readingVerdict } from "@/lib/glucosePattern";
import { TRIAL_DAYS } from "@/lib/trial";
import { isInternalEmail } from "@/lib/internalAccounts";
import { fetchAll } from "@/lib/adminFetch";
import { displayLabel } from "@/lib/foodName";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const naira = (kobo: number) => "N" + Math.round(kobo / 100).toLocaleString();
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

/** What each tap in usage_events means, in the words on the screen. */
const USAGE_LABEL: Record<string, string> = {
  app_open: "Opened the app",
  meal_reroll: "Pressed \"Try another meal\"",
  check_this_meal: "Pressed \"View details\"",
  food_search: "Searched a food",
  meal_logged: "Logged a meal as eaten",
  reading_logged: "Saved a sugar test",
  hba1c_logged: "Saved a 3-month sugar test",
  doctor_report: "Made a doctor's report",
};

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
  const period = parsePeriod(sp);
  const nowD = new Date();
  const now = nowD.getTime();
  const LAUNCH = new Date(2026, 6, 1);

  const admin = createAdminClient();
  const [
    { rows: profilesRaw },
    { rows: subsRaw },
    { rows: paymentsRaw },
    { rows: usageRaw },
    { rows: readingRowsRaw },
    { rows: partners },
    { rows: checksRaw },
  ] = await Promise.all([
    fetchAll<{
      id: string;
      email: string;
      name: string | null;
      trial_start: string | null;
      created_at: string;
      user_type: string | null;
      source_post: string | null;
      partner_id: string | null;
    }>(() =>
      admin
        .from("profiles")
        .select("id,email,name,trial_start,created_at,user_type,source_post,partner_id"),
    ),
    fetchAll<{ user_id: string; status: string; current_period_end: string | null; amount: number | null }>(
      () => admin.from("subscriptions").select("user_id,status,current_period_end,amount"),
    ),
    fetchAll<{ user_id: string | null; email: string | null; amount: number; status: string; paid_at: string }>(
      () => admin.from("payments").select("user_id,email,amount,status,paid_at"),
    ),
    fetchAll<{ event: string; user_id: string | null; created_at: string }>(() =>
      admin.from("usage_events").select("event,user_id,created_at"),
    ),
    fetchAll<{
      user_id: string;
      meal_check_id: number | null;
      taken_at: string;
      meal_checks: unknown;
    }>(() => admin.from("glucose_readings").select("user_id,meal_check_id,taken_at,meal_checks(kind,label)")),
    fetchAll<{ id: string; code: string; name: string }>(() =>
      admin.from("partners").select("id,code,name"),
    ),
    fetchAll<{ id: number; user_id: string; label: string; checked_at: string }>(() =>
      admin.from("meal_checks").select("id,user_id,label,checked_at"),
    ),
  ]);

  /**
   * Our own accounts (QA and the tier demos, all @glufloat.com) are left out of
   * every number. They carry far-future subscriptions, and counting them made
   * the dashboard show paying customers and monthly revenue that did not exist.
   */
  const internalIds = new Set(profilesRaw.filter((p) => isInternalEmail(p.email)).map((p) => p.id));
  const real = (uid: string | null | undefined) => !uid || !internalIds.has(uid);
  const P = profilesRaw.filter((p) => !internalIds.has(p.id));
  const S = subsRaw.filter((s) => real(s.user_id));
  const Y = paymentsRaw.filter(
    (p) => p.status === "success" && real(p.user_id) && !isInternalEmail(p.email),
  );
  const U = usageRaw.filter((u) => real(u.user_id));
  const UP = U.filter((u) => inPeriod(u.created_at, period));
  const allReadings = readingRowsRaw.filter((r) => real(r.user_id));
  const checks = checksRaw.filter((r) => real(r.user_id));

  // ---- Sugar tests -------------------------------------------------------
  const toReading = (r: (typeof allReadings)[number]) => {
    const meal = r.meal_checks as { kind?: string; label?: string } | null;
    return {
      userId: String(r.user_id),
      mealCheckId: r.meal_check_id ?? null,
      kind: (meal?.kind as "single" | "meal" | undefined) ?? null,
      label: meal?.label ?? null,
    };
  };
  const periodReadings = allReadings.filter((r) => inPeriod(r.taken_at, period));
  // `health` follows the picker; `healthAll` does not, because "has this person
  // got enough tests for the app to speak to them?" is a state, not an event.
  const health = readingHealth(periodReadings.map(toReading));
  const healthAll = readingHealth(allReadings.map(toReading));
  const periodChecks = checks.filter((m) => inPeriod(m.checked_at, period));
  const mealsWithTest = new Set(
    periodReadings.map((r) => r.meal_check_id).filter((id): id is number => id !== null),
  ).size;

  // ---- Money and people ---------------------------------------------------
  // The subscription numbers live in lib/subscriptionReport.ts so the finance
  // screen reads exactly the same ones. "all" is first in GROUPS.
  const { byType, all, monthly } = subscriptionReport({ P, S, Y, period, now, launch: LAUNCH });

  // Money in and out for the period on screen. The full picture is /admin/finance.
  const { input: financeInput } = await loadFinance();
  const money = pnl(financeInput, {
    from: period.from?.getTime() ?? null,
    to: period.to?.getTime() ?? null,
  });
  const activeTrials = P.filter(
    (p) => p.trial_start && (now - new Date(p.trial_start).getTime()) / DAY_MS < TRIAL_DAYS,
  ).length;

  // ---- Do they come back? -------------------------------------------------
  const usageByUser = new Map<string, number[]>();
  for (const u of U) {
    if (!u.user_id) continue;
    const list = usageByUser.get(u.user_id) ?? [];
    list.push(new Date(u.created_at).getTime());
    usageByUser.set(u.user_id, list);
  }
  const cohort = P.filter((p) => p.created_at && inPeriod(p.created_at, period));
  const retentionDay = (n: number) => {
    const eligible = cohort.filter((p) => now - new Date(p.created_at).getTime() >= (n + 1) * DAY_MS);
    const came = eligible.filter((p) => {
      const start = new Date(p.created_at).getTime();
      return (usageByUser.get(p.id) ?? []).some((t) => Math.floor((t - start) / DAY_MS) === n);
    });
    return { eligible: eligible.length, came: came.length };
  };
  const d1 = retentionDay(1);
  const d7 = retentionDay(7);
  const d30 = retentionDay(30);
  const openDays = new Set<string>();
  let openCount = 0;
  for (const u of UP) {
    if (u.event !== "app_open") continue;
    openCount += 1;
    const wat = new Date(new Date(u.created_at).getTime() + 60 * 60 * 1000);
    openDays.add(`${u.user_id ?? "?"}#${wat.toISOString().slice(0, 10)}`);
  }

  // ---- Charts and lists ---------------------------------------------------
  const B = periodBuckets(period, LAUNCH);
  const signupsByDay = B.map((b) => ({
    label: b.label,
    value: P.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= b.start && t < b.end;
    }).length,
  }));
  const opensByDay = B.map((b) => ({
    label: b.label,
    value: UP.filter((u) => {
      if (u.event !== "app_open") return false;
      const t = new Date(u.created_at).getTime();
      return t >= b.start && t < b.end;
    }).length,
  }));

  const partnerById = new Map(partners.map((p) => [p.id, p]));
  const sourceCounts = new Map<string, number>();
  for (const p of cohort) {
    const src = p.partner_id
      ? `Partner: ${partnerById.get(p.partner_id)?.name ?? "unknown"}`
      : p.source_post
        ? `Blog: ${p.source_post.replace(/-/g, " ")}`
        : "Came straight to the site";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }

  const foodCounts = new Map<string, number>();
  for (const m of periodChecks) {
    for (const name of displayLabel(m.label).split(", ")) {
      if (name) foodCounts.set(name, (foodCounts.get(name) ?? 0) + 1);
    }
  }

  const usageRows = Object.keys(USAGE_LABEL).map((ev) => {
    const rows = UP.filter((u) => u.event === ev);
    const people = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;
    return {
      label: USAGE_LABEL[ev],
      value: rows.length,
      note: people ? `${people} ${people === 1 ? "person" : "people"}` : undefined,
    };
  });

  // ---- Data a future model learns from -------------------------------------
  // Each read is on its own, so a table that does not exist yet (the migration
  // has not been pasted into Supabase) reads as "waiting", not a broken page.
  const [impressionsAll, withDetailAll, weightsAll, beforeMealAll, hba1cAll, medTypes] =
    await Promise.all([
      fetchAll<{ user_id: string; action: string; created_at: string }>(() =>
        admin.from("meal_impressions").select("user_id,action,created_at"),
      ),
      fetchAll<{ user_id: string; checked_at: string }>(() =>
        admin.from("meal_checks").select("user_id,checked_at").not("food_ids", "is", null),
      ),
      fetchAll<{ user_id: string; recorded_at: string }>(() =>
        admin.from("weight_history").select("user_id,recorded_at"),
      ),
      fetchAll<{ user_id: string; taken_at: string }>(() =>
        admin.from("glucose_readings").select("user_id,taken_at").eq("context", "before_meal"),
      ),
      fetchAll<{ user_id: string; created_at: string }>(() =>
        admin.from("hba1c_results").select("user_id,created_at"),
      ),
      fetchAll<{ id: string }>(() =>
        admin.from("profiles").select("id").not("med_types", "is", null),
      ),
    ]);
  // The period filter, applied here rather than in each query.
  const within = <T,>(res: { rows: T[]; ok: boolean }, at: (r: T) => string) => ({
    ok: res.ok,
    rows: res.rows.filter((r) => inPeriod(at(r), period)),
  });
  const impressions = within(impressionsAll, (r) => r.created_at);
  const withDetail = within(withDetailAll, (r) => r.checked_at);
  const weights = within(weightsAll, (r) => r.recorded_at);
  const beforeMeal = within(beforeMealAll, (r) => r.taken_at);
  const hba1c = within(hba1cAll, (r) => r.created_at);
  const dataReady = impressions.ok;
  const imp = impressions.rows.filter((r) => real(r.user_id));
  const impCount = (a: string) => imp.filter((r) => r.action === a).length;
  const shown = impCount("shown");
  const eaten = impCount("eaten");
  const realCount = (rows: { user_id?: string; id?: string }[]) =>
    rows.filter((r) => real(r.user_id ?? r.id)).length;
  const waiting = "waiting for the database update";

  const recent = [...P]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const exportData: ExportData = {
    range: period.label,
    stats: [
      { label: `Sign-ups (${period.label.toLowerCase()})`, value: all.signupsInRange.toLocaleString() },
      { label: "Sign-ups (all time)", value: all.signups.toLocaleString() },
      { label: "Trials started", value: all.trialsStarted.toLocaleString() },
      { label: "Trial to paid", value: `${all.conversion}%` },
      { label: "Paying now", value: all.activeSubs.toLocaleString() },
      { label: "Monthly value of paying subs", value: naira(all.monthly) },
      { label: `Revenue (${period.label.toLowerCase()})`, value: naira(all.revenueInRange) },
      { label: "Revenue (all time)", value: naira(all.revenue) },
      { label: "Churn (all time)", value: `${all.churnRate}%` },
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

  const periodQuery = `?${new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"),
  )}`;

  const th = "px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50";
  const td = "px-5 py-3 text-ink-soft";

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`${period.label}. Test and demo accounts are left out.`}
      actions={<ExportButton data={exportData} />}
    >
      <PeriodPicker period={period} basePath="/admin" />

      <AdminJump
        items={[
          { id: "money", label: "Money" },
          { id: "growth", label: "Growth" },
          { id: "usage", label: "How they use it" },
          { id: "comeback", label: "Do they come back?" },
          { id: "sugar", label: "Sugar tests" },
          { id: "data", label: "Data for AI" },
          { id: "people", label: "People" },
        ]}
      />

      <div className="mt-6">
        <AdminHero
          items={[
            { label: "Sign-ups", value: all.signupsInRange.toLocaleString(), sub: `${all.signups.toLocaleString()} all time` },
            { label: "On free trial now", value: activeTrials.toLocaleString(), sub: `${all.trialsStarted} started ever` },
            { label: "Paying now", value: all.activeSubs.toLocaleString(), sub: `${naira(all.monthly)} a month` },
            { label: "Trial to paid", value: all.trialsStarted ? `${all.conversion}%` : "—", sub: `${all.everSubscribed} have paid` },
            { label: "Revenue", value: naira(all.revenueInRange), sub: `${naira(all.revenue)} all time` },
          ]}
        />
      </div>

      <AdminSection id="money" title="Money" sub={`${period.label}. The full picture is on Finance.`}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AdminTile icon={TrendingUp} tone="blue" label="Revenue" value={nairaExact(money.revenue)} sub={`${money.payments} payment${money.payments === 1 ? "" : "s"}`} />
          <AdminTile icon={Wallet} tone="amber" label="Expenses" value={nairaExact(money.totalExpenses)} sub="including fees and commissions" />
          <AdminTile
            icon={money.net >= 0 ? TrendingUp : TrendingDown}
            tone={money.net >= 0 ? "green" : "red"}
            label={money.net >= 0 ? "Profit" : "Loss"}
            value={nairaExact(money.net)}
            sub={money.netMargin === null ? "no revenue to measure against" : `${shareLabel(money.netMargin)} net margin`}
          />
          <AdminTile icon={Repeat} tone="green" label="Monthly recurring" value={naira(all.monthly)} sub={`${all.activeSubs} paying now`} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { href: `/admin/finance${periodQuery}`, title: "Finance", sub: "Profit and loss, growth, margins, investor numbers" },
            { href: `/admin/finance/expenses${periodQuery}`, title: "Expenses", sub: "Record and review what was spent" },
            { href: `/admin/finance/loans${periodQuery}`, title: "Founder loans", sub: "What Omole and Favour have put in" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group rounded-2xl border border-[#e3e9f1] bg-white px-4 py-3.5 transition-colors hover:border-brand/40"
            >
              <span className="flex items-center justify-between font-display text-sm font-bold text-ink group-hover:text-brand">
                {l.title} <span aria-hidden>&rarr;</span>
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">{l.sub}</span>
            </a>
          ))}
        </div>
      </AdminSection>

      <AdminSection id="growth" title="Growth" sub="New people, and where they came from">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <AdminCard title="New sign-ups" sub={period.label}>
            <DailyBars points={signupsByDay} unit="sign-ups" />
          </AdminCard>
          <AdminCard title="Who signed up" sub={period.label}>
            <BarList
              rows={byType
                .filter((m) => m.group !== "all")
                .map((m) => ({ label: groupLabel(m.group), value: m.signupsInRange }))}
              empty="Nobody signed up in this period."
            />
          </AdminCard>
        </div>
        <div className="mt-4">
          <AdminCard title="Where they came from" sub={`People who signed up in ${period.label}`}>
            <BarList
              rows={[...sourceCounts].map(([label, value]) => ({ label, value }))}
              empty="Nobody signed up in this period."
            />
          </AdminCard>
        </div>
      </AdminSection>

      <AdminSection id="usage" title="How they use the app" sub={period.label}>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <AdminCard title="App opens" sub="At most one per person every 30 minutes">
            <DailyBars points={opensByDay} unit="opens" />
          </AdminCard>
          <AdminCard title="Most eaten foods" sub="From meals people logged as eaten">
            <BarList
              rows={[...foodCounts].map(([label, value]) => ({ label, value }))}
              empty="No meals logged in this period."
            />
          </AdminCard>
        </div>
        <div className="mt-4">
          <AdminCard title="What people tapped">
            <BarList rows={usageRows} max={10} empty="No taps in this period." />
          </AdminCard>
        </div>
      </AdminSection>

      <AdminSection id="comeback" title="Do they come back?" sub={`People who signed up in ${period.label}`}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AdminTile label="Back the next day" value={pct(d1.came, d1.eligible)} sub={`${d1.came} of ${d1.eligible} people`} />
          <AdminTile label="Back after a week" value={pct(d7.came, d7.eligible)} sub={`${d7.came} of ${d7.eligible} people`} />
          <AdminTile label="Back after a month" value={pct(d30.came, d30.eligible)} sub={`${d30.came} of ${d30.eligible} people`} />
          <AdminTile
            label="Opens per active day"
            value={openDays.size ? (openCount / openDays.size).toFixed(1) : "—"}
            sub={`${openCount.toLocaleString()} opens`}
          />
        </div>
      </AdminSection>

      <AdminSection id="sugar" title="Sugar tests" sub={period.label}>
        <p className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white">
          {readingVerdict(healthAll)}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminTile label="Enough tests for the app to speak" value={healthAll.ready.toLocaleString()} sub="people, all time" />
          <AdminTile label="People saving tests" value={health.people.toLocaleString()} sub={`${health.total} tests · ${healthAll.total} all time`} />
          <AdminTile label="Saved more than one" value={health.repeat.toLocaleString()} sub="people" />
          <AdminTile
            label="Logged meals with a test"
            value={pct(mealsWithTest, periodChecks.length)}
            sub={`${mealsWithTest} of ${periodChecks.length} meals`}
          />
        </div>
      </AdminSection>

      <AdminSection
        id="data"
        title="Data for AI"
        sub="What a future model would learn from. Collected since the data update."
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AdminTile label="Suggested plates seen" value={dataReady ? shown.toLocaleString() : "—"} sub={dataReady ? `${impCount("skipped")} skipped · ${impCount("details")} opened` : waiting} />
          <AdminTile label="Suggested plates eaten" value={dataReady ? eaten.toLocaleString() : "—"} sub={dataReady ? `${pct(eaten, shown)} of plates seen` : waiting} />
          <AdminTile label="Meals with foods and sizes" value={withDetail.ok ? realCount(withDetail.rows).toLocaleString() : "—"} sub={withDetail.ok ? `of ${periodChecks.length} meals logged` : waiting} />
          <AdminTile label="Tests before a meal" value={beforeMeal.ok ? realCount(beforeMeal.rows).toLocaleString() : "—"} sub={beforeMeal.ok ? "pairs with the test after" : waiting} />
          <AdminTile label="Weights recorded" value={weights.ok ? realCount(weights.rows).toLocaleString() : "—"} sub={weights.ok ? "each change is kept" : waiting} />
          <AdminTile label="3-month sugar tests" value={hba1c.ok ? realCount(hba1c.rows).toLocaleString() : "—"} sub={hba1c.ok ? "HbA1c results saved" : waiting} />
          <AdminTile label="Named their medicine" value={medTypes.ok ? realCount(medTypes.rows).toLocaleString() : "—"} sub={medTypes.ok ? "people, all time" : waiting} />
        </div>
      </AdminSection>

      <AdminSection id="people" title="People">
        <AdminCard
          title="Newest sign-ups"
          link={{ href: "/admin/users", label: `See all ${all.signups.toLocaleString()}` }}
          flush
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-[#e3e9f1] bg-[#f8fafc]">
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Email</th>
                  <th className={th}>Who</th>
                  <th className={th}>Joined</th>
                  <th className={th}>Trial</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-b border-[#eef2f7] last:border-0">
                    <td className="px-5 py-3 text-ink">{p.name || "—"}</td>
                    <td className={td}>{p.email}</td>
                    <td className={td}>{typeLabel(p.user_type)}</td>
                    <td className={td}>{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
                    <td className={td}>{p.trial_start ? "Started" : "—"}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-ink-soft" colSpan={5}>No sign-ups yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </AdminSection>
    </AdminShell>
  );
}
