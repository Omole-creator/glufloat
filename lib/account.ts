"use client";

import { createClient } from "@/lib/supabase/client";
import { TRIAL_DAYS } from "@/lib/trial";
import type { Tier } from "@/lib/pricing";
export type { Tier };

// Account-based access (replaces the old localStorage gating). A user's access
// is: an active 7-day trial (profiles.trial_start) OR an active subscription
// (subscriptions, written by the Paystack webhook).

// The length itself lives in `lib/trial.ts` (no "use client"), because the
// server screens need it too. Re-exported here so every existing import of
// TRIAL_DAYS from this file keeps working.
export { TRIAL_DAYS };
const DAY_MS = 24 * 60 * 60 * 1000;

export type Access =
  | { status: "anon" } // not signed in
  | { status: "new" } // signed in, never started a trial, no subscription
  // Trial previews Basic + Plus (goal/activity/meal-pattern personalization) —
  // deliberately carries no `tier`, because the ONE thing trial never grants is
  // the dietitian tier. See canUseDietitianChat below.
  | { status: "trial"; daysLeft: number }
  | { status: "subscribed"; daysLeft: number; tier: Tier }
  // Trial ended, no active subscription. `lapsed` means they have paid before, so
  // this is a renewal and not a first sale. The screen has to say "your month is
  // over", never "your free trial is over", to somebody who paid us last month.
  // `previousTier` is whatever they last paid for (null if never), so a renewal
  // offers the SAME tier back rather than silently downgrading a Plus/Dietitian
  // subscriber to Basic pricing.
  | { status: "expired"; lapsed: boolean; previousTier: Tier | null };

/**
 * Can this person use goal/activity/meal-pattern personalization right now?
 * Trial previews it in full (your instruction: everyone tastes Plus for the 7
 * days). Otherwise it needs an active Plus or Dietitian subscription.
 */
export function canUseGoalPersonalization(access: Access): boolean {
  if (access.status === "trial") return true;
  return access.status === "subscribed" && (access.tier === "plus" || access.tier === "dietitian");
}

/**
 * Can this person open the in-house dietitian WhatsApp chat? Deliberately
 * NEVER true during trial, by construction (trial's Access shape carries no
 * tier at all) — this is the one thing that is paid-only with no preview,
 * because it costs real human time. Also enforced server-side in
 * assign_dietitian() (supabase/dietitian-schema.sql): this check is for the UI
 * only, never trusted as the sole gate.
 */
export function canUseDietitianChat(access: Access): boolean {
  return access.status === "subscribed" && access.tier === "dietitian";
}

/** Whole calendar days between two moments in local time (same day = 0). */
function calendarDaysBetween(startMs: number, nowMs: number): number {
  const s = new Date(startMs);
  const n = new Date(nowMs);
  s.setHours(0, 0, 0, 0);
  n.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((n.getTime() - s.getTime()) / DAY_MS));
}

export async function getAccess(): Promise<{
  email: string | null;
  name: string | null;
  access: Access;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { email: null, name: null, access: { status: "anon" } };

  const [{ data: profile }, subResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("name,trial_start")
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status,current_period_end,tier")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // `tier` does not exist until personalization-schema.sql has been run. A
  // push IS a release here, so the code can reach a database that migration
  // has not hit yet — without this fallback, EVERY subscriber (paying or
  // trialing) would read as having no subscription at all until the SQL is
  // run, because the whole select errors on the missing column. Same shape as
  // the meal_checks fallback in lib/history.ts: losing the tier distinction
  // for a few minutes is fine, losing subscription detection is not.
  let sub = subResult.data;
  if (subResult.error) {
    const plain = await supabase
      .from("subscriptions")
      .select("status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    sub = plain.data ? { ...plain.data, tier: "basic" } : null;
  }

  const name = (profile?.name ?? "").trim() || null;

  // Active subscription wins.
  if (
    sub &&
    (sub.status === "active" || sub.status === "non-renewing") &&
    sub.current_period_end
  ) {
    const end = new Date(sub.current_period_end).getTime();
    const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
    const tier: Tier = sub.tier === "plus" || sub.tier === "dietitian" ? sub.tier : "basic";
    if (daysLeft > 0)
      return {
        email: user.email ?? null,
        name,
        access: { status: "subscribed", daysLeft, tier },
      };
  }

  // Trial.
  if (profile?.trial_start) {
    const daysLeft =
      TRIAL_DAYS -
      calendarDaysBetween(new Date(profile.trial_start).getTime(), Date.now());
    if (daysLeft > 0)
      return { email: user.email ?? null, name, access: { status: "trial", daysLeft } };
    // A subscriptions row at all means they have paid us before. It is already
    // fetched above, so knowing this costs no extra query.
    const previousTier: Tier | null =
      sub?.tier === "plus" || sub?.tier === "dietitian" ? sub.tier : sub ? "basic" : null;
    return {
      email: user.email ?? null,
      name,
      access: { status: "expired", lapsed: !!sub, previousTier },
    };
  }

  // Signed in but no trial yet and no subscription.
  return { email: user.email ?? null, name, access: { status: "new" } };
}

/** Stamp the trial start on the user's profile, only if it is not already set. */
export async function startTrial(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("trial_start")
    .eq("id", user.id)
    .single();
  if (profile && !profile.trial_start) {
    await supabase
      .from("profiles")
      .update({ trial_start: new Date().toISOString() })
      .eq("id", user.id);
  }
}

export async function signOut(): Promise<void> {
  await createClient().auth.signOut();
}
