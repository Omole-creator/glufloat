"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { searchFoods } from "@/lib/search";
import type { Food } from "@/lib/types";
import VerdictCard from "./VerdictCard";
import { events } from "@/lib/analytics";
import { saveCheck } from "@/lib/history";

// Access is gated upstream at /app, so this panel is always fully open here.
export default function SearchPanel({
  initialFood = null,
  onBuildMeal,
}: {
  /** When set (e.g. tapping a recent food), open straight to that food's card. */
  initialFood?: Food | null;
  /** "Add what you are eating it with": hand the food to the meal builder. */
  onBuildMeal?: (food: Food) => void;
} = {}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Food | null>(null);

  // Open to a food handed in from outside (a recent-meal chip), without saving a
  // new check for it: it was already saved when first opened.
  useEffect(() => {
    if (initialFood) {
      setPicked(initialFood);
      setQuery("");
    }
  }, [initialFood]);

  const results = useMemo(() => searchFoods(query), [query]);

  const pick = (food: Food) => {
    events.foodChecked(food.name);
    // Remember it, so the app can show recent meals and a day-streak. Best
    // effort: a failed save never blocks the answer.
    void saveCheck("single", food.name, food.baseVerdict);
    setPicked(food);
    setQuery("");
  };

  return (
    <div>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
          }}
          placeholder="Try eba, jollof, plantain, moi moi, coke..."
          className="w-full rounded-full border-2 border-line bg-white py-3.5 pl-12 pr-5 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft/50 focus:border-brand"
          aria-label="Search a food"
        />
      </div>

      {results.length > 0 && !picked && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          {results.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => pick(f)}
                className="flex w-full items-center justify-between px-5 py-3 text-left text-sm transition-colors hover:bg-mist"
              >
                <span className="font-medium text-ink">{f.name}</span>
                <span
                  className={`h-3 w-3 shrink-0 rounded-full ${
                    f.baseVerdict === "green"
                      ? "bg-verdict-green"
                      : f.baseVerdict === "yellow"
                        ? "bg-verdict-yellow"
                        : "bg-verdict-red"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && results.length === 0 && !picked && (
        <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm text-ink-soft">
          We do not have this food yet. We add new ones every month, so check
          again soon.
        </p>
      )}

      {picked && (
        <div className="mt-4">
          <VerdictCard food={picked} />
          {onBuildMeal && (
            <button
              onClick={() => onBuildMeal(picked)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-leaf bg-mint px-5 py-3 text-sm font-bold text-leaf-deep transition-colors hover:bg-leaf hover:text-white"
            >
              Add what you are eating it with
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
