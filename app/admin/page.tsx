import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const naira = (kobo: number) => "N" + Math.round(kobo / 100).toLocaleString();

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

export default async function AdminPage() {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <AdminLogin />;

  const admin = createAdminClient();
  const [{ data: profiles }, { data: subs }, { data: payments }] = await Promise.all([
    admin.from("profiles").select("email,name,trial_start,created_at"),
    admin.from("subscriptions").select("user_id,status,current_period_end,amount"),
    admin.from("payments").select("email,amount,status,paid_at"),
  ]);

  const now = Date.now();
  const P = profiles ?? [];
  const S = subs ?? [];
  const Y = payments ?? [];

  const signups = P.length;
  const trialsStarted = P.filter((p) => p.trial_start).length;
  const activeTrials = P.filter(
    (p) => p.trial_start && (now - new Date(p.trial_start).getTime()) / DAY_MS < 3,
  ).length;
  const isLive = (s: (typeof S)[number]) =>
    (s.status === "active" || s.status === "non-renewing") &&
    s.current_period_end &&
    new Date(s.current_period_end).getTime() > now;
  const activeSubs = S.filter(isLive).length;
  const everSubscribed = S.length;
  const churned = everSubscribed - activeSubs;
  const conversion = trialsStarted
    ? Math.round((everSubscribed / trialsStarted) * 100)
    : 0;
  const churnRate = everSubscribed
    ? Math.round((churned / everSubscribed) * 100)
    : 0;
  const revenue = Y.filter((p) => p.status === "success").reduce(
    (n, p) => n + (p.amount || 0),
    0,
  );
  const mrr = activeSubs * 150000; // N1,500 in kobo

  const recent = [...P]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 12);

  return (
    <main className="min-h-screen bg-mist px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-2xl font-bold text-ink">
          Glufloat — the numbers
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Live from your database. Revenue and subscriptions update as Paystack
          reports payments.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Signups" value={signups.toLocaleString()} sub="total accounts" />
          <Tile label="Active trials" value={activeTrials.toLocaleString()} sub={`${trialsStarted} started ever`} />
          <Tile label="Trial → paid" value={`${conversion}%`} sub={`${everSubscribed} converted`} />
          <Tile label="Active subscribers" value={activeSubs.toLocaleString()} />
          <Tile label="MRR" value={naira(mrr)} sub="active subs × N1,500" />
          <Tile label="Total revenue" value={naira(revenue)} sub="all successful payments" />
          <Tile label="Churn" value={`${churnRate}%`} sub={`${churned} lapsed`} />
          <Tile label="Paying now" value={activeSubs.toLocaleString()} sub="live subscriptions" />
        </div>

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
                  <td className="px-4 py-3 text-ink">{p.name || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.email}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
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
