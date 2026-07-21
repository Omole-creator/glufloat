import { getFood } from "./search";
import type { Food } from "./types";
import type { NamedMeal } from "./mealtime";
import { cleanFoodName } from "./foodName";

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
// Every idea must be a real Nigerian plate people actually eat together (founder
// rule): a swallow with a soup and a protein, beans with a protein, or a light
// pairing that truly goes together. No odd combinations (e.g. garden egg with
// moi moi). All are all-green, so they always score green.
const IDEAS: Record<NamedMeal, string[][]> = {
  breakfast: [
    ["oats", "plain-yogurt"],
    ["moi-moi", "tea-coffee"],
    ["eggs", "avocado"],
    ["beans-porridge", "fish"],
    ["oat-swallow", "vegetable-soup"],
    ["okpa", "tea-coffee"],
    ["eggs", "soy-milk"],
    ["moi-moi", "soy-milk"],
    ["oats", "groundnut"],
    ["beans-porridge", "eggs"],
    ["okpa", "soy-milk"],
    ["oat-swallow", "egusi-soup", "fish"],
  ],
  lunch: [
    ["oat-swallow", "egusi-soup", "fish"],
    ["oat-swallow", "okra-soup", "chicken"],
    ["oat-swallow", "efo-riro", "chicken"],
    ["oat-swallow", "edikang-ikong", "fish"],
    ["oat-swallow", "afang-soup", "fish"],
    ["oat-swallow", "vegetable-soup", "goat-meat"],
    ["oat-swallow", "bitterleaf-soup", "goat-meat"],
    ["oat-swallow", "ogbono-soup", "fish"],
    ["cooked-beans", "fish"],
    ["cooked-beans", "chicken"],
    ["beans-porridge", "fish"],
    ["oat-swallow", "white-soup", "fish"],
  ],
  dinner: [
    ["oat-swallow", "efo-riro", "chicken"],
    ["pepper-soup", "fish"],
    ["pepper-soup", "chicken"],
    ["oat-swallow", "vegetable-soup", "fish"],
    ["oat-swallow", "ogbono-soup", "fish"],
    ["oat-swallow", "white-soup", "fish"],
    ["oat-swallow", "egusi-soup", "goat-meat"],
    ["oat-swallow", "okra-soup", "fish"],
    ["oat-swallow", "oha-soup", "goat-meat"],
    ["cooked-beans", "fish"],
    ["beans-porridge", "fish"],
    ["oat-swallow", "edikang-ikong", "chicken"],
  ],
};

export interface MealIdea {
  foods: Food[];
  /** How to name each food cleanly on the card (no "Titus / Mackerel" lists). */
  names: string[];
  index: number;
  count: number;
}

function resolve(meal: NamedMeal, index: number): MealIdea {
  const list = IDEAS[meal];
  const ids = list[index] ?? list[0];
  const foods = ids
    .map((id) => getFood(id))
    .filter((f): f is Food => Boolean(f));
  return {
    foods,
    names: foods.map((f) => cleanFoodName(f.name)),
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

/** The whole-number day (in WAT, since dayKey is already a Nigerian date). */
function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000);
}

/**
 * The meal to show for a given day.
 *
 * Founder rules, all enforced here:
 *  - **It must change every day, and NEVER repeat day to day** ("avoid repeat at
 *    all cost"). The ideas are put in a stable order (freshest first, see below),
 *    then the DAY NUMBER steps one place along that order each day, so today and
 *    tomorrow can never be the same plate. `avoidIndex` (yesterday's actual plate,
 *    remembered on the device) is a second guard: if the step still lands on it,
 *    we move one more.
 *  - **It learns from what the person eats.** The stable order puts the ideas
 *    whose foods appear LEAST in their log first, so their usual plates drift to
 *    the back of the rotation.
 *  - `offset` steps further for a "show me another food" tap.
 */
export function planForDay(
  meal: NamedMeal,
  dayKey: string,
  counts: Map<string, number>,
  offset = 0,
  avoidIndex?: number,
): MealIdea {
  const list = IDEAS[meal];
  const n = list.length;
  if (n === 0) return { foods: [], names: [], index: 0, count: 0 };

  // Stable order: least-eaten first, ties broken by a fixed per-idea hash (NOT
  // day-dependent, so the order only shifts when the person's eating changes).
  const scored = list.map((_, i) => {
    const idea = resolve(meal, i);
    const eaten = idea.foods.reduce(
      (sum, f) => sum + (counts.get(f.name) ?? 0),
      0,
    );
    return { idea, eaten, tie: hash(`${meal}#${i}`) };
  });
  scored.sort((a, b) => a.eaten - b.eaten || a.tie - b.tie);

  // Step one place per day, so consecutive days are always different plates.
  let pos = (((dayNumber(dayKey) + offset) % n) + n) % n;
  if (avoidIndex !== undefined && n > 1) {
    let guard = 0;
    while (scored[pos].idea.index === avoidIndex && guard < n) {
      pos = (pos + 1) % n;
      guard += 1;
    }
  }
  return scored[pos].idea;
}
