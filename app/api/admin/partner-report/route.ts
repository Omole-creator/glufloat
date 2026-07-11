import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { parsePeriod, inPeriod, MONTH_NAMES } from "@/lib/period";

export const dynamic = "force-dynamic";

/**
 * The data behind a partner's PDF report.
 *
 * THIS IS THE ONLY THING THE PARTNER EVER SEES, so it is built to be safe to
 * hand over. It carries counts and money and nothing else.
 *
 * A partner must NEVER learn who the people they referred are. Those are
 * Glufloat's users, and their health is their own business: even a first name
 * plus a sign-up date, handed to a nurse, says "this person of yours has
 * diabetes". So no name, no email, no join date, no anything that could point at
 * a person leaves this route. The route does not select those columns at all,
 * rather than selecting them and remembering not to send them. You cannot leak a
 * field you never fetched.
 */
export async function GET(request: Request) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No partner given." }, { status: 400 });

  const period = parsePeriod({
    grain: url.searchParams.get("grain") ?? undefined,
    y: url.searchParams.get("y") ?? undefined,
    m: url.searchParams.get("m") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    d: url.searchParams.get("d") ?? undefined,
  });

  const admin = createAdminClient();

  const { data: partner } = await admin
    .from("partners")
    .select("name,profession,code,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!partner) return NextResponse.json({ error: "No such partner." }, { status: 404 });

  const [{ data: clicks }, { data: users }, { data: subs }, { data: comms }, { data: payouts }] =
    await Promise.all([
      admin.from("referral_clicks").select("created_at").eq("partner_id", id),
      // `id` and `trial_start` only. Deliberately NOT name, NOT email.
      admin.from("profiles").select("id,trial_start,created_at").eq("partner_id", id),
      admin.from("subscriptions").select("user_id,status,current_period_end"),
      admin.from("commissions").select("amount,status,earned_at").eq("partner_id", id),
      admin.from("payouts").select("amount,count,paid_at").eq("partner_id", id).order("paid_at", { ascending: false }),
    ]);

  const now = Date.now();
  const mine = new Set((users ?? []).map((u) => u.id));
  const payingCount = (subs ?? []).filter(
    (s) =>
      mine.has(s.user_id) &&
      (s.status === "active" || s.status === "non-renewing") &&
      s.current_period_end &&
      new Date(s.current_period_end).getTime() > now,
  ).length;

  const inWindow = (users ?? []).filter((u) => inPeriod(u.created_at, period));

  /**
   * A month-by-month breakdown inside the window, so a partner can see which
   * weeks or months were good. Counts and money only. It is built from the
   * commission dates, never from anybody's sign-up date.
   */
  const byMonth = new Map<string, { people: number; earned: number }>();
  const key = (iso: string) => {
    const d = new Date(iso);
    return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  };
  for (const u of inWindow) {
    const k = key(u.created_at);
    const row = byMonth.get(k) ?? { people: 0, earned: 0 };
    row.people += 1;
    byMonth.set(k, row);
  }
  for (const cm of comms ?? []) {
    if (!inPeriod(cm.earned_at, period)) continue;
    const k = key(cm.earned_at);
    const row = byMonth.get(k) ?? { people: 0, earned: 0 };
    row.earned += cm.amount;
    byMonth.set(k, row);
  }

  return NextResponse.json({
    partner: {
      name: partner.name,
      profession: partner.profession,
      code: partner.code,
    },
    period: {
      label: period.label,
      grain: period.grain,
    },
    // In the window.
    clicks: (clicks ?? []).filter((x) => inPeriod(x.created_at, period)).length,
    signups: inWindow.length,
    trials: inWindow.filter((u) => u.trial_start).length,
    earned: (comms ?? [])
      .filter((cm) => inPeriod(cm.earned_at, period))
      .reduce((n, cm) => n + cm.amount, 0),
    // Facts about today, not about the window.
    activeSubs: payingCount,
    pending: (comms ?? [])
      .filter((cm) => cm.status === "pending")
      .reduce((n, cm) => n + cm.amount, 0),
    paidOut: (comms ?? [])
      .filter((cm) => cm.status === "paid")
      .reduce((n, cm) => n + cm.amount, 0),
    // All time.
    lifetimeClicks: (clicks ?? []).length,
    lifetimePeople: (users ?? []).length,
    lifetimeEarned: (comms ?? []).reduce((n, cm) => n + cm.amount, 0),
    months: [...byMonth.entries()]
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => new Date("1 " + a.month).getTime() - new Date("1 " + b.month).getTime()),
    payouts: (payouts ?? []).map((p) => ({
      amount: p.amount,
      count: p.count,
      paid_at: p.paid_at,
    })),
  });
}
