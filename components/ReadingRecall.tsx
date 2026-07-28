"use client";

import { useCallback, useEffect, useState } from "react";
import { Droplet, Wrench, X } from "lucide-react";
import { type Reading, preferredUnit } from "@/lib/glucose";
import { READINGS_CHANGED } from "@/lib/glucoseLog";
import {
  type FoodPattern,
  foodPattern,
  personalUsual,
  readingsByFood,
  recallLine,
} from "@/lib/glucosePattern";
import { checkedMeals } from "@/lib/history";
import { cleanFoodName } from "@/lib/foodName";
import type { Food } from "@/lib/types";

/** Foods whose pattern line this person has waved away, per device. */
const MUTE_KEY = "gf_reading_mute";

function muted(): string[] {
  try {
    const raw = localStorage.getItem(MUTE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function mute(id: string): void {
  try {
    const next = Array.from(new Set([...muted(), id]));
    localStorage.setItem(MUTE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked; it will simply show again */
  }
}

/**
 * "Last time you ate this, your reading was..." and, once there is enough to go
 * on, "your readings after this are higher than your usual".
 *
 * This is the line that answers the founder's actual question: warn me about a
 * meal that went badly last time, before I eat it again. Everything it is allowed
 * to say is decided in lib/glucosePattern.ts, and the four rules at the top of
 * that file are the ones that matter. In short: their own numbers, compared only
 * with their own usual, never blaming the food, never telling anybody what to do,
 * and no colour on any number.
 *
 * It sits in a calm grey box, deliberately the same shape as the "If you take
 * medicine" note and NOT the red warning box. A red box under a green headline
 * would push somebody off a food over one bad afternoon, which is the mistake the
 * okra note exists to avoid.
 */
export default function ReadingRecall({
  foods,
  onFix,
}: {
  foods: Food[];
  onFix?: () => void;
}) {
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [byFood, setByFood] = useState<Map<string, number[]>>(new Map());
  const [hidden, setHidden] = useState<string[]>([]);

  const load = useCallback(() => {
    void checkedMeals().then((checks) => {
      setByFood(readingsByFood(checks));
      setReadings(checks.flatMap((c) => c.readings));
    });
  }, []);

  useEffect(() => {
    setHidden(muted());
    load();
    // A reading saved a moment ago must show on the very next food they open,
    // without a reload. Same reason IntakeWarning listens for its own event.
    window.addEventListener(READINGS_CHANGED, load);
    return () => window.removeEventListener(READINGS_CHANGED, load);
  }, [load]);

  if (readings === null) return null;

  // Which food on the plate to speak about: the one they have tested after most,
  // and on a tie the one whose readings ran highest. On a single food card there
  // is only ever one candidate.
  const candidates = foods
    .map((f) => ({ food: f, values: byFood.get(f.name) ?? [] }))
    .filter((c) => c.values.length > 0)
    .sort((a, b) => {
      if (b.values.length !== a.values.length) {
        return b.values.length - a.values.length;
      }
      const mean = (v: number[]) => v.reduce((t, x) => t + x, 0) / v.length;
      return mean(b.values) - mean(a.values);
    });

  const pick = candidates[0];
  if (!pick) return null;

  const name = cleanFoodName(pick.food.name);
  const unit = preferredUnit(readings);
  // Name the food when there is more than one on the screen, so "this" can never
  // point at the wrong thing.
  const named = foods.length > 1 ? name : undefined;

  let pattern: FoodPattern | null = null;
  if (!hidden.includes(pick.food.id)) {
    pattern = foodPattern(name, pick.values, personalUsual(readings), unit);
  }
  const recall = recallLine(pick.values, unit, named);
  if (!pattern && !recall) return null;

  const hide = () => {
    mute(pick.food.id);
    setHidden((cur) => [...cur, pick.food.id]);
  };

  return (
    <div className="relative rounded-xl border border-line bg-mist p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand">
        <Droplet className="h-3.5 w-3.5" />
        Your sugar test readings
      </p>
      <p className="mt-1 pr-5 text-sm leading-relaxed text-ink">
        {pattern ? pattern.text : recall}
      </p>

      {pattern && (
        <>
          <button
            onClick={hide}
            aria-label={`Stop showing my sugar tests for ${name}`}
            className="absolute right-2 top-2 text-ink-soft/50 transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Bad news always arrives holding a lever: straight into the builder
              with this plate in it, where they can watch it turn green. */}
          {onFix && (
            <button
              onClick={onFix}
              className="mt-2.5 inline-flex items-center gap-2 rounded-full border-2 border-line bg-white px-4 py-2 text-xs font-bold text-ink transition-colors hover:border-brand"
            >
              <Wrench className="h-3.5 w-3.5" /> Make this meal better
            </button>
          )}
        </>
      )}
    </div>
  );
}
