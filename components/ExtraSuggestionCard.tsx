"use client";

import { useState } from "react";
import { Apple, Check, Clock, Plus, RefreshCw } from "lucide-react";
import { extraTimingFor, type ExtraSuggestionSet } from "@/lib/nextMeal";
import { saveCheck } from "@/lib/history";
import { trackUsage } from "@/lib/usage";
import { scoreMeal } from "@/lib/verdictEngine";

/**
 * A real, recordable card — not a buried sentence — for closing a genuine
 * remaining calorie gap. Deliberately GREEN, never the deep blue TodaysMeal
 * uses, so the two are never confused: blue is "the meal for right now",
 * green is "an extra, on top of it". Each food gets the same real direction
 * a meal card would (its own portionGuidance), not just a name and a
 * calorie count.
 *
 * `set.options` holds up to 3 real, different choices for THIS meal
 * (breakfast, lunch or dinner — `set.meal`), close to each other in
 * calories and never sharing a food with the meal templates in
 * `lib/nextMeal.ts` (a food is either "your meal" or "an extra", never
 * both). "Try a different one" cycles through them if the first is not to
 * someone's taste; whichever is showing when "I ate this too" is tapped is
 * the one that gets logged.
 *
 * Recordable: tapping "I ate this too" logs it the same way any other food
 * is logged (saveCheck), which is what lets "calories remaining today"
 * actually move — the number can only ever reflect what was truly eaten,
 * not a promise printed in copy.
 */
export default function ExtraSuggestionCard({ set }: { set: ExtraSuggestionSet }) {
  const [index, setIndex] = useState(0);
  const [ate, setAte] = useState(false);
  const option = set.options[index % set.options.length];

  const tryAnother = () => {
    setIndex((i) => (i + 1) % set.options.length);
    setAte(false);
  };

  const logEaten = () => {
    const label = option.foods.map((f) => f.name).join(", ");
    // Computed fresh through the real engine rather than assumed — every
    // combination this pool can produce scores green today
    // (scripts/calorie-ranking-test.ts checks this), but the record should
    // never silently hardcode a verdict it did not actually check.
    const { verdict } = scoreMeal(option.foods.map((food) => ({ food, portion: "normal" as const })));
    void saveCheck("meal", label, verdict);
    void trackUsage("meal_logged");
    setAte(true);
  };

  return (
    <div className="rounded-2xl bg-leaf/5 p-4 ring-1 ring-inset ring-leaf/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-leaf/15 text-leaf-deep ring-1 ring-inset ring-leaf/20">
            <Apple className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <p className="font-display text-sm font-bold text-ink">
            Eat this to make up your calorie intake today
          </p>
        </div>
        {set.options.length > 1 && (
          <button
            type="button"
            onClick={tryAnother}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-leaf-deep ring-1 ring-inset ring-leaf/25 transition-colors hover:bg-leaf/10"
          >
            <RefreshCw className="h-3 w-3" /> Try a different one
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-3">
        {option.foods.map((f, i) => (
          <li key={f.id} className="rounded-xl bg-white/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">{option.names[i]}</p>
              <p className="shrink-0 font-display text-sm font-bold text-leaf-deep">{f.calories} kcal</p>
            </div>
            <p className="mt-1 text-xs leading-snug text-ink-soft">{f.portionGuidance}</p>
            {extraTimingFor(f.id, set.meal) && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-snug text-leaf-deep">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                {extraTimingFor(f.id, set.meal)}
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
          Total: <span className="text-ink">{option.calories} kcal</span>
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
