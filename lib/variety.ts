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
  const candidates = FOODS.filter(
    (f) =>
      f.id !== food.id &&
      f.category === food.category &&
      f.baseVerdict === "green",
  );
  // When both foods carry a measured carb weight for their own real serving,
  // prefer the closest match first: a genuine like-for-like swap (the exchange-
  // list idea a Nigerian dietitian already uses with patients), not just any
  // green food that happens to share the category.
  if (food.carbG != null) {
    candidates.sort((a, b) => {
      const da = a.carbG == null ? Infinity : Math.abs(a.carbG - food.carbG!);
      const db = b.carbG == null ? Infinity : Math.abs(b.carbG - food.carbG!);
      return da - db;
    });
  }
  return candidates.slice(0, limit);
}

/** The same, found by the food's name (as stored in the history log). */
export function swapsByName(name: string, limit = 3): { food: Food; swaps: Food[] } | null {
  const food = FOODS.find((f) => f.name === name);
  if (!food) return null;
  const swaps = saferSwaps(food, limit);
  return swaps.length > 0 ? { food, swaps } : null;
}
