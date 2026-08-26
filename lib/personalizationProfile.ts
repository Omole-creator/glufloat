"use client";

import { createClient } from "@/lib/supabase/client";
import type { Goal, ActivityLevel } from "./personalization";
import { normalizeMealPattern } from "./mealPattern";
import type { NamedMeal } from "./mealtime";

/**
 * A person's own goal / activity / meal-pattern settings (profiles.goals,
 * .activity_level, .meal_pattern). Read and write are best-effort, same
 * pattern as lib/history.ts: a failed read must never break the app, it just
 * falls back to "nothing set" (all defaults, i.e. today's unpersonalized
 * behaviour).
 */

export interface PersonalizationProfile {
  goals: Goal[];
  activityLevel: ActivityLevel | null;
  mealPattern: NamedMeal[];
}

const EMPTY: PersonalizationProfile = {
  goals: [],
  activityLevel: null,
  mealPattern: ["breakfast", "lunch", "dinner"],
};

const VALID_GOALS = new Set<string>(["maintain", "lose_weight", "gain_weight", "build_muscle"]);
const VALID_ACTIVITY = new Set<string>(["sedentary", "moderate", "active"]);

/** Fired after a successful save, so anything reading the profile (today's meal) can refresh without a reload. Same shape as INTAKE_CHANGED in lib/history.ts. */
export const PERSONALIZATION_CHANGED = "glufloat:personalization-changed";

function notifyChanged(): void {
  try {
    window.dispatchEvent(new Event(PERSONALIZATION_CHANGED));
  } catch {
    /* no window (server) or blocked; nothing depends on it */
  }
}

export async function readPersonalizationProfile(): Promise<PersonalizationProfile> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return EMPTY;
    const { data } = await supabase
      .from("profiles")
      .select("goals,activity_level,meal_pattern")
      .eq("id", user.id)
      .single();
    if (!data) return EMPTY;
    const goals = (Array.isArray(data.goals) ? data.goals : []).filter(
      (g): g is Goal => VALID_GOALS.has(g),
    );
    const activityLevel = VALID_ACTIVITY.has(data.activity_level as string)
      ? (data.activity_level as ActivityLevel)
      : null;
    return {
      goals,
      activityLevel,
      mealPattern: normalizeMealPattern(data.meal_pattern as string[] | null),
    };
  } catch {
    return EMPTY;
  }
}

export async function savePersonalizationProfile(p: PersonalizationProfile): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("profiles")
      .update({
        goals: p.goals,
        activity_level: p.activityLevel,
        meal_pattern: p.mealPattern,
      })
      .eq("id", user.id);
    if (error) return false;
    notifyChanged();
    return true;
  } catch {
    return false;
  }
}
