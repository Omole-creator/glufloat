"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Flame, Moon, Sun, Sunrise } from "lucide-react";
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
import { caloriesEatenToday, INTAKE_CHANGED } from "@/lib/history";
import { bmr, tdee, calorieTarget } from "@/lib/tdee";
import { rememberSuggested } from "@/lib/mealImpressions";
import { trackUsage } from "@/lib/usage";
import { cleanFoodName } from "@/lib/foodName";
import type { Condition } from "@/lib/personalization";

const ORDER: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const TITLE = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;
const ICON = { breakfast: Sunrise, lunch: Sun, dinner: Moon } as const;
/** How many plates each meal shows before "Show more". */
const FIRST = 3;

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
  const daily = calorieTarget(tdee(bmr(p.sex, p.weightKg, p.heightCm, p.ageYears), p.activityLevel), p.goals);
  const eaten = await caloriesEatenToday();
  const now = ORDER.indexOf(currentMeal());
  const targets: Partial<Record<NamedMeal, number>> = {};
  for (const m of ORDER) {
    const past = ORDER.indexOf(m) < now;
    targets[m] = mealShareFor(daily, past ? 0 : eaten, p.mealPattern, m, conditions);
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
  const [open, setOpen] = useState<Partial<Record<NamedMeal, boolean>>>({});

  useEffect(() => {
    let live = true;
    const load = async () => {
      const t = await mealTargets(personalize);
      if (!live) return;
      setTargets(t.targets);
      setPlates(platesWithFood(food.id, t.targets, t.conditions));
    };
    void load();
    setOpen({});
    window.addEventListener(PERSONALIZATION_CHANGED, load);
    window.addEventListener(INTAKE_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(PERSONALIZATION_CHANGED, load);
      window.removeEventListener(INTAKE_CHANGED, load);
    };
  }, [food.id, personalize]);

  if (!plates) return null;
  const meals = ORDER.filter((m) => plates[m].length > 0);
  if (meals.length === 0) return null;

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

  return (
    <section className="mt-5 rounded-3xl bg-white p-5 shadow-[0_12px_40px_-20px_rgba(12,42,71,0.35)] ring-1 ring-line sm:p-6">
      <h3 className="font-display text-lg font-bold text-ink">GluFloat meals with {cleanFoodName(food.name)}</h3>
      <p className="mt-1 text-sm text-ink-soft">The same meals your blue card picks. Tap one to see all the details.</p>

      {meals.map((m) => {
        const Icon = ICON[m];
        const list = plates[m];
        const shown = open[m] ? list : list.slice(0, FIRST);
        return (
          <div key={m} className="mt-5">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand">
              <Icon className="h-4 w-4" strokeWidth={2.4} /> {TITLE[m]}
            </p>
            <ul className="mt-2 space-y-2">
              {shown.map((idea) => {
                const carbs = mealIdeaCarbs(idea);
                const cals = mealIdeaCalories(idea);
                const bigger = [idea.scaledProtein, idea.scaledSide].filter(Boolean);
                const name = line(idea.names);
                return (
                  <li key={idea.index}>
                    <button
                      onClick={() => choose(m, idea)}
                      aria-label={`${TITLE[m]}: ${name}. See all the details`}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-mist px-4 py-3 text-left transition-colors hover:bg-brand/10"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{name}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {carbs > 0 && (
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line">
                              {carbs}g carbs
                            </span>
                          )}
                          {cals > 0 && (
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-soft ring-1 ring-line">
                              {cals} kcal
                            </span>
                          )}
                        </span>
                        {bigger.map((s) => (
                          <span key={s!.food.id} className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-soft">
                            <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" strokeWidth={2.4} />
                            {s!.instruction}
                          </span>
                        ))}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {list.length > FIRST && !open[m] && (
              <button
                onClick={() => setOpen((o) => ({ ...o, [m]: true }))}
                className="mt-2 text-sm font-bold text-brand underline-offset-2 hover:underline"
              >
                Show {list.length - FIRST} more {TITLE[m].toLowerCase()} meals
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
