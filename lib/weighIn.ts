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
import { forget, shared, WEIGHT } from "@/lib/readCache";
import { readPersonalizationProfile, savePersonalizationProfile } from "@/lib/personalizationProfile";
import { bmi } from "@/lib/tdee";
import { weightFlag, weightGoal, type WeightFlag } from "@/lib/weightTrend";

export const WEIGH_IN_EVERY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** When this person last saved a weight, or null if never (or not readable). */
export function lastWeighIn(): Promise<string | null> {
  return shared(`${WEIGHT}last`, lastWeighInFresh);
}

async function lastWeighInFresh(): Promise<string | null> {
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
      forget(WEIGHT);
    } catch {
      /* the profile saved; history is best effort */
    }
  }
  return true;
}

/**
 * The weight flag for this person, or null (lib/weightTrend.ts). Read for the
 * doctor's report and the Premium dietitian chat. Any failure reads as no flag.
 */
export function currentWeightFlag(): Promise<WeightFlag | null> {
  return shared(`${WEIGHT}flag`, currentWeightFlagFresh);
}

async function currentWeightFlagFresh(): Promise<WeightFlag | null> {
  try {
    const since = new Date(Date.now() - 120 * DAY_MS).toISOString();
    const [{ data, error }, p] = await Promise.all([
      createClient()
        .from("weight_history")
        .select("weight_kg,recorded_at")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true }),
      readPersonalizationProfile(),
    ]);
    if (error || !data) return null;
    const points = data.map((r) => ({ kg: Number(r.weight_kg), at: r.recorded_at as string }));
    const b = p.weightKg && p.heightCm ? bmi(p.weightKg, p.heightCm) : null;
    return weightFlag(points, weightGoal(p.goals, b));
  } catch {
    return null;
  }
}

/**
 * Every weight this person has saved, oldest first, for the weight graph on
 * their report and its PDF (components/WeightTrend.tsx, founder 2026-10-17).
 * The newest 60, the same cap a clinician's page reads. Any failure reads as none.
 */
export function weightHistory(): Promise<{ kg: number; at: string }[]> {
  return shared(`${WEIGHT}history`, weightHistoryFresh);
}

async function weightHistoryFresh(): Promise<{ kg: number; at: string }[]> {
  try {
    const { data, error } = await createClient()
      .from("weight_history")
      .select("weight_kg,recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(60);
    if (error || !data) return [];
    return data.map((r) => ({ kg: Number(r.weight_kg), at: r.recorded_at as string })).reverse();
  } catch {
    return [];
  }
}
