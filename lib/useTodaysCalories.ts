"use client";

import { useCallback, useEffect, useState } from "react";
import { caloriesEatenToday, INTAKE_CHANGED } from "@/lib/history";
import { readPersonalizationProfile, PERSONALIZATION_CHANGED } from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget } from "@/lib/tdee";
import { suggestExtras, type ExtraSuggestion } from "@/lib/nextMeal";
import { currentMeal, localDayKey } from "@/lib/mealtime";

export interface TodaysCalories {
  target: number | null;
  remaining: number | null;
  extra: ExtraSuggestion | null;
}

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
 * and a 60-second clock tick — the last one is what lets `extra` fall back to
 * `null` at the breakfast/lunch → dinner boundary without needing a reload or
 * a fresh log/save event (extras are never offered at dinner).
 */
export function useTodaysCalories(show: boolean): TodaysCalories {
  const [target, setTarget] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [extra, setExtra] = useState<ExtraSuggestion | null>(null);

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
    const left = Math.max(0, dailyTarget - eatenToday);
    setTarget(dailyTarget);
    setRemaining(left);
    setExtra(currentMeal() === "dinner" ? null : suggestExtras(left, localDayKey()));
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
