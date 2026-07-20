import { FOODS } from "./search";
import type { Food } from "./types";

/**
 * Safe alternatives to a food the person eats a lot: other foods in the SAME
 * group that the app marks green. Same group means the swap is a real one (a
 * swallow for a swallow, a soup for a soup), never an odd pairing. This lets the
 * app expand a person's rotation instead of only repeating what they already
 * know, which is a different kind of value than a one-off lookup.
 */
export function saferSwaps(food: Food, limit = 3): Food[] {
  return FOODS.filter(
    (f) =>
      f.id !== food.id &&
      f.category === food.category &&
      f.baseVerdict === "green",
  ).slice(0, limit);
}

/** The same, found by the food's name (as stored in the history log). */
export function swapsByName(name: string, limit = 3): { food: Food; swaps: Food[] } | null {
  const food = FOODS.find((f) => f.name === name);
  if (!food) return null;
  const swaps = saferSwaps(food, limit);
  return swaps.length > 0 ? { food, swaps } : null;
}
