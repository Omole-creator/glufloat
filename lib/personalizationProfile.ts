"use client";

import { createClient } from "@/lib/supabase/client";
import type { Goal } from "./personalization";
import type { ActivityLevel, Sex, Condition } from "./tdee";
import { normalizeMealPattern } from "./mealPattern";
import type { NamedMeal } from "./mealtime";

/**
 * A person's own goal / activity / meal-pattern / health-profile settings
 * (profiles.goals, .activity_level, .meal_pattern, and the health-profile
 * columns added by supabase/health-profile-schema.sql). Read and write are
 * best-effort, same pattern as lib/history.ts: a failed read must never break
 * the app, it just falls back to "nothing set" (all defaults, i.e. today's
 * unpersonalized behaviour) — this is also what makes it safe to deploy
 * before health-profile-schema.sql has been run: the new columns simply read
 * back as null/empty until then.
 */

export type MedTime = "morning" | "afternoon" | "evening";

export interface PersonalizationProfile {
  goals: Goal[];
  activityLevel: ActivityLevel | null;
  mealPattern: NamedMeal[];
  sex: Sex | null;
  ageYears: number | null;
  weightKg: number | null;
  heightCm: number | null;
  conditions: Condition[];
  medDosesPerDay: number | null;
  medTimes: MedTime[];
  medRelationToFood: "before" | "after" | null;
}

const EMPTY: PersonalizationProfile = {
  goals: [],
  activityLevel: null,
  mealPattern: ["breakfast", "lunch", "dinner"],
  sex: null,
  ageYears: null,
  weightKg: null,
  heightCm: null,
  conditions: [],
  medDosesPerDay: null,
  medTimes: [],
  medRelationToFood: null,
};

const VALID_GOALS = new Set<string>(["maintain", "lose_weight", "gain_weight", "build_muscle"]);
// 'active' is the pre-health-profile-schema value (see personalization-schema.sql);
// normalised to 'very_active', the closest tier on the 5-value scale.
const VALID_ACTIVITY = new Set<string>(["sedentary", "light", "moderate", "very_active", "extra_active", "active"]);
const VALID_CONDITIONS = new Set<string>(["hypertension", "high_cholesterol", "kidney_disease"]);
const VALID_MED_TIMES = new Set<string>(["morning", "afternoon", "evening"]);

/** Fired after a successful save, so anything reading the profile (today's meal) can refresh without a reload. Same shape as INTAKE_CHANGED in lib/history.ts. */
export const PERSONALIZATION_CHANGED = "glufloat:personalization-changed";

function notifyChanged(): void {
  try {
    window.dispatchEvent(new Event(PERSONALIZATION_CHANGED));
  } catch {
    /* no window (server) or blocked; nothing depends on it */
  }
}

function normalizeActivity(raw: unknown): ActivityLevel | null {
  if (typeof raw !== "string" || !VALID_ACTIVITY.has(raw)) return null;
  return raw === "active" ? "very_active" : (raw as ActivityLevel);
}

export async function readPersonalizationProfile(): Promise<PersonalizationProfile> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return EMPTY;
    const fullResult = await supabase
      .from("profiles")
      .select(
        "goals,activity_level,meal_pattern,sex,age_years,weight_kg,height_cm,conditions,med_doses_per_day,med_times,med_relation_to_food",
      )
      .eq("id", user.id)
      .single();
    // Tolerate a database that has not yet run health-profile-schema.sql —
    // without this fallback, the pre-existing goals/activity/meal-pattern
    // read would come back empty the moment this file shipped ahead of the
    // SQL, instead of just losing the new health-profile fields.
    const data: Record<string, unknown> | null = fullResult.error
      ? ((
          await supabase
            .from("profiles")
            .select("goals,activity_level,meal_pattern")
            .eq("id", user.id)
            .single()
        ).data ?? null)
      : fullResult.data;
    if (!data) return EMPTY;
    const goals = (Array.isArray(data.goals) ? data.goals : []).filter(
      (g): g is Goal => VALID_GOALS.has(g),
    );
    const conditions = (Array.isArray(data.conditions) ? data.conditions : []).filter(
      (c): c is Condition => VALID_CONDITIONS.has(c),
    );
    const medTimes = (Array.isArray(data.med_times) ? data.med_times : []).filter(
      (t): t is MedTime => VALID_MED_TIMES.has(t),
    );
    const medRelationToFood =
      data.med_relation_to_food === "before" || data.med_relation_to_food === "after"
        ? data.med_relation_to_food
        : null;
    return {
      goals,
      activityLevel: normalizeActivity(data.activity_level),
      mealPattern: normalizeMealPattern(data.meal_pattern as string[] | null),
      sex: data.sex === "male" || data.sex === "female" ? data.sex : null,
      ageYears: typeof data.age_years === "number" ? data.age_years : null,
      weightKg: typeof data.weight_kg === "number" ? data.weight_kg : null,
      heightCm: typeof data.height_cm === "number" ? data.height_cm : null,
      conditions,
      medDosesPerDay: typeof data.med_doses_per_day === "number" ? data.med_doses_per_day : null,
      medTimes,
      medRelationToFood,
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
    const full = {
      goals: p.goals,
      activity_level: p.activityLevel,
      meal_pattern: p.mealPattern,
      sex: p.sex,
      age_years: p.ageYears,
      weight_kg: p.weightKg,
      height_cm: p.heightCm,
      conditions: p.conditions,
      med_doses_per_day: p.medDosesPerDay,
      med_times: p.medTimes,
      med_relation_to_food: p.medRelationToFood,
    };
    let { error } = await supabase.from("profiles").update(full).eq("id", user.id);
    if (error) {
      // Tolerate a database that has not yet run health-profile-schema.sql —
      // same reasoning as lib/subscriptionWrite.ts: without this fallback, the
      // pre-existing goals/activity/meal-pattern save would fail outright on
      // the missing columns, the moment this file shipped ahead of the SQL.
      const { goals, activity_level, meal_pattern } = full;
      ({ error } = await supabase
        .from("profiles")
        .update({ goals, activity_level, meal_pattern })
        .eq("id", user.id));
    }
    if (error) return false;
    notifyChanged();
    return true;
  } catch {
    return false;
  }
}
