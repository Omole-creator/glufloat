import { createAdminClient } from "@/lib/supabase/server";
import type { Partner } from "@/lib/partners";
import { inPeriod, type Period } from "@/lib/period";

/**
 * The numbers behind the Partner Dashboard. Server-only (service-role key).
 *
 * Clicks, sign-ups, trials and earnings are counted inside whatever period you
 * chose, so you can open June 2027 and see what June 2027 actually did.
 *
 * Two figures deliberately IGNORE the period, and it matters:
 *
 *   "Owed now" is money you still owe somebody. It is owed whatever month you
 *   happen to be looking at. Filtering it by date would show less than the truth,
 *   which is an excellent way to underpay a nurse by accident.
 *
 *   "Paying right now" is a fact about today, not about the window.
 */

export type PartnerRow = {
  partner: Partner;
  clicks: number;
  signups: number;      // accounts created from their link
  trials: number;       // of those, how many started the free trial
  activeSubs: number;   // of those, how many are paying right now
  earned: number;       // kobo earned in the period
  pending: number;      // kobo owed right now (NOT period-filtered)
  paidOut: number;      // kobo already paid (NOT period-filtered)
};

export type ReferredUser = {
  name: string;
  email: string;
  status: "trial" | "paying" | "expired" | "signed up";
  joined: string;
  earnedForPartner: number; // kobo, all time
};

export type PayoutRow = {
  id: string;
  amount: number;
  count: number;
  paid_at: string;
};

export async function getPartnerStats(period: Period): Promise<{
  rows: PartnerRow[];
  totals: Omit<PartnerRow, "partner">;
}> {
  const admin = createAdminClient();

  const [{ data: partners }, { data: clicks }, { data: profiles }, { data: subs }, { data: comms }] =
    await Promise.all([
      admin.from("partners").select("*").order("seq", { ascending: true }),
      admin.from("referral_clicks").select("partner_id,created_at"),
      admin.from("profiles").select("id,partner_id,trial_start,created_at"),
      admin.from("subscriptions").select("user_id,status,current_period_end"),
      admin.from("commissions").select("partner_id,amount,status,earned_at"),
    ]);

  const now = Date.now();
  const paying = new Set(
    (subs ?? [])
      .filter(
        (s) =>
          (s.status === "active" || s.status === "non-renewing") &&
          s.current_period_end &&
          new Date(s.current_period_end).getTime() > now,
      )
      .map((s) => s.user_id),
  );

  const rows: PartnerRow[] = (partners ?? []).map((p) => {
    const mine = (profiles ?? []).filter((x) => x.partner_id === p.id);
    const inWindow = mine.filter((x) => inPeriod(x.created_at, period));

    return {
      partner: p as Partner,
      clicks: (clicks ?? []).filter(
        (c) => c.partner_id === p.id && inPeriod(c.created_at, period),
      ).length,
      signups: inWindow.length,
      trials: inWindow.filter((x) => x.trial_start).length,
      // "Paying right now" is a fact about today, so it is not filtered by when
      // they signed up: it counts every referred user currently paying.
      activeSubs: mine.filter((x) => paying.has(x.id)).length,
      earned: (comms ?? [])
        .filter((c) => c.partner_id === p.id && inPeriod(c.earned_at, period))
        .reduce((n, c) => n + c.amount, 0),
      pending: (comms ?? [])
        .filter((c) => c.partner_id === p.id && c.status === "pending")
        .reduce((n, c) => n + c.amount, 0),
      paidOut: (comms ?? [])
        .filter((c) => c.partner_id === p.id && c.status === "paid")
        .reduce((n, c) => n + c.amount, 0),
    };
  });

  const totals = rows.reduce(
    (t, r) => ({
      clicks: t.clicks + r.clicks,
      signups: t.signups + r.signups,
      trials: t.trials + r.trials,
      activeSubs: t.activeSubs + r.activeSubs,
      earned: t.earned + r.earned,
      pending: t.pending + r.pending,
      paidOut: t.paidOut + r.paidOut,
    }),
    { clicks: 0, signups: 0, trials: 0, activeSubs: 0, earned: 0, pending: 0, paidOut: 0 },
  );

  return { rows, totals };
}

/** The people one partner brought in, and what each has earned them. */
export async function getReferredUsers(partnerId: string): Promise<ReferredUser[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,name,email,trial_start,created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (!profiles?.length) return [];

  const ids = profiles.map((p) => p.id);
  const [{ data: subs }, { data: comms }] = await Promise.all([
    admin.from("subscriptions").select("user_id,status,current_period_end").in("user_id", ids),
    admin.from("commissions").select("user_id,amount").eq("partner_id", partnerId),
  ]);

  const now = Date.now();
  const subOf = new Map((subs ?? []).map((s) => [s.user_id, s]));
  const earnedOf = new Map<string, number>();
  for (const c of comms ?? []) {
    if (!c.user_id) continue;
    earnedOf.set(c.user_id, (earnedOf.get(c.user_id) ?? 0) + c.amount);
  }

  const TRIAL_DAYS = 3;
  const DAY = 24 * 60 * 60 * 1000;

  return profiles.map((p) => {
    const s = subOf.get(p.id);
    const isPaying =
      s &&
      (s.status === "active" || s.status === "non-renewing") &&
      s.current_period_end &&
      new Date(s.current_period_end).getTime() > now;

    let status: ReferredUser["status"] = "signed up";
    if (isPaying) status = "paying";
    else if (p.trial_start) {
      const daysIn = Math.floor((now - new Date(p.trial_start).getTime()) / DAY);
      status = daysIn < TRIAL_DAYS ? "trial" : "expired";
    }

    return {
      name: p.name || "(no name)",
      email: p.email,
      status,
      joined: p.created_at,
      earnedForPartner: earnedOf.get(p.id) ?? 0,
    };
  });
}

/** Every payout you have made to one partner. */
export async function getPayouts(partnerId: string): Promise<PayoutRow[]> {
  const { data } = await createAdminClient()
    .from("payouts")
    .select("id,amount,count,paid_at")
    .eq("partner_id", partnerId)
    .order("paid_at", { ascending: false });
  return (data ?? []) as PayoutRow[];
}
