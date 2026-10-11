"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useTodaysCalories } from "@/lib/useTodaysCalories";
import { localDayKey } from "@/lib/mealtime";
import type { ExtraSuggestionSet, SnackTime } from "@/lib/nextMeal";
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
// The meal whose extras were eaten today ("<day>:<meal>"), so a reload keeps
// showing the snack instead of the extras card again.
const DONE_KEY = "gf_extras_done";

const SNACK_WORD: Record<SnackTime, string> = {
  "mid-morning": "mid-morning",
  afternoon: "afternoon",
  bedtime: "bedtime",
};

/**
 * ONE green card under the blue meal card, never two (founder, 2026-10-11).
 *
 * On a very high target there is both the meal's extras and a snack for
 * later (mid-morning, afternoon or bedtime). Showing both at once read as two
 * cards of the same thing. So the extras card shows first, and the moment the
 * person taps "I ate this too" it is replaced by the snack card, with a line
 * saying what it is for, and scrolled into view so it is not missed. The snack
 * shown is the one worked out at that moment (what is left after the extras),
 * held so a refresh of the numbers cannot swap it out from under them.
 */
export default function TodaysExtras({ show }: { show: boolean }) {
  const { extra, snack } = useTodaysCalories(show);
  const [held, setHeld] = useState<ExtraSuggestionSet | null>(null);
  const [justSwitched, setJustSwitched] = useState(false);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const snackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setDoneKey(localStorage.getItem(DONE_KEY));
    } catch {
      /* storage blocked: start from the extras card */
    }
  }, []);

  useEffect(() => {
    if (justSwitched) snackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [justSwitched]);

  const meal = extra?.meal ?? snack?.meal ?? null;
  const key = meal ? `${localDayKey()}:${meal}` : null;
  const extrasEaten = !!key && doneKey === key;

  const onExtrasEaten = () => {
    if (!key) return;
    try {
      localStorage.setItem(DONE_KEY, key);
    } catch {
      /* the snack still shows for this visit */
    }
    setHeld(snack);
    setDoneKey(key);
    setJustSwitched(true);
  };

  const snackToShow = held ?? snack;
  if (!extrasEaten && extra) {
    return <ExtraSuggestionCard key="extras" set={extra} onLogged={onExtrasEaten} />;
  }
  if (!snackToShow) return null;
  return (
    <div ref={snackRef} className="scroll-mt-24 space-y-2">
      {justSwitched && snackToShow.snack && (
        <p className="fade-in flex items-center gap-2 rounded-2xl bg-leaf px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(62,155,79,0.7)]">
          <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
          Saved. Here is what to eat at {SNACK_WORD[snackToShow.snack]}.
        </p>
      )}
      <ExtraSuggestionCard key="snack" set={snackToShow} />
    </div>
  );
}
