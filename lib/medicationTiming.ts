import type { NamedMeal } from "./mealtime";
import type { MedTime } from "./personalizationProfile";

/**
 * Which meal card a medication dose tags, from the founder's Q1-Q3
 * questionnaire (times of day, not exact clock minutes) mapped onto the same
 * 3-band clock the rest of the app already uses (lib/mealtime.ts).
 */
const MED_TIME_TO_MEAL: Record<MedTime, NamedMeal> = {
  morning: "breakfast",
  afternoon: "lunch",
  evening: "dinner",
};

export function medicationAppliesToMeal(medTimes: MedTime[], meal: NamedMeal): boolean {
  return medTimes.some((t) => MED_TIME_TO_MEAL[t] === meal);
}

/**
 * The exact copy specified for each answer to "before or after eating?".
 * Calm, never a warning — same register as a food's own `medicineNote`.
 */
export function medicationTimingCopy(relation: "before" | "after" | null): string | null {
  if (relation === "before") {
    return "Take your medication before this meal, at the time prescribed for you.";
  }
  if (relation === "after") {
    return "Take your medication with or after this meal, at the time prescribed for you.";
  }
  return null;
}
