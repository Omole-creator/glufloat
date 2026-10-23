import type { NamedMeal } from "./mealtime";

/**
 * Getting back on track after a different meal (co-founder dietitian,
 * 2026-10-23). When the last meal saved today was not the blue card's plate,
 * the next meal card says so calmly and gives the next meal as normal. It
 * never says the meal was bad, and it never makes the next meal smaller
 * (that rule lives in mealShareFor, lib/nextMeal.ts).
 *
 * Pure, so scripts/meal-recovery-test.ts can check it with no server.
 */

const ORDER: NamedMeal[] = ["breakfast", "lunch", "dinner"];

export interface SavedMeal {
  meal: NamedMeal;
  foodIds: string[];
}

/**
 * The earlier meal today that was different from its blue-card plate, or
 * null. Only the latest earlier meal with something saved counts. Extras
 * (nuts, coconut and the rest) are on top of a meal, not a meal, so they are
 * left out. A meal is "different" when it holds a food the blue card did not
 * offer. Eating part of the plate, or the plate itself, is not different.
 * With no record of which plate was shown (another phone), it says nothing
 * rather than guess.
 */
export function differentMealBefore(
  meal: NamedMeal,
  saved: SavedMeal[],
  shownPlate: (m: NamedMeal) => string[] | null,
  isExtra: (id: string) => boolean,
): NamedMeal | null {
  const idx = ORDER.indexOf(meal);
  for (let i = idx - 1; i >= 0; i--) {
    const m = ORDER[i];
    const foods = saved
      .filter((s) => s.meal === m)
      .flatMap((s) => s.foodIds)
      .filter((id) => !isExtra(id));
    if (foods.length === 0) continue;
    const plate = shownPlate(m);
    if (!plate) return null;
    const onPlate = new Set(plate);
    return foods.some((id) => !onPlate.has(id)) ? m : null;
  }
  return null;
}

/** The line itself, in the co-founder dietitian's own words. */
export function recoveryLine(earlier: NamedMeal, next: NamedMeal): string {
  return `You've logged a different meal at ${earlier}. Your personalised ${next} recommendation is ready below.`;
}
