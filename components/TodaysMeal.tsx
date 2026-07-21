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
import { trackUsage } from "@/lib/usage";
import type { Food } from "@/lib/types";
import CollapsibleCard from "./CollapsibleCard";

const MEAL_ICON = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
} as const;

// Remember, per meal, which plate was last shown and on which day, so the next
// day's plate is never a repeat. Lives on the device (localStorage).
const SHOWN_KEY = "gf_meal_shown";
type ShownMap = Record<string, { day: string; index: number }>;
function readShown(meal: string): { day: string; index: number } | undefined {
  try {
    return (JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}") as ShownMap)[meal];
  } catch {
    return undefined;
  }
}
function writeShown(meal: string, day: string, index: number): void {
  try {
    const all = JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}") as ShownMap;
    all[meal] = { day, index };
    localStorage.setItem(SHOWN_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

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
  open,
  onToggle,
}: {
  onBuild: (foods: Food[]) => void;
  open: boolean;
  onToggle: () => void;
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
    // Yesterday's plate for this meal (remembered on the device), so today's is
    // never the same one. Only counts as "yesterday" if it was shown on a
    // different day.
    const prev = readShown(m);
    const avoid = prev && prev.day !== dk ? prev.index : undefined;
    const first = planForDay(m, dk, new Map(), 0, avoid);
    setIdea(first);
    writeShown(m, dk, first.index);
    loggedFoodCounts().then((c) => {
      setCounts(c);
      const withHistory = planForDay(m, dk, c, 0, avoid);
      setIdea(withHistory);
      writeShown(m, dk, withHistory.index);
    });
  }, []);

  if (!meal || !idea || idea.foods.length === 0) return null;

  const Icon = MEAL_ICON[meal];
  const another = () => {
    void trackUsage("meal_reroll");
    const n = offset + 1;
    setOffset(n);
    const prev = readShown(meal);
    const avoid = prev && prev.day !== dayKey ? prev.index : undefined;
    const next = planForDay(meal, dayKey, counts, n, avoid);
    setIdea(next);
    writeShown(meal, dayKey, next.index);
  };

  return (
    <CollapsibleCard
      open={open}
      onToggle={onToggle}
      tone="green"
      icon={<Icon className="h-6 w-6" strokeWidth={2.2} />}
      header={
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink/40">
            Today&apos;s food
          </p>
          <p className="font-display text-xl font-bold capitalize leading-tight text-ink">
            {mealHeading(meal)}
          </p>
        </div>
      }
    >
      <p className="font-display text-2xl font-bold leading-snug text-ink">
        {line(idea.names)}
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-verdict-green/10 px-3 py-1 text-sm font-semibold text-leaf-deep">
        <Check className="h-4 w-4" strokeWidth={3} /> All good for your sugar
      </span>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          onClick={() => {
            void trackUsage("check_this_meal");
            onBuild(idea.foods);
          }}
          className="flex items-center gap-2 rounded-full bg-gradient-to-br from-leaf to-leaf-deep px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(62,155,79,0.75)] transition-transform hover:-translate-y-0.5"
        >
          Check this meal for full details <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={another}
          className="flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-bold text-ink transition-colors hover:border-leaf hover:text-leaf-deep"
        >
          <RefreshCw className="h-4 w-4" /> Show me another food
        </button>
      </div>
    </CollapsibleCard>
  );
}
