"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ArrowRight, ArrowLeftRight, Sunrise, Sun, Moon, Check, Pill, Flame, Scale, Route, UserRound, Wheat } from "lucide-react";
import FoodIcon from "./FoodIcon";
import {
  currentMeal,
  localDayKey,
  type NamedMeal,
} from "@/lib/mealtime";
import { planForDay, mealShareFor, mealIdeaCalories, mealIdeaCarbs, mealIdeaFoodsForBuilder, ideasFor, isExtraFood, swapInPlate, swappableFoods, type MealIdea, type SwapContext } from "@/lib/nextMeal";
import { withStoredSwap, writeSwap, shownPlateWithSwap } from "@/lib/mealSwapMemory";
import { differentMealBefore, recoveryLine, followUpLine } from "@/lib/mealRecovery";
import { getFood } from "@/lib/search";
import { cleanFoodName } from "@/lib/foodName";
import { practiceRules } from "@/lib/practiceRules";
import { loggedFoodCounts, likedFoodCounts, todaysEaten, eatenAtMeal, foodCountsThisWeek, INTAKE_CHANGED } from "@/lib/history";
import { trackUsage } from "@/lib/usage";
import type { Food } from "@/lib/types";
import { nextEatenMeal } from "@/lib/mealPattern";
import {
  readPersonalizationProfile,
  personalRotationKey,
  PERSONALIZATION_CHANGED,
  type PersonalizationProfile,
  type MedTime,
} from "@/lib/personalizationProfile";
import { biasVector, type PlateAxes } from "@/lib/personalization";
import { clinicalTarget } from "@/lib/tdee";
import { medicationAppliesToMeal, medicationTimingCopy } from "@/lib/medicationTiming";
import { toAvoid, writeShown, writeSkipped, shownToday } from "@/lib/mealRotationMemory";
import { logImpression, rememberSuggested, type ImpressionPlate } from "@/lib/mealImpressions";
import { MeasureChips, ServingPhotoButton } from "./MeasurePhoto";

const NO_PROFILE: PersonalizationProfile = {
  goals: [],
  activityLevel: null,
  mealPattern: ["breakfast", "lunch", "dinner"],
  sex: null,
  ageYears: null,
  weightKg: null,
  heightCm: null,
  conditions: [],
  medDosesPerDay: null,
  medTimes: [],
  medRelationToFood: null,
  medTypes: [],
  swallows: [],
};

const MEAL_ICON = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
} as const;

function impressionPlate(
  meal: NamedMeal,
  dayKey: string,
  idea: MealIdea,
  calorieTarget: number | null,
): ImpressionPlate {
  return {
    meal,
    dayKey,
    plateIndex: idea.index,
    foodIds: idea.foods.map((f) => f.id),
    calorieTarget,
  };
}

/** The servings the blue card made bigger today, food id → grams. */
function scaledGrams(idea: MealIdea): Record<string, number> {
  const out: Record<string, number> = {};
  if (idea.scaledProtein) out[idea.scaledProtein.food.id] = Math.round(idea.scaledProtein.grams);
  if (idea.scaledSide) out[idea.scaledSide.food.id] = Math.round(idea.scaledSide.grams);
  if (idea.swapped?.serving) out[idea.swapped.serving.food.id] = Math.round(idea.swapped.serving.grams);
  return out;
}

/** The same servings' calories, food id -> kcal. */
function scaledKcal(idea: MealIdea): Record<string, number> {
  const out: Record<string, number> = {};
  if (idea.scaledProtein) out[idea.scaledProtein.food.id] = Math.round(idea.scaledProtein.calories);
  if (idea.scaledSide) out[idea.scaledSide.food.id] = Math.round(idea.scaledSide.calories);
  if (idea.swapped?.serving) out[idea.swapped.serving.food.id] = Math.round(idea.swapped.serving.calories);
  return out;
}

/** A food's name as the card shows it. */
function cleanName(f: Food): string {
  return cleanFoodName(f.name);
}

/** Join clean food names into one plain line: "A, B and C". */
function line(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const HEADING = {
  breakfast: "Today's breakfast",
  lunch: "Today's lunch",
  dinner: "Today's dinner",
} as const;

/**
 * The first thing on the /app home, and the reason somebody opened it: the app
 * telling them what to eat, as an authority. It is not collapsed and it is not
 * one card among four — search, build and the doctor's report sit UNDER it as
 * escape routes.
 *
 * It is stable through a meal, changes at the next meal, changes again the next
 * day, and leans away from what the person already eats a lot (see planForDay).
 * Names are kept plain here, so a card never reads "Titus / Mackerel / Tilapia";
 * the full detail is on the food's own card in the builder.
 */
/**
 * True until this person has answered what "My details" asks them: the full
 * calorie questions for a tier that has them, else the medicine question
 * (Basic sees only health conditions and medicine). Founder, 2026-10-24.
 */
function detailsMissing(p: PersonalizationProfile, personalize: boolean): boolean {
  if (personalize) return !p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel;
  return p.medDosesPerDay === null;
}

export default function TodaysMeal({
  onBuild,
  onOpenDetails,
  personalize = false,
}: {
  onBuild: (foods: Food[]) => void;
  /** Opens the "My details" tab. */
  onOpenDetails?: () => void;
  /** canUseGoalPersonalization(access) — trial previews it, Basic never sees it. */
  personalize?: boolean;
}) {
  const [meal, setMeal] = useState<NamedMeal | null>(null);
  const [idea, setIdea] = useState<MealIdea | null>(null);
  const [offset, setOffset] = useState(0);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [liked, setLiked] = useState<Map<string, number>>(new Map());
  const [dayKey, setDayKey] = useState("");
  // Kept in refs as well so the clock timer below can read the latest values
  // without being torn down and rebuilt on every change.
  const countsRef = useRef<Map<string, number>>(new Map());
  const likedRef = useRef<Map<string, number>>(new Map());
  // Meal pattern (which meals this person eats) is free on every tier, so it
  // is fetched regardless of `personalize`; the goal/activity vector below is
  // only ever computed when `personalize` is true.
  const profileRef = useRef<PersonalizationProfile>(NO_PROFILE);
  const nowRef = useRef<{ meal: NamedMeal | null; day: string }>({
    meal: null,
    day: "",
  });
  // Medication timing is free on every tier, mirrors what profileRef already
  // holds, kept as its own bit of render state since the pill/note below
  // needs to re-render when it changes (profileRef alone does not).
  const [medTimes, setMedTimes] = useState<MedTime[]>([]);
  const [medRelationToFood, setMedRelationToFood] = useState<"before" | "after" | null>(null);
  // "Fill in My details" line, until they do (null while the profile loads,
  // so it never flashes for someone who already has).
  const [needsDetails, setNeedsDetails] = useState<boolean | null>(null);
  // "I don't have this" (2026-10-24): the plate as planned, before any swap,
  // the rules a swap must respect, and whether "View details" should pulse
  // because the new size is shown there.
  const [baseIdea, setBaseIdea] = useState<MealIdea | null>(null);
  const [swapCtx, setSwapCtx] = useState<SwapContext>({});
  const [pulseDetails, setPulseDetails] = useState(false);

  // Conditions (hypertension/high cholesterol/kidney disease) are free on
  // every tier — safety-relevant, not a paid perk — so they bias the plate
  // regardless of `personalize`. Goals and activity level stay gated.
  const bias = useCallback((): PlateAxes | null => {
    const conditions = profileRef.current.conditions;
    if (!personalize && conditions.length === 0) return null;
    return biasVector({
      goals: personalize ? profileRef.current.goals : [],
      activityLevel: personalize ? profileRef.current.activityLevel : null,
      conditions,
    });
  }, [personalize]);

  // The daily calorie target's share for THIS meal, recalculated from what
  // has already been eaten today (lib/tdee.ts's remainingMealCalorieTarget)
  // — a FLAT, EVEN split across the meals the person eats (founder
  // instruction, 2026-08-31: "I want evenly split, not awkward split" — an
  // earlier version weighted this by each meal's own real plate ceiling,
  // MEAL_MAX_CALORIES, which structurally under-fed breakfast since real
  // breakfast dishes cap lower than lunch/dinner; unnecessary now that
  // lib/nextMeal.ts's extras are unbounded, so a flat share plus
  // however-many-real-extras-it-takes gives evenly-sized meals instead).
  // null (no bias) unless personalization is unlocked AND the person has
  // filled in sex/age/weight/height/activity, same gating as `bias` above
  // but for the goal-only part (this needs the bio-metrics, conditions
  // alone are not enough to compute a calorie target).
  const calorieTargetFor = useCallback(
    async (m: NamedMeal): Promise<number | null> => {
      if (!personalize) return null;
      const p = profileRef.current;
      if (!p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel) return null;
      const dailyTarget = clinicalTarget(p.sex, p.weightKg, p.heightCm, p.ageYears, p.activityLevel, p.goals).target;
      const rows = await todaysEaten();
      const eatenToday = rows.reduce((s, r) => s + r.calories, 0);
      // mealShareFor: the SAME share lib/useTodaysCalories.ts sizes the extras
      // and snacks against, so the plate and the green cards never disagree.
      // A bigger meal earlier today never makes this one smaller.
      return mealShareFor(dailyTarget, eatenToday, p.mealPattern, m, p.conditions, eatenAtMeal(rows, m));
    },
    [personalize],
  );

  // This meal's calorie share at the last plan, kept for the impression log.
  const calTargetRef = useRef<number | null>(null);

  const plan = useCallback(
    async (
      m: NamedMeal,
      dk: string,
      c: Map<string, number>,
      l: Map<string, number>,
      b: PlateAxes | null,
    ) => {
      const calTarget = await calorieTargetFor(m);
      calTargetRef.current = calTarget;
      const [week, rules] = await Promise.all([foodCountsThisWeek(), practiceRules()]);
      const planned = planForDay(
        m,
        dk,
        c,
        0,
        toAvoid(m, dk),
        l,
        b,
        calTarget,
        profileRef.current.conditions,
        personalRotationKey(profileRef.current),
        week,
        profileRef.current.swallows,
        // Her dietitian's food rules (GluFloat for dietitians); null for everyone else.
        rules,
      );
      const ctx: SwapContext = {
        conditions: profileRef.current.conditions,
        weekCounts: week,
        swallows: profileRef.current.swallows,
        rules,
        calorieTargetForMeal: calTarget,
      };
      const next = withStoredSwap(m, dk, planned, ctx);
      setSwapCtx(ctx);
      setBaseIdea(planned);
      setIdea(next);
      setOffset(0);
      writeShown(m, dk, next.index);
    },
    [calorieTargetFor],
  );

  useEffect(() => {
    // Pattern not loaded yet: default is all three meals, so this reproduces
    // today's behaviour exactly until the real profile arrives below.
    const raw = currentMeal();
    const dk = localDayKey();
    nowRef.current = { meal: raw, day: dk };
    setMeal(raw);
    setDayKey(dk);
    plan(raw, dk, new Map(), new Map(), null);
    // What they eat, what they eat that is good for them, and their
    // meal/goal/activity settings. Three small reads, then one re-plan, so the
    // card is on screen before any of them land.
    Promise.all([loggedFoodCounts(), likedFoodCounts(), readPersonalizationProfile()]).then(
      ([c, l, profile]) => {
        countsRef.current = c;
        likedRef.current = l;
        profileRef.current = profile;
        setCounts(c);
        setLiked(l);
        setMedTimes(profile.medTimes);
        setMedRelationToFood(profile.medRelationToFood);
        setNeedsDetails(detailsMissing(profile, personalize));
        const resolved = nextEatenMeal(profile.mealPattern, currentMeal());
        const dk2 = localDayKey();
        nowRef.current = { meal: resolved, day: dk2 };
        setMeal(resolved);
        setDayKey(dk2);
        plan(resolved, dk2, c, l, bias());
      },
    );
  }, [plan, bias]);

  /**
   * The meal must follow the clock, not the page load. A phone left open on the
   * app at 11:55 used to still be showing breakfast at half past twelve. Check
   * every minute, and re-plan the moment the meal or the Nigerian day changes.
   */
  useEffect(() => {
    const id = setInterval(() => {
      const raw = currentMeal();
      const dk = localDayKey();
      const resolved = nextEatenMeal(profileRef.current.mealPattern, raw);
      const was = nowRef.current;
      if (was.meal === null || (resolved === was.meal && dk === was.day)) return;
      nowRef.current = { meal: resolved, day: dk };
      setMeal(resolved);
      setDayKey(dk);
      plan(resolved, dk, countsRef.current, likedRef.current, bias());
    }, 60_000);
    return () => clearInterval(id);
  }, [plan, bias]);

  // Saving a new goal/activity/meal-pattern in PersonalizationSettings should
  // reshape today's meal immediately, not after a reload — same pattern as
  // INTAKE_CHANGED elsewhere in the app.
  useEffect(() => {
    function onChanged() {
      readPersonalizationProfile().then((profile) => {
        profileRef.current = profile;
        setMedTimes(profile.medTimes);
        setMedRelationToFood(profile.medRelationToFood);
        setNeedsDetails(detailsMissing(profile, personalize));
        const cur = nowRef.current;
        if (cur.meal === null) return;
        const resolved = nextEatenMeal(profile.mealPattern, cur.meal);
        nowRef.current = { meal: resolved, day: cur.day };
        setMeal(resolved);
        plan(resolved, cur.day, countsRef.current, likedRef.current, bias());
      });
    }
    window.addEventListener(PERSONALIZATION_CHANGED, onChanged);
    return () => window.removeEventListener(PERSONALIZATION_CHANGED, onChanged);
  }, [plan, bias]);

  /**
   * "shown" is recorded once a plate has stayed on screen for 3 seconds. The
   * card plans twice on open (once straight away, once when the profile
   * lands), and the first plate is often replaced within a second; counting
   * it as shown would say people skipped plates they never saw.
   */
  useEffect(() => {
    if (!meal || !idea || idea.foods.length === 0 || !dayKey) return;
    const plate = impressionPlate(meal, dayKey, idea, calTargetRef.current);
    const t = setTimeout(() => logImpression(plate, "shown"), 3000);
    return () => clearTimeout(t);
  }, [meal, idea, dayKey]);

  // Back on track (co-founder dietitian, 2026-10-23): when the meal before
  // this one today was not its blue-card plate, say so calmly at the top.
  // Re-read whenever a meal is saved.
  const [earlier, setEarlier] = useState<NamedMeal | null>(null);
  // Her line about what that meal held (a sweet drink, fried food, more than
  // the size shown), when one fits.
  const [followUp, setFollowUp] = useState<string | null>(null);
  useEffect(() => {
    if (!meal || !dayKey) return;
    let live = true;
    const check = () =>
      todaysEaten().then((rows) => {
        if (!live) return;
        const found = differentMealBefore(
          meal,
          rows,
          (m) => {
            const i = shownToday(m, dayKey);
            const plate = i == null ? null : ideasFor(m)[i] ?? null;
            // A food swapped on the card ("I don't have this") is not a different meal.
            return plate && i != null ? shownPlateWithSwap(m, dayKey, i, plate) : plate;
          },
          isExtraFood,
        );
        setEarlier(found);
        setFollowUp(followUpLine(meal, rows, getFood, isExtraFood));
      });
    check();
    window.addEventListener(INTAKE_CHANGED, check);
    return () => {
      live = false;
      window.removeEventListener(INTAKE_CHANGED, check);
    };
  }, [meal, dayKey]);

  if (!meal || !idea || idea.foods.length === 0) return null;

  const Icon = MEAL_ICON[meal];
  const mealCalories = mealIdeaCalories(idea);
  const mealCarbs = mealIdeaCarbs(idea);
  const another = () => {
    void trackUsage("meal_reroll");
    logImpression(impressionPlate(meal, dayKey, idea, calTargetRef.current), "skipped");
    // They are walking away from this plate. Remember it, so it is not the one
    // we hand them tomorrow.
    writeSkipped(meal, idea.index);
    writeSwap(null);
    setPulseDetails(false);
    const n = offset + 1;
    setOffset(n);
    Promise.all([calorieTargetFor(meal), foodCountsThisWeek(), practiceRules()]).then(([calTarget, week, rules]) => {
      calTargetRef.current = calTarget;
      const next = planForDay(
        meal,
        dayKey,
        counts,
        n,
        toAvoid(meal, dayKey),
        liked,
        bias(),
        calTarget,
        profileRef.current.conditions,
        personalRotationKey(profileRef.current),
        week,
        profileRef.current.swallows,
        rules,
      );
      setSwapCtx({ conditions: profileRef.current.conditions, weekCounts: week, swallows: profileRef.current.swallows, rules, calorieTargetForMeal: calTarget });
      setBaseIdea(next);
      setIdea(next);
      writeShown(meal, dayKey, next.index);
    });
  };

  // One swap at a time, only on a food that has an approved swap for them.
  const base = baseIdea ?? idea;
  const canSwap = idea.swapped ? new Set<string>() : swappableFoods(meal, idea, swapCtx);
  const swap = (food: Food) => {
    const next = swapInPlate(meal, idea, food.id, swapCtx);
    if (!next) return;
    void trackUsage("meal_swap");
    writeSwap({ day: dayKey, meal, plate: idea.index, from: food.id, to: next.swapped!.to.id, turn: 0 });
    writeShown(meal, dayKey, next.index);
    setIdea(next);
    setPulseDetails(true);
  };
  const changeBack = () => {
    writeSwap(null);
    writeShown(meal, dayKey, base.index);
    setIdea(base);
    setPulseDetails(false);
  };

  return (
    /* Brand blue, the same canvas as the landing hero, because this card IS the
       hero of /app. Redesigned 2026-10-25 with the same words: the plate is a
       list of foods (each swappable one has its own "Change" button; the words
       were "I don't have", which read as "leave it out", founder 2026-10-25), the numbers are large, and "View
       details" is one big white button that clearly opens the rest. */
    <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-b from-[#0d3568] via-[#134b85] to-[#1b5faa] shadow-[0_24px_60px_-22px_rgba(12,42,71,0.65)]">
      <div className="dots-light pointer-events-none absolute inset-x-0 top-0 h-48 opacity-30" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-leaf/20 blur-3xl" aria-hidden />

      <div className="relative px-4 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
        {/* Header: which meal, and that it is good to eat */}
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner ring-1 ring-inset ring-white/25">
            <Icon className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold leading-tight text-white sm:text-[1.7rem]">
              {HEADING[meal]}
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/85">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-verdict-green">
                <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
              </span>
              Good to eat <span className="text-white/40">·</span> Picked for you
            </span>
          </div>
        </div>

        {needsDetails && onOpenDetails && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-3.5 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.6)] sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <UserRound className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
              </span>
              <p className="pt-0.5 text-sm font-semibold leading-snug text-ink">
                Fill in the &quot;My details&quot; section and start getting meals tailored to you.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenDetails}
              className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
            >
              Go to My details <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {(earlier || followUp) && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white/[0.08] p-3.5 ring-1 ring-inset ring-white/15">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
              <Route className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1.5 pt-1 text-sm leading-relaxed text-white/90">
              {earlier && <p>{recoveryLine(earlier, meal)}</p>}
              {followUp && <p>{followUp}</p>}
            </div>
          </div>
        )}

        {/* The plate: one row per food, with its numbers at the foot. */}
        <div className="mt-5 overflow-hidden rounded-3xl bg-white/[0.07] ring-1 ring-inset ring-white/15">
          {!idea.swapped && canSwap.size > 0 && (
            <p className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5 text-xs font-semibold text-white/80">
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.6} aria-hidden />
              Don&apos;t have a food? Tap Change to get another one.
            </p>
          )}
          <ul className="divide-y divide-white/10">
            {idea.foods.map((f, i) => {
              const isNew = idea.swapped?.to.id === f.id;
              return (
                <li key={f.id} className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
                  <span className="relative">
                    <FoodIcon food={f} tone="dark" />
                    {isNew && (
                      <span aria-hidden className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-leaf text-white ring-2 ring-[#134b85]">
                        <ArrowLeftRight className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <p className="min-w-0 flex-1 font-display text-lg font-semibold leading-snug text-white sm:text-xl">
                    {idea.names[i] ?? cleanName(f)}
                  </p>
                  {!idea.swapped && canSwap.has(f.id) && (
                    <button
                      type="button"
                      onClick={() => swap(f)}
                      aria-label={`Change ${cleanName(f)} if you don't have it`}
                      className="group flex shrink-0 items-center gap-1.5 rounded-full bg-white py-2 pl-2.5 pr-3.5 text-xs font-bold text-brand shadow-[0_6px_14px_-8px_rgba(0,0,0,0.6)] transition-all hover:bg-mint active:scale-95"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" strokeWidth={2.6} aria-hidden />
                      Change
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {idea.swapped && (
            <div className="flex items-start gap-2.5 border-t border-white/10 bg-leaf/20 px-4 py-3 text-sm text-white">
              <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-white/80" strokeWidth={2.4} aria-hidden />
              <p className="min-w-0 leading-relaxed">
                Swapped {line([cleanName(idea.swapped.from)])} for {line([cleanName(idea.swapped.to)])}. Tap View details to see how much to eat.{" "}
                <button type="button" onClick={changeBack} className="font-bold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
                  Change back
                </button>
              </p>
            </div>
          )}

          {/* Carbs leads: it is the number that matters for insulin (carb
              counting), calories second. Shown before they commit to the plate. */}
          {(mealCarbs > 0 || mealCalories > 0) && (
            <div className="grid grid-cols-2 border-t border-white/10 bg-black/10">
              {mealCarbs > 0 && (
                <p className="flex items-center gap-3 px-4 py-3.5">
                  <Wheat className="h-5 w-5 shrink-0 text-white/50" strokeWidth={2} aria-hidden />
                  <span>
                    <span className="block font-display text-2xl font-bold leading-none text-white">{mealCarbs}g</span>
                    <span className="mt-1 block text-xs font-semibold text-white/70"> carbs</span>
                  </span>
                </p>
              )}
              {mealCalories > 0 && (
                <p className="flex items-center gap-3 border-l border-white/10 px-4 py-3.5">
                  <Flame className="h-5 w-5 shrink-0 text-white/50" strokeWidth={2} aria-hidden />
                  <span>
                    <span className="block font-display text-2xl font-bold leading-none text-white">{mealCalories}</span>
                    <span className="mt-1 block text-xs font-semibold text-white/70"> kcal</span>
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* The lines that keep this plate safe. */}
        {(idea.sizeNote ||
          (idea.scaledProtein && idea.scaledProtein.extraCalories < 0) ||
          (medicationAppliesToMeal(medTimes, meal) && medicationTimingCopy(medRelationToFood))) && (
          <div className="mt-3 space-y-2.5">
            {idea.sizeNote && (
              <div className="flex items-start gap-3 rounded-2xl bg-white/[0.08] p-3.5 ring-1 ring-inset ring-white/15">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-verdict-yellow text-ink">
                  <Scale className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-semibold leading-relaxed text-white">{idea.sizeNote}</p>
                  <MeasureChips text={idea.sizeNote} forFood={idea.names[0]} tone="dark" className="mt-2" />
                </div>
              </div>
            )}

            {/* Bigger servings only top up calories, so they live in "View
                details" (founder, 2026-10-24). The 50g beef or goat meat line
                stays: it is a health limit, not a top-up. */}
            {idea.scaledProtein && idea.scaledProtein.extraCalories < 0 && (
              <div className="flex items-start gap-3 rounded-2xl bg-white/[0.08] p-3.5 ring-1 ring-inset ring-white/15">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <Flame className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm leading-relaxed text-white/90">{idea.scaledProtein.instruction}</p>
                  {/* The one-chunk photo, never the palm-size "Chunks of meat"
                      button, which is the card's 90g. */}
                  <div className="mt-2 empty:hidden">
                    <ServingPhotoButton
                      food={{ ...idea.scaledProtein.food, portionGuidance: idea.scaledProtein.instruction }}
                      grams={idea.scaledProtein.grams}
                      size="md"
                    />
                  </div>
                </div>
              </div>
            )}

            {medicationAppliesToMeal(medTimes, meal) && medicationTimingCopy(medRelationToFood) && (
              <div className="flex items-start gap-3 rounded-2xl bg-white/[0.08] p-3.5 ring-1 ring-inset ring-white/15">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <Pill className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                </span>
                <p className="min-w-0 pt-1 text-sm leading-relaxed text-white/90">{medicationTimingCopy(medRelationToFood)}</p>
              </div>
            )}
          </div>
        )}

        {/* One big white button that plainly opens the rest; "Try another
            meal" is the quiet second choice under it. */}
        <div className="mt-5 space-y-1.5">
          <button
            onClick={() => {
              void trackUsage("check_this_meal");
              const plate = impressionPlate(meal, dayKey, idea, calTargetRef.current);
              logImpression(plate, "details");
              rememberSuggested(plate, scaledGrams(idea), scaledKcal(idea));
              setPulseDetails(false);
              onBuild(mealIdeaFoodsForBuilder(idea));
            }}
            className={`${pulseDetails ? "cta-pulse " : ""}group flex w-full items-center justify-between gap-3 rounded-2xl bg-white py-2 pl-5 pr-2 text-left shadow-[0_14px_30px_-12px_rgba(0,0,0,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-12px_rgba(0,0,0,0.6)] active:translate-y-0`}
          >
            <span className="font-display text-lg font-bold text-brand-deep">View details</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf text-white shadow-[0_8px_18px_-8px_rgba(62,155,79,0.9)]">
              <ArrowRight className="details-nudge h-5 w-5" strokeWidth={2.6} />
            </span>
          </button>
          <button
            onClick={another}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" /> Try another meal
          </button>
        </div>
      </div>
    </section>
  );
}
