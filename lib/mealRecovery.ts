import type { NamedMeal } from "./mealtime";
import type { Food } from "./types";

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
  /** Each food's saved size, in the same order ("normal", "more:1.5", "163g"). */
  sizes?: string[];
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

/** The latest meal today before this one that has a real meal saved (not only extras). */
function latestEarlier(meal: NamedMeal, saved: SavedMeal[], isExtra: (id: string) => boolean): SavedMeal[] {
  const idx = ORDER.indexOf(meal);
  for (let i = idx - 1; i >= 0; i--) {
    const rows = saved.filter((s) => s.meal === ORDER[i] && s.foodIds.some((id) => !isExtra(id)));
    if (rows.length > 0) return rows;
  }
  return [];
}

/**
 * The co-founder dietitian's lines after a meal that pushes sugar up or was
 * more than the size shown (2026-10-23, her exact words, kept by the founder's
 * choice). One line, the first that fits: a sweet drink, then a sweet food,
 * then fried food, then more than the size shown. Each is about the next meal,
 * never about eating less of it.
 */
export const FOLLOW_UP = {
  sweetDrink:
    "Sugary drinks can raise blood glucose quickly. Choose water or an unsweetened drink next time.",
  sweetFood:
    "You've logged a sweet food. Follow your personalised recommendation for your next meal below.",
  fried: "You've logged fried food. For your next meal, choose an option prepared with less added oil.",
  more: "You've logged more than your recommended portion. Return to your usual meal plan at your next meal.",
} as const;

/** True for a size saved as "more" (A little more, About double, ...). */
function ateMore(size: string | undefined): boolean {
  const s = (size ?? "").trim();
  return s === "large" || s.startsWith("more:");
}

export function followUpLine(
  meal: NamedMeal,
  saved: SavedMeal[],
  foodById: (id: string) => Food | undefined,
  isExtra: (id: string) => boolean,
): string | null {
  const rows = latestEarlier(meal, saved, isExtra);
  const eaten = rows.flatMap((r) =>
    r.foodIds.map((id, i) => ({ food: foodById(id), size: r.sizes?.[i] })),
  );
  const foods = eaten.map((e) => e.food).filter((f): f is Food => Boolean(f));
  // The same tests the verdict engine uses for its sugar lock.
  if (foods.some((f) => f.role === "drink" && f.gi === "high")) return FOLLOW_UP.sweetDrink;
  if (foods.some((f) => f.role === "sugar")) return FOLLOW_UP.sweetFood;
  // The "fried" warning box (scripts/health-notes.mjs, NOTES.oil).
  if (foods.some((f) => (f.healthNote ?? "").startsWith("This food is fried"))) return FOLLOW_UP.fried;
  if (eaten.some((e) => e.food && !isExtra(e.food.id) && ateMore(e.size))) return FOLLOW_UP.more;
  return null;
}
