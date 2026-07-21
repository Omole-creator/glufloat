import { getFood } from "./search";
import type { Food } from "./types";
import type { NamedMeal } from "./mealtime";
import { shortFoodName } from "./foodName";

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
  /** How to name each food cleanly on the card (no "Titus / Mackerel" lists). */
  names: string[];
  index: number;
  count: number;
}

/**
 * Clean, natural names for the daily meal card ONLY. The full food name (with
 * its brackets and options) still rules everywhere the detail matters, but on a
 * "here is your dinner" card "Oats (plain)" reads as clutter, so it becomes
 * "Plain Oats". This is cosmetic: it never changes the food, its size, its
 * verdict, or which foods are combined. Anything not listed falls back to
 * shortFoodName (which already drops "Titus / Mackerel" option lists).
 */
const DISPLAY: Record<string, string> = {
  oats: "Plain Oats",
  "oat-swallow": "Oat Swallow",
  "plain-yogurt": "Plain Yogurt",
  "tea-coffee": "Sugar-free Tea or Coffee",
  eggs: "Boiled Eggs",
  avocado: "Avocado",
  "vegetable-soup": "Vegetable Soup",
  "okra-soup": "Okra Soup",
  "moi-moi": "Moi Moi",
};

function resolve(meal: NamedMeal, index: number): MealIdea {
  const list = IDEAS[meal];
  const ids = list[index] ?? list[0];
  const foods = ids
    .map((id) => getFood(id))
    .filter((f): f is Food => Boolean(f));
  return {
    foods,
    names: foods.map((f) => DISPLAY[f.id] ?? shortFoodName(f.name)),
    index,
    count: list.length,
  };
}

/** A small, stable hash so a day + an idea has one fixed pseudo-random order. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The meal to show for a given day.
 *
 * Two rules the founder set: it must **change every day**, and it must **learn
 * from what the person has been eating** (bring something other than their usual
 * plate). So each idea is scored by how often its foods appear in the person's
 * log (lower is fresher), and ties are broken by a per-day order, which is what
 * makes the choice stable within a day but different the next day. `offset`
 * steps to the next idea for a "show me another" tap.
 */
export function planForDay(
  meal: NamedMeal,
  dayKey: string,
  counts: Map<string, number>,
  offset = 0,
): MealIdea {
  const list = IDEAS[meal];
  if (list.length === 0) return { foods: [], names: [], index: 0, count: 0 };

  const scored = list.map((_, i) => {
    const idea = resolve(meal, i);
    const eaten = idea.foods.reduce(
      (sum, f) => sum + (counts.get(f.name) ?? 0),
      0,
    );
    return { idea, eaten, order: hash(`${dayKey}#${i}`) };
  });

  scored.sort((a, b) => a.eaten - b.eaten || a.order - b.order);

  const n = scored.length;
  return scored[((offset % n) + n) % n].idea;
}
