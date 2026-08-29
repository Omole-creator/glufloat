"use client";

import { useTodaysCalories } from "@/lib/useTodaysCalories";
import ExtraSuggestionCard from "@/components/ExtraSuggestionCard";

/**
 * The green extras card, on its own, so it can sit exactly where the founder
 * wants it — directly under the blue `TodaysMeal` card (2026-08-30
 * instruction) — rather than bundled inside `DashboardSnapshot`'s tile row.
 * Renders nothing when there is no gap worth suggesting (see
 * `lib/useTodaysCalories.ts` / `suggestExtras`).
 */
export default function TodaysExtras({ show }: { show: boolean }) {
  const { extra } = useTodaysCalories(show);
  if (!extra) return null;
  return <ExtraSuggestionCard extra={extra} />;
}
