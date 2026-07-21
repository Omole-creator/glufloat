"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ArrowRight, Sunrise, Sun, Moon, Check } from "lucide-react";
import {
  currentMeal,
  mealHeading,
  localDayKey,
  type NamedMeal,
} from "@/lib/mealtime";
import { planForDay, type MealIdea } from "@/lib/nextMeal";
import { loggedFoodCounts } from "@/lib/history";
import type { Food } from "@/lib/types";

const MEAL_ICON = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
} as const;

/** Join clean food names into one plain line: "A, B and C". */
function line(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The app tells the person what to eat, as an authority: "Your dinner for
 * today", one clear plate. It is stable through the day, changes the next day,
 * and leans away from what they already eat a lot (see planForDay). Names are
 * kept plain here, so a card never reads "Titus / Mackerel / Tilapia"; the full
 * detail is on the food's own card in the builder.
 */
export default function TodaysMeal({
  onBuild,
}: {
  onBuild: (foods: Food[]) => void;
}) {
  const [meal, setMeal] = useState<NamedMeal | null>(null);
  const [idea, setIdea] = useState<MealIdea | null>(null);
  const [offset, setOffset] = useState(0);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [dayKey, setDayKey] = useState("");

  useEffect(() => {
    const m = currentMeal();
    const dk = localDayKey();
    setMeal(m);
    setDayKey(dk);
    // Show something at once, then refine once the history has loaded.
    setIdea(planForDay(m, dk, new Map(), 0));
    loggedFoodCounts().then((c) => {
      setCounts(c);
      setIdea(planForDay(m, dk, c, 0));
    });
  }, []);

  if (!meal || !idea || idea.foods.length === 0) return null;

  const Icon = MEAL_ICON[meal];
  const another = () => {
    const n = offset + 1;
    setOffset(n);
    setIdea(planForDay(meal, dayKey, counts, n));
  };

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-brand/40 bg-white shadow-sm">
      <div className="flex items-center gap-3 bg-gradient-to-r from-brand to-leaf px-5 py-4 text-white">
        <Icon className="h-7 w-7 shrink-0" strokeWidth={2.2} />
        <p className="font-display text-xl font-bold capitalize leading-tight">
          {mealHeading(meal)}
        </p>
      </div>

      <div className="p-5">
        <p className="font-display text-2xl font-bold leading-snug text-ink">
          {line(idea.names)}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-leaf-deep">
          <Check className="h-4 w-4" strokeWidth={3} /> All good for your sugar.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onBuild(idea.foods)}
            className="flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105"
          >
            Check this meal for full details <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={another}
            className="flex items-center gap-2 rounded-full border-2 border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-brand"
          >
            <RefreshCw className="h-4 w-4" /> Show me another food
          </button>
        </div>
      </div>
    </div>
  );
}
