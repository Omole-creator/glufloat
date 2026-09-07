"use client";

import { useCallback, useEffect, useState } from "react";
import { caloriesEatenToday, loggedFoodCounts, likedFoodCounts, INTAKE_CHANGED } from "@/lib/history";
import { readPersonalizationProfile, personalRotationKey, PERSONALIZATION_CHANGED } from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget, remainingMealCalorieTarget } from "@/lib/tdee";
import { suggestExtras, planForDay, type ExtraSuggestionSet } from "@/lib/nextMeal";
import { currentMeal, localDayKey } from "@/lib/mealtime";
import { biasVector } from "@/lib/personalization";
import { toAvoid } from "@/lib/mealRotationMemory";

export interface TodaysCalories {
  target: number | null;
  remaining: number | null;
  extra: ExtraSuggestionSet | null;
  /**
   * How much of THIS meal's own calorie gap even the best extras variant
   * could not reach, once every safe candidate is already at its own capped
   * maximum (0 when the gap was fully closed, or there was no gap). This is
   * the honest, plain-spoken alternative to silently repeating the same
   * numbers once a person's real calorie need is bigger than the app's real,
   * safe food supply can stretch to in one sitting — see the 2026-09-08 note
   * below. Never used to invent a bigger serving; it only says the truth.
   */
  shortByKcal: number;
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
 * 3 real, independently-complete extra-food variants for each meal (pick
 * any one and eat it), not by asking for less than the person actually
 * needs. A real end-of-day leftover under this floor should be small
 * rotation dust — the last, sub-100kcal sliver `suggestExtras` itself
 * declines to bother with — not a large unclosed gap; widened slightly
 * (from 150) to comfortably absorb that ordinary dust.
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
 * `remainingMealCalorieTarget`) is this meal's own slice of the target — a
 * FLAT 1/3 split (founder instruction, same day: "I want evenly split, not
 * awkward split").
 *
 * **The extras gap is sized against the ACTUAL plate for this meal, not a
 * theoretical ceiling** (fixed 2026-08-31, alongside the extras-card
 * redesign — a real bug: sizing extras against `MEAL_MAX_CALORIES[meal]`,
 * the single largest possible plate, systematically under-suggested extras
 * whenever the plate actually served that day was smaller, which is the
 * common case, leaving the day up to ~100kcal short even though every
 * individual number looked reasonable). `planForDay` is called here the
 * same way it is for display, narrowed to this meal's own share so the
 * resolved plate is realistic for the target, and its REAL calories are
 * what the extras gap is measured against. Because `mealShare` is
 * recalculated from the REAL `eatenToday` every time this runs, any meal
 * that actually fell short is automatically compensated for by the next
 * meal's larger share — the same self-correcting design
 * `remainingMealCalorieTarget` already had.
 *
 * **`planForDay` is called here with the SAME real signals
 * `components/TodaysMeal.tsx` uses to pick the plate it actually shows**
 * (`loggedFoodCounts()`, `likedFoodCounts()`, the goal/activity/condition
 * bias, and `toAvoid()`'s last-shown/skipped plates) — fixed 2026-09-07,
 * a real bug found by re-reading both call sites side by side: this hook
 * used to call `planForDay` with empty counts/liked maps, `bias: null`, and
 * `avoidIndexes: []`, which are only the SAME inputs `TodaysMeal` uses for a
 * brand-new user with no history, no goals, and no flagged conditions. For
 * anyone with real meal history, an active goal/activity bias, or a flagged
 * condition, `planForDay`'s internal sort (`eaten`, which folds in counts,
 * liked, and the bias) landed on a DIFFERENT plate than the one on screen,
 * so "calories remaining today" and the green extras card were silently
 * computed against a plate the person was not actually looking at —
 * defeating the exact "the day's meals must add up to the calorie goal"
 * guarantee this whole file exists to keep. Since both call sites are now
 * pure functions of the same real inputs, they resolve to the same plate in
 * the common case. The one remaining, narrower gap: mid-session "Try
 * another meal" taps advance an ephemeral `offset` that only lives in
 * `TodaysMeal`'s component state and is not shared here, so a reroll can
 * still leave this hook one plate behind until its next refresh (60s clock
 * tick, or an intake/personalization change) — a transient display lag, not
 * a calorie-math error, and not worth the risk of lifting `offset` into
 * shared state for.
 *
 * **Once dinner is under way, a small leftover reads as zero.** Nothing more
 * will be suggested once the true gap drops under `DAY_END_FLOOR`, the
 * number shown is 0 rather than a small, unactionable leftover. `dailyTarget`
 * (from `calorieTarget()`, lib/tdee.ts) is NEVER capped — the day's 3
 * recommended meals, each already sized with however many extras it takes
 * to hit its own fair share, are what makes a genuinely high target fully
 * closeable, not a smaller, capped promise. See lib/tdee.ts and CLAUDE.md.
 *
 * **A real, verified structural ceiling, and `shortByKcal` is the honest
 * response to it (2026-09-08).** A person reported changing their profile
 * from a normal weight to obese and seeing the exact same main meal AND the
 * exact same extras. Traced with real numbers, not assumed: `MEAL_MAX_CALORIES`
 * (the biggest real plate `lib/nextMeal.ts` has for each meal — breakfast
 * 425kcal, lunch 725kcal, dinner 674kcal) is smaller than an ordinary adult's
 * per-meal calorie share long before "obese" enters the picture, so
 * `planForDay`'s "closest plate to target" narrowing degenerates to "the
 * single biggest plate available" for almost anyone once their mealShare
 * exceeds that ceiling — a heavier profile's bigger target does not change
 * WHICH plate looks closest, only how far short it falls. `suggestExtras()`'s
 * 2-item safety cap (`MAX_EXTRA_ITEMS`, a deliberate founder limit — "1-2
 * extras ... not 3, can be overwhelming") then hits its own ceiling too, so
 * two very different targets can produce identical extras as well once both
 * saturate it. Rather than silently repeat the same numbers with no
 * explanation — which is exactly what was reported — `shortByKcal` names the
 * honest leftover once the best extras variant is already maxed out, so the
 * UI can say so plainly instead of pretending the gap was closed. This does
 * NOT invent a bigger serving or loosen the 2-item cap; it only tells the
 * truth about what the real, safe food supply could not stretch to. See
 * CLAUDE.md's "Portion/calorie review" section for the full trace and the
 * two other options (bigger real plates; wider safe-serving ceilings) that
 * were considered and are still open for later.
 */
export function useTodaysCalories(show: boolean): TodaysCalories {
  const [target, setTarget] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [extra, setExtra] = useState<ExtraSuggestionSet | null>(null);
  const [shortByKcal, setShortByKcal] = useState(0);

  const refresh = useCallback(async () => {
    if (!show) {
      setTarget(null);
      setRemaining(null);
      setExtra(null);
      setShortByKcal(0);
      return;
    }
    const p = await readPersonalizationProfile();
    if (!p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel) {
      setTarget(null);
      setRemaining(null);
      setExtra(null);
      setShortByKcal(0);
      return;
    }
    const dailyTarget = calorieTarget(
      tdee(bmr(p.sex, p.weightKg, p.heightCm, p.ageYears), p.activityLevel),
      p.goals,
    );
    const eatenToday = await caloriesEatenToday();
    const trueLeft = Math.max(0, dailyTarget - eatenToday);
    const meal = currentMeal();
    const dayKey = localDayKey();
    const mealShare = remainingMealCalorieTarget(dailyTarget, eatenToday, p.mealPattern, meal);
    const [counts, liked] = await Promise.all([loggedFoodCounts(), likedFoodCounts()]);
    const bias = biasVector({ goals: p.goals, activityLevel: p.activityLevel, conditions: p.conditions });
    const personalKey = personalRotationKey(p);
    const idea = planForDay(
      meal,
      dayKey,
      counts,
      0,
      toAvoid(meal, dayKey),
      liked,
      bias,
      mealShare,
      p.conditions,
      personalKey,
    );
    const plateCal = idea.foods.reduce((s, f) => s + (f.calories ?? 0), 0);
    // A bigger, still-safe protein serving (idea.scaledProtein) closes part
    // of the gap directly within the plate, before extras — see
    // scaleMainProtein()'s own doc in lib/nextMeal.ts. Subtract its real
    // contribution so extras only ever cover what is genuinely still left.
    const proteinExtraKcal = idea.scaledProtein?.extraCalories ?? 0;
    const extrasGap = Math.max(0, mealShare - plateCal - proteinExtraKcal);
    const extras = suggestExtras(extrasGap, dayKey, meal, p.conditions, personalKey);
    // The best any variant reaches — usually variants[0] (sized closest to
    // the gap), but take the max in case a later variant ever does better,
    // so this never overstates a shortfall that a variant already covers.
    const bestVariantKcal = extras
      ? Math.max(...extras.variants.map((v) => v.totalCalories))
      : 0;
    setTarget(dailyTarget);
    setRemaining(meal === "dinner" && trueLeft < DAY_END_FLOOR ? 0 : trueLeft);
    setExtra(extras);
    setShortByKcal(Math.max(0, extrasGap - bestVariantKcal));
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

  return { target, remaining, extra, shortByKcal };
}
