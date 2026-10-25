"use client";

import { useState } from "react";
import { AlertTriangle, Apple, Clock, Plus, Pointer, RefreshCw } from "lucide-react";
import FoodIcon from "@/components/FoodIcon";
import { foodPhotoFor } from "@/lib/foodPhotos";
import { extraTimingFor, SNACK_COPY, type ExtraSuggestionSet, type ExtraOption } from "@/lib/nextMeal";
import type { NamedMeal } from "@/lib/mealtime";
import { saveCheck } from "@/lib/history";
import { trackUsage } from "@/lib/usage";
import { scoreMeal } from "@/lib/verdictEngine";
import { showToast } from "@/components/Toast";
import { FoodPhotoButton, MeasureChips } from "@/components/MeasurePhoto";

/** One food's row — shared between the typical set and any automatic top-up. */
function ExtraRow({ item, meal, snack, hideTiming }: { item: ExtraOption; meal: NamedMeal; snack: boolean; hideTiming?: boolean }) {
  const timing = !snack && !hideTiming ? extraTimingFor(item.food.id, meal) : null;
  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        {/* The food's own photo (founder, 2026-10-10), same as its search card.
            Handed this serving's words, so a bigger serving than the card's
            usual one opens as "The usual size". A food with no photo shows
            its picture chip instead. */}
        {foodPhotoFor(item.food.id) ? (
          <FoodPhotoButton food={{ ...item.food, portionGuidance: item.instruction }} size="sm" />
        ) : (
          <FoodIcon food={item.food} tone="green" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-base font-bold leading-snug text-ink">{item.name}</p>
            <p className="shrink-0 text-right font-display text-sm font-bold leading-tight text-leaf-deep">
              {item.carbG}g carbs
              <span className="block text-xs font-semibold text-ink-soft">{item.calories} kcal</span>
            </p>
          </div>
          <p className="mt-1 text-sm leading-snug text-ink-soft">{item.instruction}</p>
          <MeasureChips text={item.instruction} forFood={item.name} className="mt-2" />
          {timing && (
            <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-leaf/10 px-2.5 py-1.5 text-xs font-semibold leading-snug text-leaf-deep">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
              {timing}
            </p>
          )}
          {item.food.healthNote && (
            <p className="mt-2 flex gap-1.5 rounded-lg bg-verdict-red/[0.07] px-2.5 py-1.5 text-xs leading-snug text-ink ring-1 ring-inset ring-verdict-red/15">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verdict-red" strokeWidth={2.4} aria-hidden />
              {item.food.healthNote}
            </p>
          )}
        </div>
      </div>
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
export default function ExtraSuggestionCard({
  set,
  onLogged,
}: {
  set: ExtraSuggestionSet;
  /** Called after "I ate this too" saves (TodaysExtras then shows the snack). */
  onLogged?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const variant = set.variants[index % set.variants.length];
  // When every food shares the same "eat this before your meal" line, say it
  // once under the heading instead of under each food (2026-10-25: the same
  // sentence twice made the card look busy).
  const timings = set.snack ? [] : variant.items.map((o) => extraTimingFor(o.food.id, set.meal));
  const sharedTiming =
    timings.length > 1 && timings[0] && timings.every((t) => t === timings[0]) ? timings[0] : null;

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
    void saveCheck("meal", label, verdict, variant.totalCalories, {
      foodIds: variant.items.map((o) => o.food.id),
      sizes: variant.items.map((o) => `${Math.round(o.grams)}g`),
    });
    void trackUsage("meal_logged");
    showToast("Added to your food");
    onLogged?.();
  };

  return (
    /* Redesigned 2026-10-25 with the same words: a white card with a green
       head (green = an extra on top of the blue meal card), one row per food,
       the total as large numbers and one full-width button. */
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_-26px_rgba(30,90,45,0.55)] ring-1 ring-leaf/20">
      <div className="relative overflow-hidden bg-gradient-to-br from-leaf to-leaf-deep px-4 py-4 text-white sm:px-5">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-inset ring-white/30">
            <Apple className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold leading-snug sm:text-lg">
              {set.snack ? SNACK_COPY[set.snack].title : "Eat this to make up your calorie intake today"}
            </p>
            {set.snack && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/85">
                <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                {SNACK_COPY[set.snack].when}
              </p>
            )}
          </div>
        </div>
        {sharedTiming && (
          <p className="relative mt-3 flex items-start gap-1.5 text-xs font-semibold leading-snug text-white/90">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
            {sharedTiming}
          </p>
        )}
        {set.variants.length > 1 && (
          <button
            type="button"
            onClick={tryAnother}
            className="relative mt-3 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white hover:text-leaf-deep"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {set.snack ? "Try another snack" : "Try a different snack"}
          </button>
        )}
      </div>

      <ul className="divide-y divide-line">
        {variant.items.slice(0, variant.coreCount).map((item) => (
          <ExtraRow key={item.food.id} item={item} meal={set.meal} snack={!!set.snack} hideTiming={!!sharedTiming} />
        ))}
      </ul>

      {variant.items.length > variant.coreCount && (
        <>
          <p className="border-t border-line bg-mint/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-leaf-deep">
            To fully meet today's number
          </p>
          <ul className="divide-y divide-line">
            {variant.items.slice(variant.coreCount).map((item) => (
              <ExtraRow key={item.food.id} item={item} meal={set.meal} snack={!!set.snack} hideTiming={!!sharedTiming} />
            ))}
          </ul>
        </>
      )}

      <div className="space-y-3 border-t border-line bg-mint/40 px-4 py-4 sm:px-5">
        <p className="text-sm font-semibold text-ink-soft">
          Total: <span className="font-display text-xl font-bold text-ink">{variant.totalCarbG}g carbs</span>{" "}
          <span className="text-ink-soft">({variant.totalCalories} kcal)</span>
        </p>
        <button
          type="button"
          onClick={logEaten}
          className="cta-pulse flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-leaf to-leaf-deep px-4 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="h-4 w-4" strokeWidth={3} /> {set.snack ? "I ate my snack" : "I ate this too"}
          <span aria-hidden className="tap-bob">
            <Pointer className="h-4 w-4" strokeWidth={2.4} />
          </span>
        </button>
      </div>
    </div>
  );
}
