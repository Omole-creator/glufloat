"use client";

import { createClient } from "@/lib/supabase/client";
import type { NamedMeal } from "./mealtime";

/**
 * What the blue "Today's meal" card offered, and what the person did with it
 * (meal_impressions, supabase/data-collection-schema.sql).
 *
 *   shown    the plate was on screen
 *   skipped  they pressed "Try another meal"
 *   details  they pressed "View details" (the plate opened in the builder)
 *   eaten    they then logged that same plate with "I ate this meal"
 *
 * This is the record a recommender learns from. It is write-only and
 * fire-and-forget: a failed insert (no migration yet, offline) must never
 * touch what the person sees.
 */

export type ImpressionAction = "shown" | "skipped" | "details" | "eaten";

export interface ImpressionPlate {
  meal: NamedMeal;
  dayKey: string;
  plateIndex: number;
  foodIds: string[];
  calorieTarget?: number | null;
}

const SHOWN_KEY = "gf_impression_shown";

/**
 * "shown" is written once per plate per day. The card re-plans on a 60-second
 * clock and on every profile change, and without this a phone left open would
 * write a row a minute for the same plate.
 */
function alreadyShown(p: ImpressionPlate): boolean {
  const key = `${p.dayKey}|${p.meal}|${p.plateIndex}`;
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "[]");
    if (seen.includes(key)) return true;
    // Only today's keys are worth keeping.
    const kept = seen.filter((k) => k.startsWith(p.dayKey + "|"));
    localStorage.setItem(SHOWN_KEY, JSON.stringify([...kept, key]));
  } catch {
    /* storage blocked: record anyway, slightly high beats nothing */
  }
  return false;
}

export function logImpression(p: ImpressionPlate, action: ImpressionAction): void {
  if (action === "shown" && alreadyShown(p)) return;
  void (async () => {
    try {
      await createClient()
        .from("meal_impressions")
        .insert({
          meal: p.meal,
          day_key: p.dayKey,
          plate_index: p.plateIndex,
          food_ids: p.foodIds,
          action,
          calorie_target:
            p.calorieTarget != null && Number.isFinite(p.calorieTarget)
              ? Math.round(p.calorieTarget)
              : null,
        });
    } catch {
      /* never break the app over an analytics write */
    }
  })();
}

/**
 * The plate last handed to the builder by "View details", with any serving the
 * blue card scaled up (food id → grams). The builder reads it when the person
 * logs the meal, so an "eaten" row can be tied back to the suggestion, and the
 * scaled size can be saved instead of "normal".
 *
 * Module state, not React state: the blue card and the builder are siblings,
 * and this only needs to live for the visit.
 */
let lastSuggested:
  | (ImpressionPlate & { scaledGrams: Record<string, number>; scaledKcal: Record<string, number> })
  | null = null;

export function rememberSuggested(
  p: ImpressionPlate,
  scaledGrams: Record<string, number>,
  scaledKcal: Record<string, number> = {},
): void {
  lastSuggested = { ...p, scaledGrams, scaledKcal };
}

export function suggestedFor(foodIds: string[]) {
  if (!lastSuggested) return null;
  const a = [...lastSuggested.foodIds].sort().join(",");
  const b = [...foodIds].sort().join(",");
  return a === b ? lastSuggested : null;
}
