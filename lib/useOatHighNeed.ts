"use client";

import { useEffect, useState } from "react";
import { canUseGoalPersonalization } from "@/lib/account";
import { accessOnce } from "@/lib/useAccess";
import { OAT_HIGH_NEED_TARGET } from "@/lib/nextMeal";
import { PERSONALIZATION_CHANGED, readPersonalizationProfile } from "@/lib/personalizationProfile";
import { clinicalTarget } from "@/lib/tdee";

/**
 * Is this person's daily target high enough for oat swallow once a day
 * (lib/nextMeal.ts OAT_HIGH_NEED_TARGET)? Same gate as the blue card: only
 * somebody with a calorie target at all. Any failure reads as no, so the card
 * keeps saying 3 times a week.
 */
export function useOatHighNeed(): boolean {
  const [high, setHigh] = useState(false);
  useEffect(() => {
    let live = true;
    const read = async () => {
      try {
        const [{ access }, p] = await Promise.all([accessOnce(), readPersonalizationProfile()]);
        const known = canUseGoalPersonalization(access) && p.sex && p.ageYears && p.weightKg && p.heightCm && p.activityLevel;
        const target = known ? clinicalTarget(p.sex!, p.weightKg!, p.heightCm!, p.ageYears!, p.activityLevel!, p.goals).target : 0;
        if (live) setHigh(target >= OAT_HIGH_NEED_TARGET);
      } catch {
        if (live) setHigh(false);
      }
    };
    void read();
    window.addEventListener(PERSONALIZATION_CHANGED, read);
    return () => {
      live = false;
      window.removeEventListener(PERSONALIZATION_CHANGED, read);
    };
  }, []);
  return high;
}
