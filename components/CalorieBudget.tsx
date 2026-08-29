"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { caloriesEatenToday, INTAKE_CHANGED } from "@/lib/history";
import {
  readPersonalizationProfile,
  PERSONALIZATION_CHANGED,
} from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget } from "@/lib/tdee";

/**
 * "Calories remaining today" — the one number the dietitian's spec asks to
 * always be visible, and the ONLY one: no carb/protein/fat breakdown is
 * shown ("they do not need to see remaining carbohydrate, protein or fat
 * grams... those calculations remain built into GluFloat's recommendation
 * engine"). Renders nothing until a Plus/Dietitian person (or a trial
 * previewing Plus) has filled in sex/age/weight/height/activity in
 * PersonalizationSettings — same "nothing to show yet" pattern as PushOptIn.
 */
export default function CalorieBudget({ show }: { show: boolean }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);

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
    setTarget(dailyTarget);
    setRemaining(Math.max(0, dailyTarget - eatenToday));
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
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf/10 text-leaf ring-1 ring-inset ring-leaf/15">
        <Flame className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <p className="text-sm text-ink">
        Calories remaining today: <strong className="font-display text-base">{remaining} kcal</strong>
      </p>
    </div>
  );
}
