"use client";

import { useCallback, useEffect, useState } from "react";
import { caloriesEatenToday, INTAKE_CHANGED } from "@/lib/history";
import { readPersonalizationProfile, PERSONALIZATION_CHANGED } from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget } from "@/lib/tdee";
import { suggestExtras, type ExtraSuggestionSet } from "@/lib/nextMeal";
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
 * Now that calorieTarget() (lib/tdee.ts) caps the daily target at what real
 * food can actually supply, and planForDay biases each meal's pick toward
 * the top of its band (lib/nextMeal.ts), a real end-of-day leftover should
 * typically be small rotation-variance dust rather than the old
 * hundreds-of-kcal structural gap — this floor was widened slightly (from
 * 150) to comfortably absorb that ordinary variance.
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
 * gave them, which reads as broken. Dinner now gets its own set of options
 * too, so there is one more real chance to close the gap with actual food.
 *
 * **Once dinner is under way, a small leftover reads as zero.** Nothing more
 * will be suggested after dinner's own options, so once the true gap drops
 * under `DAY_END_FLOOR`, the number shown is 0 rather than a small,
 * unactionable leftover. `dailyTarget` (from `calorieTarget()`, lib/tdee.ts)
 * is now capped at `MEAL_PLANNING_CALORIE_CEILING`, so even a very active or
 * muscle-building person's target is always achievable by real food — the
 * gap this floor absorbs should be ordinary rotation dust, not a genuinely
 * unclosable structural shortfall. See lib/tdee.ts and CLAUDE.md.
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
    setTarget(dailyTarget);
    setRemaining(meal === "dinner" && trueLeft < DAY_END_FLOOR ? 0 : trueLeft);
    setExtra(suggestExtras(trueLeft, localDayKey(), meal));
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
