"use client";

import { useState } from "react";
import { Apple, Clock, Plus, RefreshCw } from "lucide-react";
import { extraTimingFor, type ExtraSuggestionSet, type ExtraOption } from "@/lib/nextMeal";
import type { NamedMeal } from "@/lib/mealtime";
import { saveCheck } from "@/lib/history";
import { trackUsage } from "@/lib/usage";
import { scoreMeal } from "@/lib/verdictEngine";
import { showToast } from "@/components/Toast";

/** One food's row — shared between the typical set and any automatic top-up. */
function ExtraRow({ item, meal }: { item: ExtraOption; meal: NamedMeal }) {
  return (
    <li className="rounded-xl bg-white/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-ink">{item.name}</p>
        <p className="shrink-0 font-display text-sm font-bold text-leaf-deep">{item.calories} kcal</p>
      </div>
      <p className="mt-1 text-xs leading-snug text-ink-soft">{item.instruction}</p>
      {extraTimingFor(item.food.id, meal) && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-snug text-leaf-deep">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
          {extraTimingFor(item.food.id, meal)}
        </p>
      )}
      {item.food.healthNote && (
        <p className="mt-1.5 rounded-lg bg-verdict-red/10 px-2 py-1.5 text-xs leading-snug text-ink">
          {item.food.healthNote}
        </p>
      )}
    </li>
  );
}

/**
 * A real, recordable card — not a buried sentence — for closing THIS meal's
 * own share of today's calorie gap. Deliberately GREEN, never the deep blue
 * TodaysMeal uses, so the two are never confused: blue is "the meal for
 * right now", green is "extra, on top of it". Each food gets the same real
 * direction a meal card would (its own exact instruction), not just a name
 * and a calorie count.
 *
 * `set.variants` holds 2 real, independently-complete ways to close this
 * meal's gap. Each item is a DIFFERENT real food, sized to a whole,
 * countable amount — never the same food repeated ("× 2 ... this size, 2
 * times today" was confusing and reversed on direct instruction). "Try a
 * different snack" swaps the WHOLE variant, never one item within it.
 * "I ate this too" logs every item in the currently-shown variant, together,
 * as one entry.
 *
 * **A variant is usually 1-2 items (`variant.coreCount`), but can hold more**
 * (2026-09-08: automated calorie closure, direct instruction — "do what is
 * best to always ensure they meet the calorie intake daily", no dietitian
 * referral). Past `coreCount`, `lib/nextMeal.ts`'s `buildVariant()` keeps
 * adding more real, distinct, safely-capped food only because the typical
 * set alone could not reach the day's real need — rare in practice (most
 * gaps still close within 1-2 items, unchanged). Items beyond `coreCount`
 * render under a small "to fully meet today's number" divider, so a bigger
 * day still reads as "your usual pick, plus a little more" rather than one
 * undifferentiated pile.
 *
 * **Stays loggable after a tap — it never disables itself** (the app must
 * always meet a person's real calorie need, never cap it — lib/tdee.ts). If
 * the day's numbers genuinely call for it again later (real intake moved
 * the gap), the card simply appears again; nothing here silently blocks a
 * second, real log.
 */
export default function ExtraSuggestionCard({ set }: { set: ExtraSuggestionSet }) {
  const [index, setIndex] = useState(0);
  const variant = set.variants[index % set.variants.length];

  const tryAnother = () => {
    setIndex((i) => (i + 1) % set.variants.length);
  };

  const logEaten = () => {
    const allFoods = variant.items.map((o) => o.food);
    const label = allFoods.map((f) => f.name).join(", ");
    // Computed fresh through the real engine rather than assumed — every
    // combination this pool can produce scores green today
    // (scripts/calorie-ranking-test.ts checks this), but the record should
    // never silently hardcode a verdict it did not actually check.
    const { verdict } = scoreMeal(allFoods.map((food) => ({ food, portion: "normal" as const })));
    // This variant can be a SCALED serving past a food's normal amount (e.g.
    // 60g of cashew nuts, not the base 30g) — pass the exact already-computed
    // total so caloriesEatenToday() credits what was really eaten instead of
    // re-deriving it from the food's flat base calories and under-counting.
    // See supabase/meal-calories-schema.sql.
    void saveCheck("meal", label, verdict, variant.totalCalories);
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
        {variant.items.slice(0, variant.coreCount).map((item) => (
          <ExtraRow key={item.food.id} item={item} meal={set.meal} />
        ))}
      </ul>

      {variant.items.length > variant.coreCount && (
        <>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-leaf-deep/80">
            To fully meet today's number
          </p>
          <ul className="mt-2 space-y-3">
            {variant.items.slice(variant.coreCount).map((item) => (
              <ExtraRow key={item.food.id} item={item} meal={set.meal} />
            ))}
          </ul>
        </>
      )}

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
