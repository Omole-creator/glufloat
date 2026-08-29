"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame, Plus } from "lucide-react";
import { caloriesEatenToday, INTAKE_CHANGED } from "@/lib/history";
import {
  readPersonalizationProfile,
  PERSONALIZATION_CHANGED,
} from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget } from "@/lib/tdee";
import { suggestExtras, type ExtraSuggestion } from "@/lib/nextMeal";
import { localDayKey } from "@/lib/mealtime";

/**
 * "Calories remaining today" — the one number the dietitian's spec asks to
 * always be visible, and the ONLY one: no carb/protein/fat breakdown is
 * shown ("they do not need to see remaining carbohydrate, protein or fat
 * grams... those calculations remain built into GluFloat's recommendation
 * engine"). Renders nothing until a Plus/Dietitian person (or a trial
 * previewing Plus) has filled in sex/age/weight/height/activity in
 * PersonalizationSettings — same "nothing to show yet" pattern as PushOptIn.
 *
 * When a real gap remains (someone whose target is bigger than 3 realistic
 * meals can reach — a genuinely active or muscle-building person), a small
 * "safe extra" suggestion appears underneath (see lib/nextMeal.ts's
 * suggestExtras). It never claims the gap always closes, since a very large
 * one honestly cannot from 3 safe portions plus 3 small extras.
 */
export default function CalorieBudget({ show }: { show: boolean }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [extra, setExtra] = useState<ExtraSuggestion | null>(null);

  const refresh = useCallback(async () => {
    if (!show) {
      setTarget(null);
      return;
    }
    const p = await readPersonalizationProfile();
    if (!p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel) {
      setTarget(null);
      return;
    }
    const dailyTarget = calorieTarget(
      tdee(bmr(p.sex, p.weightKg, p.heightCm, p.ageYears), p.activityLevel),
      p.goals,
    );
    const eatenToday = await caloriesEatenToday();
    const left = Math.max(0, dailyTarget - eatenToday);
    setTarget(dailyTarget);
    setRemaining(left);
    setExtra(suggestExtras(left, localDayKey()));
  }, [show]);

  useEffect(() => {
    refresh();
    window.addEventListener(INTAKE_CHANGED, refresh);
    window.addEventListener(PERSONALIZATION_CHANGED, refresh);
    return () => {
      window.removeEventListener(INTAKE_CHANGED, refresh);
      window.removeEventListener(PERSONALIZATION_CHANGED, refresh);
    };
  }, [refresh]);

  if (target == null || remaining == null) return null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf/10 text-leaf ring-1 ring-inset ring-leaf/15">
          <Flame className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <p className="text-sm text-ink">
          Calories remaining today: <strong className="font-display text-base">{remaining} kcal</strong>
        </p>
      </div>
      {extra && (
        <div className="mt-3 flex items-start gap-2.5 border-t border-line pt-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mist text-ink-soft">
            <Plus className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <p className="text-sm text-ink-soft">
            Still have room today? A safe extra: <strong className="text-ink">{extra.names.join(", ")}</strong> (about{" "}
            {extra.calories} kcal). This will not always fully close a big gap, but it helps.
          </p>
        </div>
      )}
    </div>
  );
}
