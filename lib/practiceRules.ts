"use client";

import { accessOnce } from "@/lib/useAccess";
import type { PracticeRules } from "@/lib/nextMeal";

/**
 * The patient's dietitian's food rules (GluFloat for dietitians), from the
 * access answer the app already has, so it costs no extra request. Null for
 * everyone else. Read by BOTH components/TodaysMeal.tsx and
 * lib/useTodaysCalories.ts, so the plate shown and the plate the calories are
 * measured against are the same plate (the "one voice" rule).
 */
export async function practiceRules(): Promise<PracticeRules | null> {
  try {
    const { access } = await accessOnce();
    const r = access.status === "subscribed" ? access.hospital?.rules : null;
    if (!r || (r.avoid.length === 0 && r.prefer.length === 0)) return null;
    return { avoid: r.avoid, prefer: r.prefer };
  } catch {
    return null;
  }
}
