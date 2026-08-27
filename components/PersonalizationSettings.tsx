"use client";

import { useEffect, useState } from "react";
import { Check, Target } from "lucide-react";
import {
  GOALS,
  ACTIVITY_LEVELS,
  GOAL_LABEL,
  ACTIVITY_LABEL,
  type Goal,
  type ActivityLevel,
} from "@/lib/personalization";
import {
  readPersonalizationProfile,
  savePersonalizationProfile,
} from "@/lib/personalizationProfile";
import type { NamedMeal } from "@/lib/mealtime";
import { showToast } from "@/components/Toast";

const MEAL_LABEL: Record<NamedMeal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};
const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-leaf text-white"
          : "bg-mist text-ink-soft ring-1 ring-inset ring-line hover:bg-mint"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Where a Plus/Dietitian person (and a trial previewing Plus) sets goal,
 * activity level, and which meals they actually eat. Nothing here writes a
 * new number to any food card — it only feeds lib/personalization.ts's
 * ranking bias and lib/mealPattern.ts's display filter. Meal pattern is
 * always shown, even to someone with no goal access, since it is free on
 * every tier — the caller controls that via `showGoals`.
 */
export default function PersonalizationSettings({ showGoals }: { showGoals: boolean }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [mealPattern, setMealPattern] = useState<NamedMeal[]>(MEALS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    readPersonalizationProfile().then((p) => {
      setGoals(p.goals);
      setActivityLevel(p.activityLevel);
      setMealPattern(p.mealPattern);
      setLoaded(true);
    });
  }, []);

  const toggleGoal = (g: Goal) =>
    setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  // Free choice of any combination, including all 3 or just 1. An empty
  // selection is not blocked here — normalizeMealPattern (lib/mealPattern.ts)
  // already treats "nothing set" as "eats all 3", so there is nothing unsafe
  // about letting someone freely toggle every chip. The earlier version
  // silently refused the last remaining chip to avoid an empty state, which
  // just looked like the third meal did not respond to a click.
  const toggleMeal = (m: NamedMeal) =>
    setMealPattern((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const save = async () => {
    setSaved(false);
    const ok = await savePersonalizationProfile({ goals, activityLevel, mealPattern });
    if (ok) {
      setSaved(true);
      showToast("Saved");
      setTimeout(() => setSaved(false), 2500);
    }
  };

  if (!loaded) return null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
          <Target className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        <p className="font-display text-base font-bold text-ink">Make GluFloat fit you</p>
      </div>

      <p className="mt-3 text-sm font-semibold text-ink-soft">Which meals do you eat?</p>
      <p className="mt-0.5 text-xs text-ink-soft">Select all that apply.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MEALS.map((m) => (
          <Chip key={m} active={mealPattern.includes(m)} onClick={() => toggleMeal(m)}>
            {MEAL_LABEL[m]}
          </Chip>
        ))}
      </div>

      {showGoals && (
        <>
          <p className="mt-4 text-sm font-semibold text-ink-soft">What are your goals?</p>
          <p className="mt-0.5 text-xs text-ink-soft">Select all that apply.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g} active={goals.includes(g)} onClick={() => toggleGoal(g)}>
                {GOAL_LABEL[g]}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-ink-soft">How active are you?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <Chip
                key={a}
                active={activityLevel === a}
                onClick={() => setActivityLevel((cur) => (cur === a ? null : a))}
              >
                {ACTIVITY_LABEL[a]}
              </Chip>
            ))}
          </div>
        </>
      )}

      <button
        onClick={save}
        className="mt-5 flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Saved
          </>
        ) : (
          "Save"
        )}
      </button>
    </div>
  );
}
