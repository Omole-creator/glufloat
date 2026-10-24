"use client";

import { useEffect, useState } from "react";
import FoodIcon from "./FoodIcon";
import { ArrowRight, Flame, Moon, Scale, Sun, Sunrise } from "lucide-react";
import type { Food } from "@/lib/types";
import {
  platesWithFood,
  mealShareFor,
  mealIdeaCalories,
  mealIdeaCarbs,
  mealIdeaFoodsForBuilder,
  type MealIdea,
} from "@/lib/nextMeal";
import { currentMeal, localDayKey, type NamedMeal } from "@/lib/mealtime";
import { readPersonalizationProfile, PERSONALIZATION_CHANGED } from "@/lib/personalizationProfile";
import { todaysEaten, eatenAtMeal, foodCountsThisWeek, INTAKE_CHANGED } from "@/lib/history";
import { clinicalTarget } from "@/lib/tdee";
import { rememberSuggested } from "@/lib/mealImpressions";
import { trackUsage } from "@/lib/usage";
import { cleanFoodName } from "@/lib/foodName";
import type { Condition } from "@/lib/personalization";

const ORDER: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const TITLE = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;
const ICON = { breakfast: Sunrise, lunch: Sun, dinner: Moon } as const;
/** Founder, 2026-10-08: three choices, never a long list (choice paralysis). */
const TOP = 3;

function line(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Each meal's calorie share, the same number the blue card uses
 * (mealShareFor). A meal still to come today is sized against what is left
 * of today; a meal already past is sized as tomorrow's, with nothing eaten
 * yet (founder, 2026-10-08).
 */
async function mealTargets(personalize: boolean): Promise<{
  targets: Partial<Record<NamedMeal, number>>;
  conditions: Condition[];
}> {
  const p = await readPersonalizationProfile();
  const conditions = p.conditions ?? [];
  if (!personalize || !p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel) {
    return { targets: {}, conditions };
  }
  const daily = clinicalTarget(p.sex, p.weightKg, p.heightCm, p.ageYears, p.activityLevel, p.goals).target;
  const rows = await todaysEaten();
  const eaten = rows.reduce((s, r) => s + r.calories, 0);
  const now = ORDER.indexOf(currentMeal());
  const targets: Partial<Record<NamedMeal, number>> = {};
  for (const m of ORDER) {
    const past = ORDER.indexOf(m) < now;
    targets[m] = past
      ? mealShareFor(daily, 0, p.mealPattern, m, conditions)
      : mealShareFor(daily, eaten, p.mealPattern, m, conditions, eatenAtMeal(rows, m));
  }
  return { targets, conditions };
}

/**
 * "One voice" (co-founder dietitian, 2026-10-08): the blue card's own plates
 * that hold this food, shown under its search card. Tapping one opens it in
 * "Check a meal" exactly like the blue card's "View details", bigger
 * serving included. Shows nothing for a food that is in no plate.
 */
export default function MealsWithFood({
  food,
  personalize,
  onOpen,
}: {
  food: Food;
  personalize: boolean;
  onOpen: (foods: Food[]) => void;
}) {
  const [plates, setPlates] = useState<Record<NamedMeal, MealIdea[]> | null>(null);
  const [targets, setTargets] = useState<Partial<Record<NamedMeal, number>>>({});

  useEffect(() => {
    let live = true;
    const load = async () => {
      const [t, week] = await Promise.all([mealTargets(personalize), foodCountsThisWeek()]);
      if (!live) return;
      setTargets(t.targets);
      setPlates(platesWithFood(food.id, t.targets, t.conditions, week));
    };
    void load();
    window.addEventListener(PERSONALIZATION_CHANGED, load);
    window.addEventListener(INTAKE_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(PERSONALIZATION_CHANGED, load);
      window.removeEventListener(INTAKE_CHANGED, load);
    };
  }, [food.id, personalize]);

  if (!plates) return null;
  // The meal it is now, or, when this food is in no plate for this meal, the
  // next meal that has one (at dinner, a breakfast food shows tomorrow's
  // breakfast). Founder, 2026-10-08.
  const now = ORDER.indexOf(currentMeal());
  const meal = [0, 1, 2].map((k) => ORDER[(now + k) % 3]).find((m) => plates[m].length > 0);
  if (!meal) return null;
  const tomorrow = ORDER.indexOf(meal) < now;
  const list = plates[meal].slice(0, TOP);

  const choose = (meal: NamedMeal, idea: MealIdea) => {
    void trackUsage("check_this_meal");
    const grams: Record<string, number> = {};
    const kcal: Record<string, number> = {};
    for (const s of [idea.scaledProtein, idea.scaledSide]) {
      if (s) {
        grams[s.food.id] = Math.round(s.grams);
        kcal[s.food.id] = Math.round(s.calories);
      }
    }
    rememberSuggested(
      { meal, dayKey: localDayKey(), plateIndex: idea.index, foodIds: idea.foods.map((f) => f.id), calorieTarget: targets[meal] ?? null },
      grams,
      kcal,
    );
    onOpen(mealIdeaFoodsForBuilder(idea));
  };

  const Icon = ICON[meal];
  return (
    /* Redesigned 2026-10-25 with the same words, in the blue card's look:
       each plate shows its foods as pictures, its numbers, and one clear
       arrow to open it. */
    <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_16px_44px_-24px_rgba(12,42,71,0.45)] ring-1 ring-line sm:p-6">
      <p className="inline-flex items-center gap-2 rounded-full bg-brand/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
        <Icon className="h-3.5 w-3.5" strokeWidth={2.4} /> {tomorrow ? `${TITLE[meal]} tomorrow` : `For ${TITLE[meal].toLowerCase()}`}
      </p>
      <h3 className="mt-2.5 font-display text-xl font-bold leading-snug text-ink">
        {list.length === 1 ? "The best meal" : `The best ${list.length} meals`} with {cleanFoodName(food.name)}
      </h3>
      <ul className="mt-4 space-y-3">
        {list.map((idea, n) => {
          const carbs = mealIdeaCarbs(idea);
          const cals = mealIdeaCalories(idea);
          const bigger = [idea.scaledProtein, idea.scaledSide].filter(Boolean);
          const name = line(idea.names);
          return (
            <li key={idea.index}>
              <button
                onClick={() => choose(meal, idea)}
                aria-label={`${TITLE[meal]}: ${name}. See all the details`}
                className="group block w-full overflow-hidden rounded-3xl bg-white text-left ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(12,42,71,0.5)] hover:ring-brand/30"
              >
                <span className="flex items-start gap-3 p-4">
                  <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {n + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex -space-x-2">
                      {idea.foods.map((f) => (
                        <FoodIcon key={f.id} food={f} size="sm" tone="stack" />
                      ))}
                    </span>
                    <span className="mt-2.5 block font-display text-base font-bold leading-snug text-ink">{name}</span>
                    {idea.sizeNote && (
                      <span className="mt-2 flex items-start gap-2 rounded-xl bg-verdict-yellow/15 px-2.5 py-2 text-xs font-semibold leading-snug text-ink">
                        <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/70" strokeWidth={2.4} />
                        {idea.sizeNote}
                      </span>
                    )}
                    {bigger.map((s) => (
                      <span key={s!.food.id} className="mt-2 flex items-start gap-2 text-xs leading-snug text-ink-soft">
                        <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" strokeWidth={2.4} />
                        {s!.instruction}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="flex items-center gap-4 border-t border-line bg-mist/70 px-4 py-2.5">
                  {carbs > 0 && (
                    <span className="text-sm font-semibold text-ink-soft">
                      <span className="font-display text-base font-bold text-ink">{carbs}g</span> carbs
                    </span>
                  )}
                  {cals > 0 && (
                    <span className="text-sm font-semibold text-ink-soft">
                      <span className="font-display text-base font-bold text-ink">{cals}</span> kcal
                    </span>
                  )}
                  <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-leaf text-white transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
