"use client";

import { useState } from "react";
import { Apple, Check, Clock, Plus } from "lucide-react";
import { EXTRA_TIMING, type ExtraSuggestion } from "@/lib/nextMeal";
import { saveCheck } from "@/lib/history";
import { trackUsage } from "@/lib/usage";
import { scoreMeal } from "@/lib/verdictEngine";

/**
 * A real, recordable card — not a buried sentence — for closing a genuine
 * remaining calorie gap after breakfast/lunch/dinner. Deliberately GREEN,
 * never the deep blue TodaysMeal uses, so the two are never confused: blue
 * is "the meal for right now", green is "an extra, on top of it". Each food
 * gets the same real direction a meal card would (its own portionGuidance),
 * not just a name and a calorie count.
 *
 * Recordable: tapping "I ate this too" logs it the same way any other food
 * is logged (saveCheck), which is what lets "calories remaining today"
 * actually reach zero — the number can only ever reflect what was truly
 * eaten, so this is what closes the gap, not a promise printed in copy.
 */
export default function ExtraSuggestionCard({ extra }: { extra: ExtraSuggestion }) {
  const [ate, setAte] = useState(false);

  const logEaten = () => {
    const label = extra.foods.map((f) => f.name).join(", ");
    // Computed fresh through the real engine rather than assumed — every
    // combination the pool can produce scores green today
    // (scripts/calorie-ranking-test.ts checks this), but the record should
    // never silently hardcode a verdict it did not actually check.
    const { verdict } = scoreMeal(extra.foods.map((food) => ({ food, portion: "normal" as const })));
    void saveCheck("meal", label, verdict);
    void trackUsage("meal_logged");
    setAte(true);
  };

  return (
    <div className="rounded-2xl bg-leaf/5 p-4 ring-1 ring-inset ring-leaf/20">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-leaf/15 text-leaf-deep ring-1 ring-inset ring-leaf/20">
          <Apple className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <p className="font-display text-sm font-bold text-ink">Still have room today? An extra</p>
      </div>

      <ul className="mt-3 space-y-3">
        {extra.foods.map((f, i) => (
          <li key={f.id} className="rounded-xl bg-white/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">{extra.names[i]}</p>
              <p className="shrink-0 font-display text-sm font-bold text-leaf-deep">{f.calories} kcal</p>
            </div>
            <p className="mt-1 text-xs leading-snug text-ink-soft">{f.portionGuidance}</p>
            {EXTRA_TIMING[f.id] && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-snug text-leaf-deep">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                {EXTRA_TIMING[f.id]}
              </p>
            )}
            {f.healthNote && (
              <p className="mt-1.5 rounded-lg bg-verdict-red/10 px-2 py-1.5 text-xs leading-snug text-ink">
                {f.healthNote}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-leaf/15 pt-3">
        <p className="text-sm font-semibold text-ink-soft">
          Total: <span className="text-ink">{extra.calories} kcal</span>
        </p>
        <button
          type="button"
          onClick={logEaten}
          disabled={ate}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            ate ? "bg-leaf/15 text-leaf-deep" : "bg-leaf text-white hover:bg-leaf-deep"
          }`}
        >
          {ate ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} /> Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={3} /> I ate this too
            </>
          )}
        </button>
      </div>
    </div>
  );
}
