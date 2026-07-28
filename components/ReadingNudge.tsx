"use client";

import { useCallback, useEffect, useState } from "react";
import { Target, X } from "lucide-react";
import { READINGS_CHANGED } from "@/lib/glucoseLog";
import { readingsByFood } from "@/lib/glucosePattern";
import { checkedMeals, loggedFoodCounts } from "@/lib/history";
import { cleanFoodName } from "@/lib/foodName";

/** Foods this device has already been nudged about. */
const KEY = "gf_strip_nudge";
/** Times eaten before a food is worth spending a strip on. Once is not a habit. */
const MIN_TIMES = 2;

function seen(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function remember(name: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set([...seen(), name]))));
  } catch {
    /* storage blocked; it will simply come round again */
  }
}

/**
 * "Where to spend your next strip."
 *
 * Test strips cost real money, so somebody here may only test once or twice a
 * week. Every other app treats that as the user failing to log properly. It is
 * the opposite: a person with eight strips a month has eight questions they can
 * afford to answer, and the app knows which question is worth asking. It knows
 * what they eat a lot (their own eaten log) and which of those foods it has never
 * seen a reading for, so it can point the strip at the gap.
 *
 * That turns testing less often from a hole in the data into the thing the app is
 * most useful for.
 *
 * It only appears once somebody has logged at least one reading. Before that the
 * reading box above is already inviting them, and a second nudge on a fresh
 * account is just noise. A quiet strip, never a card: it must not compete with
 * the meal answer.
 */
export default function ReadingNudge() {
  const [food, setFood] = useState<{ name: string; times: number } | null>(null);

  const load = useCallback(() => {
    void Promise.all([loggedFoodCounts(), checkedMeals()]).then(
      ([counts, checks]) => {
        const anyReading = checks.some((c) => c.readings.length > 0);
        if (!anyReading) {
          setFood(null);
          return;
        }
        const tested = readingsByFood(checks);
        const already = seen();
        // The food they eat most that has never been measured.
        let best: { name: string; times: number } | null = null;
        for (const [name, times] of counts) {
          if (times < MIN_TIMES) continue;
          if (tested.has(name)) continue;
          if (already.includes(name)) continue;
          if (!best || times > best.times) best = { name, times };
        }
        setFood(best);
      },
    );
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(READINGS_CHANGED, load);
    return () => window.removeEventListener(READINGS_CHANGED, load);
  }, [load]);

  if (!food) return null;

  const shown = cleanFoodName(food.name);

  const dismiss = () => {
    remember(food.name);
    setFood(null);
  };

  return (
    <div className="relative rounded-2xl bg-white px-4 py-3.5 pr-9 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.04]">
      <p className="flex items-start gap-2 text-sm text-ink">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <span>
          You have eaten <strong className="font-semibold">{shown}</strong>{" "}
          {food.times} times in the last month, and we have never seen a sugar
          test after it. Next time you test your sugar, do it after {shown}.
        </span>
      </p>
      <button
        onClick={dismiss}
        aria-label={`Stop asking me to test my sugar after ${shown}`}
        className="absolute right-2.5 top-2.5 text-ink-soft/50 transition-colors hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
