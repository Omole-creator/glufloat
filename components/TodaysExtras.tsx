"use client";

import { useTodaysCalories } from "@/lib/useTodaysCalories";
import ExtraSuggestionCard from "@/components/ExtraSuggestionCard";

/** How small a genuine shortfall has to be before it is not worth saying —
 *  matches lib/nextMeal.ts's own MIN_GAP_KCAL threshold for "worth a card". */
const MIN_SHORTFALL_KCAL = 100;

/**
 * The green extras card, on its own, so it can sit exactly where the founder
 * wants it — directly under the blue `TodaysMeal` card (2026-08-30
 * instruction) — rather than bundled inside `DashboardSnapshot`'s tile row.
 * Renders nothing when there is no gap worth suggesting AND nothing was left
 * unclosed (see `lib/useTodaysCalories.ts` / `suggestExtras`).
 *
 * `shortByKcal` (added 2026-09-08) is a real leftover: the app's safe, real
 * extras are already at their own capped maximum and still cannot reach the
 * person's calorie need. This is honest by design, not a bug to silence —
 * see the note above `useTodaysCalories` in lib/useTodaysCalories.ts. It
 * renders even when `extra` itself is null, since a shortfall can exist with
 * no card to attach it to (the whole gap was too big for even one item).
 */
export default function TodaysExtras({ show }: { show: boolean }) {
  const { extra, shortByKcal } = useTodaysCalories(show);
  const showShortfall = shortByKcal >= MIN_SHORTFALL_KCAL;
  if (!extra && !showShortfall) return null;
  return (
    <div className="space-y-3">
      {extra && <ExtraSuggestionCard set={extra} />}
      {showShortfall && (
        <div className="rounded-2xl bg-mist p-4 ring-1 ring-inset ring-line">
          <p className="text-sm leading-snug text-ink-soft">
            Even with this, your target today is still about {shortByKcal} kcal
            more than we can safely add in one sitting. If you need more food
            than this, ask your dietitian about a bigger meal size for you.
          </p>
        </div>
      )}
    </div>
  );
}
