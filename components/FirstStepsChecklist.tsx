"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ListChecks, X } from "lucide-react";
import { recentChecks, INTAKE_CHANGED } from "@/lib/history";
import { readPersonalizationProfile, PERSONALIZATION_CHANGED } from "@/lib/personalizationProfile";
import { currentMeal } from "@/lib/mealtime";

/** Once closed on this device, stays closed for good. */
const DISMISS_KEY = "gf_first_steps_dismissed";

function hasFullProfile(p: {
  sex: unknown;
  ageYears: unknown;
  weightKg: unknown;
  heightCm: unknown;
  activityLevel: unknown;
}): boolean {
  return Boolean(p.sex && p.ageYears && p.weightKg && p.heightCm && p.activityLevel);
}

/**
 * A short "first two things to do" card, shown only until both are done, so a
 * brand new account leaves its very first visit with something saved on it
 * instead of a plain lookup.
 *
 * The reasoning: without a saved meal or a filled-in profile, this app looks
 * and behaves exactly like asking a chatbot a one-off question — nothing is
 * remembered, so nothing brings the person back. The two steps here are the
 * cheapest way to make the account "remember" something on day one: a meal
 * they actually ate, and the numbers that let "Make it fit me" start
 * working. Neither step is forced — this is a nudge, not a gate, since a
 * hard wall before someone has seen any value tends to push people away
 * rather than pull them in.
 *
 * "Set up Fit me" only shows for a tier that can actually use it
 * (`showFitMe`, `canUseGoalPersonalization(access)`) — a Basic user is never
 * shown a step for a screen they cannot use.
 */
export default function FirstStepsChecklist({
  showFitMe,
  onGoToFitMe,
  onGoToMeal,
}: {
  showFitMe: boolean;
  onGoToFitMe: () => void;
  onGoToMeal: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasMeal, setHasMeal] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  const load = useCallback(() => {
    void Promise.all([recentChecks(1), readPersonalizationProfile()]).then(([checks, profile]) => {
      setHasMeal(checks.length > 0);
      setHasProfile(hasFullProfile(profile));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    load();
    window.addEventListener(INTAKE_CHANGED, load);
    window.addEventListener(PERSONALIZATION_CHANGED, load);
    return () => {
      window.removeEventListener(INTAKE_CHANGED, load);
      window.removeEventListener(PERSONALIZATION_CHANGED, load);
    };
  }, [load]);

  // Points at whichever meal the blue card is showing right now, so the
  // first thing a new user does is pick the app's own recommendation
  // instead of searching for something themselves.
  const meal = currentMeal();
  const mealStepLabel =
    meal === "breakfast"
      ? "Eat today's breakfast"
      : meal === "lunch"
        ? "Eat today's lunch"
        : "Eat today's dinner";

  const steps = [
    { key: "meal", label: mealStepLabel, done: hasMeal, onClick: onGoToMeal },
    ...(showFitMe
      ? [{ key: "profile", label: "Set up Fit me", done: hasProfile, onClick: onGoToFitMe }]
      : []),
  ];
  const allDone = steps.every((s) => s.done);

  if (!loaded || dismissed || allDone) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative rounded-2xl border border-brand/15 bg-brand/5 p-4">
      <button
        onClick={dismiss}
        aria-label="Hide the first steps list"
        className="absolute right-3 top-3 text-ink-soft/50 transition-colors hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
        <ListChecks className="h-4 w-4 text-brand" strokeWidth={2.4} />
        Two quick things to start with
      </p>
      <div className="mt-3 space-y-2">
        {steps.map((s) => (
          <button
            key={s.key}
            onClick={s.onClick}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
              s.done ? "bg-white/60 text-ink-soft" : "bg-white text-ink hover:bg-white/80"
            }`}
          >
            {s.done ? (
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-leaf-deep" strokeWidth={2.4} />
            ) : (
              <Circle className="h-4.5 w-4.5 shrink-0 text-brand/40" strokeWidth={2.4} />
            )}
            <span className={s.done ? "line-through" : ""}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
