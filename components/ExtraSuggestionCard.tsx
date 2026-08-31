"use client";

import { useState } from "react";
import { Apple, Clock, Plus, RefreshCw } from "lucide-react";
import { extraTimingFor, type ExtraSuggestionSet, type ExtraVariant } from "@/lib/nextMeal";
import type { Food } from "@/lib/types";
import { saveCheck } from "@/lib/history";
import { trackUsage } from "@/lib/usage";
import { scoreMeal } from "@/lib/verdictEngine";
import { showToast } from "@/components/Toast";

/**
 * A real, recordable card — not a buried sentence — for closing THIS meal's
 * own share of today's calorie gap. Deliberately GREEN, never the deep blue
 * TodaysMeal uses, so the two are never confused: blue is "the meal for
 * right now", green is "extra, on top of it". Each food gets the same real
 * direction a meal card would (its own portionGuidance), not just a name
 * and a calorie count.
 *
 * `set.variants` holds 3 real, independently-complete ways to close this
 * meal's gap (founder instruction, 2026-08-31: "they are meant to have 3
 * options each time of the day"). Each variant on its own already sums to
 * this meal's own fair share of the day's target ("all recommended meals
 * must add up at the end of the day to meet each user calorie goals"), so
 * whichever ONE a person picks and eats, the day's numbers still work.
 * "Try a different snack" cycles the WHOLE variant, not one item within it
 * — swapping never leaves a half-closed gap. "I ate this too" logs every
 * item in the currently-shown variant, together, as one entry.
 *
 * **Stays loggable after a tap — it never disables itself** (the app must
 * always meet a person's real calorie need, never cap it — lib/tdee.ts). If
 * the day's numbers genuinely call for it again later (real intake moved
 * the gap), the card simply appears again; nothing here silently blocks a
 * second, real log.
 *
 * Recordable: tapping "I ate this too" logs it the same way any other food
 * is logged (saveCheck), which is what lets "calories remaining today"
 * actually move — the number can only ever reflect what was truly eaten,
 * not a promise printed in copy.
 */
interface GroupedExtra {
  food: Food;
  name: string;
  count: number;
}

/**
 * A big gap can need more servings than there are distinct real combinations
 * for a meal (only 3), so the same safe food may appear more than once
 * within one variant — grouped here into one row with a "×N" count, same
 * house rule as `lib/shareMessage.ts` deduping a repeated `healthNote`:
 * showing the same name, portion line and caution 3 times over is noise,
 * not information.
 */
function groupExtras(variant: ExtraVariant): GroupedExtra[] {
  const byId = new Map<string, GroupedExtra>();
  for (const option of variant.items) {
    option.foods.forEach((f, i) => {
      const existing = byId.get(f.id);
      if (existing) existing.count += 1;
      else byId.set(f.id, { food: f, name: option.names[i], count: 1 });
    });
  }
  return [...byId.values()];
}

export default function ExtraSuggestionCard({ set }: { set: ExtraSuggestionSet }) {
  const [index, setIndex] = useState(0);
  const variant = set.variants[index % set.variants.length];
  const grouped = groupExtras(variant);

  const tryAnother = () => {
    setIndex((i) => (i + 1) % set.variants.length);
  };

  const logEaten = () => {
    const allFoods = variant.items.flatMap((o) => o.foods);
    const label = allFoods.map((f) => f.name).join(", ");
    // Computed fresh through the real engine rather than assumed — every
    // combination this pool can produce scores green today
    // (scripts/calorie-ranking-test.ts checks this), but the record should
    // never silently hardcode a verdict it did not actually check.
    const { verdict } = scoreMeal(allFoods.map((food) => ({ food, portion: "normal" as const })));
    void saveCheck("meal", label, verdict);
    void trackUsage("meal_logged");
    showToast("Added to your food");
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
        {set.variants.length > 1 && (
          <button
            type="button"
            onClick={tryAnother}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-leaf-deep ring-1 ring-inset ring-leaf/25 transition-colors hover:bg-leaf/10"
          >
            <RefreshCw className="h-3 w-3" /> Try a different snack
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-3">
        {grouped.map(({ food: f, name, count }) => (
          <li key={f.id} className="rounded-xl bg-white/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">
                {name}
                {count > 1 && <span className="text-ink-soft"> × {count}</span>}
              </p>
              <p className="shrink-0 font-display text-sm font-bold text-leaf-deep">
                {(f.calories ?? 0) * count} kcal
              </p>
            </div>
            <p className="mt-1 text-xs leading-snug text-ink-soft">{f.portionGuidance}</p>
            {count > 1 && (
              <p className="mt-1 text-xs leading-snug text-ink-soft">
                That is this size, {count} times today.
              </p>
            )}
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
          Total: <span className="text-ink">{variant.totalCalories} kcal</span>
        </p>
        <button
          type="button"
          onClick={logEaten}
          className="flex items-center gap-1.5 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-leaf-deep"
        >
          <Plus className="h-4 w-4" strokeWidth={3} /> I ate this too
        </button>
      </div>
    </div>
  );
}
