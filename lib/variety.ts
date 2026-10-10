import { FOODS } from "./search";
import type { Food } from "./types";

/**
 * Snacks swap to a whole food eaten as it is, between meals: cheap, sold
 * everywhere, no cooking, nothing to fry (2026-10-10). Inside the "snack"
 * category the only green foods were suya and nkwobi, so a puff-puff used to be
 * told to try suya (processed meat, the reason it left the extras card) or cow
 * foot. That is not a swap a dietitian would ever make. A snack is replaced by
 * a snack, not by meat. Order is the order shown when carbs tie.
 */
const SNACK_SWAPS = ["groundnut", "tiger-nut", "garden-egg", "cashew-nut", "cucumber"];

/**
 * Snack-category foods that are really a meal (eaten with soup or as
 * breakfast), so a handful of groundnuts is not a fair swap for them.
 */
const MEAL_LIKE_SNACKS = new Set(["masa", "abacha", "tapioca", "potato-salad", "pancakes", "waffles"]);

/**
 * Safe alternatives to a food the person eats a lot: other foods in the SAME
 * group that the app marks green. Same group means the swap is a real one (a
 * swallow for a swallow, a soup for a soup), never an odd pairing. This lets the
 * app expand a person's rotation instead of only repeating what they already
 * know, which is a different kind of value than a one-off lookup.
 *
 * A swap never carries its own red warning box (`healthNote`): "safer" has to
 * be safer for everyone, including someone with high blood pressure, high
 * cholesterol or kidney problems. That rules out red, organ and processed meat,
 * oily soups and fried food as suggestions, even when they are green for sugar.
 */
export function saferSwaps(food: Food, limit = 3): Food[] {
  let candidates: Food[];
  if (food.category === "snack") {
    if (MEAL_LIKE_SNACKS.has(food.id)) return [];
    candidates = SNACK_SWAPS.map((id) => FOODS.find((f) => f.id === id)).filter(
      (f): f is Food => !!f && f.id !== food.id && f.baseVerdict === "green" && !f.healthNote,
    );
  } else {
    candidates = FOODS.filter(
      (f) =>
        f.id !== food.id &&
        f.category === food.category &&
        f.baseVerdict === "green" &&
        !f.healthNote,
    );
  }
  // When both foods carry a measured carb weight for their own real serving,
  // prefer the closest match first: a genuine like-for-like swap (the exchange-
  // list idea a Nigerian dietitian already uses with patients), not just any
  // green food that happens to share the category. A stable sort keeps the
  // SNACK_SWAPS order on a tie.
  if (food.carbG != null) {
    candidates.sort((a, b) => {
      const da = a.carbG == null ? Infinity : Math.abs(a.carbG - food.carbG!);
      const db = b.carbG == null ? Infinity : Math.abs(b.carbG - food.carbG!);
      return da - db;
    });
  }
  return candidates.slice(0, limit);
}

/** True when the swap comes from a different food group (a snack swapped for
 *  groundnut), so the card must not say "in the same food group". */
export function isCrossGroupSwap(food: Food, swap: Food): boolean {
  return food.category !== swap.category;
}

/** The same, found by the food's name (as stored in the history log). */
export function swapsByName(name: string, limit = 3): { food: Food; swaps: Food[] } | null {
  const food = FOODS.find((f) => f.name === name);
  if (!food) return null;
  const swaps = saferSwaps(food, limit);
  return swaps.length > 0 ? { food, swaps } : null;
}
