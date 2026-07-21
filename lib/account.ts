"use client";

import { createClient } from "@/lib/supabase/client";

// Account-based access (replaces the old localStorage gating). A user's access
// is: an active 3-day trial (profiles.trial_start) OR an active subscription
// (subscriptions, written by the Paystack webhook).

export const TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Access =
  | { status: "anon" } // not signed in
  | { status: "new" } // signed in, never started a trial, no subscription
  | { status: "trial"; daysLeft: number }
  | { status: "subscribed"; daysLeft: number }
  | { status: "expired" }; // trial ended, no active subscription

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

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name,trial_start")
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const name = (profile?.name ?? "").trim() || null;

  // Active subscription wins.
  if (
    sub &&
    (sub.status === "active" || sub.status === "non-renewing") &&
    sub.current_period_end
  ) {
    const end = new Date(sub.current_period_end).getTime();
    const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
    if (daysLeft > 0)
      return {
        email: user.email ?? null,
        name,
        access: { status: "subscribed", daysLeft },
      };
  }

  // Trial.
  if (profile?.trial_start) {
    const daysLeft =
      TRIAL_DAYS -
      calendarDaysBetween(new Date(profile.trial_start).getTime(), Date.now());
    if (daysLeft > 0)
      return { email: user.email ?? null, name, access: { status: "trial", daysLeft } };
    return { email: user.email ?? null, name, access: { status: "expired" } };
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
