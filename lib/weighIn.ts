"use client";

/**
 * The monthly weigh-in (founder, 2026-10-11). Weight is what the daily calorie
 * target is worked out from (lib/tdee.ts clinicalTarget), so a weight from
 * months ago quietly gives the wrong target. Once a month the Today tab asks
 * for a fresh one (components/WeighInReminder.tsx). Saving it updates the
 * profile, so every target in the app follows at once, and it is kept in
 * weight_history even when the number has not changed: "weighed, same as
 * last month" is a real result a doctor wants to see.
 */
import { createClient } from "@/lib/supabase/client";
import { readPersonalizationProfile, savePersonalizationProfile } from "@/lib/personalizationProfile";

export const WEIGH_IN_EVERY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** When this person last saved a weight, or null if never (or not readable). */
export async function lastWeighIn(): Promise<string | null> {
  try {
    const { data, error } = await createClient()
      .from("weight_history")
      .select("recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    return data[0].recorded_at as string;
  } catch {
    return null;
  }
}

/** True when the last weigh-in is WEIGH_IN_EVERY_DAYS old or older. */
export function weighInDue(lastIso: string | null, now = Date.now()): boolean {
  if (!lastIso) return false;
  return now - new Date(lastIso).getTime() >= WEIGH_IN_EVERY_DAYS * DAY_MS;
}

/** Save today's weight. Updates the profile (and so the target) and the history. */
export async function saveWeighIn(weightKg: number): Promise<boolean> {
  const p = await readPersonalizationProfile();
  const same = p.weightKg === weightKg;
  const ok = await savePersonalizationProfile({ ...p, weightKg });
  if (!ok) return false;
  // savePersonalizationProfile only records a CHANGED weight. A weigh-in that
  // came out the same is still a weigh-in.
  if (same) {
    try {
      await createClient().from("weight_history").insert({ weight_kg: weightKg });
    } catch {
      /* the profile saved; history is best effort */
    }
  }
  return true;
}
