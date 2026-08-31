"use client";

import { useCallback, useEffect, useState } from "react";
import { caloriesEatenToday, INTAKE_CHANGED } from "@/lib/history";
import { readPersonalizationProfile, PERSONALIZATION_CHANGED } from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget, remainingMealCalorieTarget } from "@/lib/tdee";
import { suggestExtras, MEAL_MAX_CALORIES, type ExtraSuggestionSet } from "@/lib/nextMeal";
import { currentMeal, localDayKey } from "@/lib/mealtime";

export interface TodaysCalories {
  target: number | null;
  remaining: number | null;
  extra: ExtraSuggestionSet | null;
}

/**
 * How small a leftover has to be, once dinner is under way, before it is not
 * worth showing at all. Dinner is the last meal of the day, and its own
 * extras (see below) are the last suggestion the app will ever make for
 * today — leaving a small number like "40 kcal remaining" on screen after
 * that would read as unfinished business when nothing more is coming.
 *
 * `calorieTarget()` (lib/tdee.ts) is never capped — a genuinely high target
 * (very active, or building muscle) is supplied by `suggestExtras()` sizing
 * a real, right-sized LIST of extra food for each meal, not by asking for
 * less than the person actually needs. A real end-of-day leftover under this
 * floor should be small rotation dust — the last, sub-100kcal sliver
 * `suggestExtras` itself declines to bother with — not a large unclosed gap;
 * widened slightly (from 150) to comfortably absorb that ordinary dust.
 */
const DAY_END_FLOOR = 200;

/**
 * The one place "today's calorie target," "calories remaining," and "which
 * extras to suggest" are computed — shared by `DashboardSnapshot` (the tile)
 * and `TodaysExtras` (the green card) so the two can never disagree, even
 * though each holds its own copy of this state (a plain, cheap
 * recomputation from the same source data each time, not shared mutable
 * state — there is nothing to get out of sync).
 *
 * `null` for everything until `show` is true and sex/age/weight/height/
 * activity are all set. Refreshes on `INTAKE_CHANGED`, `PERSONALIZATION_CHANGED`,
 * and a 60-second clock tick.
 *
 * **Extras now show at all three meals, dinner included.** They used to stop
 * at lunch, on the idea that the day's target would already be met by then —
 * but for a lot of real targets it was not, and "calories remaining today"
 * could sit at 500kcal even after the person had eaten everything the app
 * gave them, which reads as broken. Dinner now gets its own set too, so
 * there is one more real chance to close the gap with actual food.
 *
 * **The extras suggested at THIS meal are sized to THIS meal's own fair
 * share of the day, not the whole day's remaining gap** (fixed 2026-08-31 —
 * founder instruction: "all recommended meals must add up at the end of the
 * day to meet each user calorie goals"). Passing the whole-day `trueLeft`
 * into `suggestExtras` at breakfast used to try to close the ENTIRE day's
 * gap before lunch even happened, front-loading everything into the first
 * meal instead of spreading it out. `mealShare` (via
 * `remainingMealCalorieTarget`, the same weighted split `TodaysMeal.tsx`
 * uses to size the main plate) is this meal's own slice of the target; the
 * extras gap is what's left of THAT slice once the main plate's own real
 * ceiling (`MEAL_MAX_CALORIES[meal]`) is assumed eaten. Because `mealShare`
 * is recalculated from the REAL `eatenToday` every time this runs, any
 * meal that actually fell short of its assumed ceiling is automatically
 * compensated for by the next meal's larger share — the same
 * self-correcting design `remainingMealCalorieTarget` already had.
 *
 * **Once dinner is under way, a small leftover reads as zero.** Nothing more
 * will be suggested once the true gap drops under `DAY_END_FLOOR`, the
 * number shown is 0 rather than a small, unactionable leftover. `dailyTarget`
 * (from `calorieTarget()`, lib/tdee.ts) is NEVER capped — the day's 3
 * recommended meals, each already sized with however many extras it takes
 * to hit its own fair share, are what makes a genuinely high target fully
 * closeable, not a smaller, capped promise. See lib/tdee.ts and CLAUDE.md.
 */
export function useTodaysCalories(show: boolean): TodaysCalories {
  const [target, setTarget] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [extra, setExtra] = useState<ExtraSuggestionSet | null>(null);

  const refresh = useCallback(async () => {
    if (!show) {
      setTarget(null);
      setRemaining(null);
      setExtra(null);
      return;
    }
    const p = await readPersonalizationProfile();
    if (!p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel) {
      setTarget(null);
      setRemaining(null);
      setExtra(null);
      return;
    }
    const dailyTarget = calorieTarget(
      tdee(bmr(p.sex, p.weightKg, p.heightCm, p.ageYears), p.activityLevel),
      p.goals,
    );
    const eatenToday = await caloriesEatenToday();
    const trueLeft = Math.max(0, dailyTarget - eatenToday);
    const meal = currentMeal();
    const mealShare = remainingMealCalorieTarget(dailyTarget, eatenToday, p.mealPattern, meal, MEAL_MAX_CALORIES);
    const extrasGap = Math.max(0, mealShare - (MEAL_MAX_CALORIES[meal] ?? 0));
    setTarget(dailyTarget);
    setRemaining(meal === "dinner" && trueLeft < DAY_END_FLOOR ? 0 : trueLeft);
    setExtra(suggestExtras(extrasGap, localDayKey(), meal));
  }, [show]);

  useEffect(() => {
    refresh();
    window.addEventListener(INTAKE_CHANGED, refresh);
    window.addEventListener(PERSONALIZATION_CHANGED, refresh);
    const id = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(INTAKE_CHANGED, refresh);
      window.removeEventListener(PERSONALIZATION_CHANGED, refresh);
      clearInterval(id);
    };
  }, [refresh]);

  return { target, remaining, extra };
}
