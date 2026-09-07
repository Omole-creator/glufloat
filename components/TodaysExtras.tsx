"use client";

import { useTodaysCalories } from "@/lib/useTodaysCalories";
import ExtraSuggestionCard from "@/components/ExtraSuggestionCard";

/**
 * The green extras card, on its own, so it can sit exactly where the founder
 * wants it — directly under the blue `TodaysMeal` card (2026-08-30
 * instruction) — rather than bundled inside `DashboardSnapshot`'s tile row.
 * Renders nothing when there is no gap worth suggesting (see
 * `lib/useTodaysCalories.ts` / `suggestExtras`).
 *
 * **This used to also show a plain-text line when `shortByKcal` (a real
 * leftover once the best extras variant is already at its own capped
 * maximum) was meaningful — removed 2026-09-08, direct instruction: "the
 * honest messaging is not good for glufloat as it is meant to be automated
 * without help except they want to speak with a dietician in the premium
 * offer... do what is best to always ensure they meet the calorie intake
 * daily."** GluFloat runs automated; a human referral is what the paid
 * dietitian-chat tier is for, not a stand-in for the app's own job. The
 * real fix now lives in `lib/nextMeal.ts`'s `buildVariant()`, which keeps
 * adding more real, distinct, safely-capped food past the typical 1-2 items
 * for as long as a genuine gap remains, closing nearly every realistic
 * target automatically (measured: even a demanding 6,000kcal/day target now
 * closes within 17kcal, see `scripts/calorie-ranking-test.ts`). `shortByKcal`
 * is still computed by `useTodaysCalories` (harmless, may be useful later)
 * but is no longer read here — a genuinely unclosable gap (an extreme target
 * past what even the whole real food pool can safely supply) is left quiet
 * rather than naming a shortfall with nowhere automated to send it.
 */
export default function TodaysExtras({ show }: { show: boolean }) {
  const { extra } = useTodaysCalories(show);
  if (!extra) return null;
  return <ExtraSuggestionCard set={extra} />;
}
