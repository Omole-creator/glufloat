import { getFood } from "./search";
import type { Food } from "./types";
import type { NamedMeal } from "./mealtime";

/**
 * Safe meal ideas to suggest for the next meal.
 *
 * Each idea is a small, real Nigerian plate built only from foods the app marks
 * green, so a suggestion is always a good one. They are grouped by meal, and the
 * "eat next" button shows one, with a "show me another" that moves to a different
 * idea. This is what answers "I already ate this for breakfast, what should I eat
 * for lunch?" without the person having to think of it themselves.
 *
 * Ids are the food ids in data/foods.json. If a food is ever renamed or removed,
 * getFood drops it and the rest of the plate still shows.
 */
const IDEAS: Record<NamedMeal, string[][]> = {
  breakfast: [
    ["oats", "plain-yogurt"],
    ["moi-moi", "tea-coffee"],
    ["eggs", "avocado"],
    ["beans-porridge", "fish"],
    ["oat-swallow", "vegetable-soup"],
  ],
  lunch: [
    ["oat-swallow", "egusi-soup", "fish"],
    ["cooked-beans", "fish"],
    ["oat-swallow", "okra-soup", "chicken"],
    ["beans-porridge", "garden-egg"],
    ["vegetable-soup", "goat-meat"],
  ],
  dinner: [
    ["oat-swallow", "efo-riro", "chicken"],
    ["pepper-soup", "fish"],
    ["moi-moi", "garden-egg"],
    ["vegetable-soup", "fish"],
    ["oat-swallow", "ogbono-soup", "fish"],
  ],
};

export interface MealIdea {
  foods: Food[];
  /** Index of this idea within its meal, so "another" can avoid repeating it. */
  index: number;
  count: number;
}

/** Resolve idea `index` for a meal into real Food objects. */
function resolve(meal: NamedMeal, index: number): MealIdea {
  const list = IDEAS[meal];
  const ids = list[index] ?? list[0];
  const foods = ids
    .map((id) => getFood(id))
    .filter((f): f is Food => Boolean(f));
  return { foods, index, count: list.length };
}

/**
 * Pick an idea for the meal. Pass the last index shown to get a DIFFERENT one
 * (the "show me another" button), so pressing it always moves the plate on.
 */
export function pickIdea(meal: NamedMeal, avoidIndex?: number): MealIdea {
  const count = IDEAS[meal].length;
  if (count === 0) return { foods: [], index: 0, count: 0 };
  let index = Math.floor(Math.random() * count);
  if (avoidIndex !== undefined && count > 1) {
    // Step to the next one instead of re-rolling, so it can never land back on
    // the same plate.
    if (index === avoidIndex) index = (index + 1) % count;
  }
  return resolve(meal, index);
}
