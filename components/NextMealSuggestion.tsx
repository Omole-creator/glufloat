"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import { currentSlot, nextMeal, type NamedMeal } from "@/lib/mealtime";
import { pickIdea, type MealIdea } from "@/lib/nextMeal";
import type { Food } from "@/lib/types";

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

/**
 * "You have eaten this one, what about the next meal?" A safe idea for the meal
 * that comes after the one happening now (breakfast points to lunch, and so on),
 * with a button to check it in the meal builder and a button to see a different
 * idea. This answers the exact "what should I eat for lunch?" moment without the
 * person having to think of it.
 */
export default function NextMealSuggestion({
  onBuild,
}: {
  onBuild: (foods: Food[]) => void;
}) {
  const [meal, setMeal] = useState<NamedMeal | null>(null);
  const [idea, setIdea] = useState<MealIdea | null>(null);

  // Time of day is read on the device after mount (never on the server), so the
  // suggestion matches the person's own clock.
  useEffect(() => {
    const m = nextMeal(currentSlot());
    setMeal(m);
    setIdea(pickIdea(m));
  }, []);

  if (!meal || !idea || idea.foods.length === 0) return null;

  const another = () => setIdea(pickIdea(meal, idea.index));

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">
        Thinking about your next meal?
      </p>
      <p className="mt-1 font-display text-lg font-bold text-ink">
        A safe idea for {meal}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {idea.foods.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-2 rounded-full border border-line bg-mist px-3 py-1.5 text-sm font-semibold text-ink"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[f.baseVerdict]}`} />
            {f.name}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onBuild(idea.foods)}
          className="flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105"
        >
          Check this meal <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={another}
          className="flex items-center gap-2 rounded-full border-2 border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-brand"
        >
          <RefreshCw className="h-4 w-4" /> Show me another
        </button>
      </div>
    </div>
  );
}
