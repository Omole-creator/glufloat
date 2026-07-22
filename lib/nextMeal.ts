import { getFood } from "./search";
import type { Food } from "./types";
import type { NamedMeal } from "./mealtime";
import { cleanFoodName } from "./foodName";

/**
 * Safe meal ideas to suggest for the meal happening right now.
 *
 * Every idea is a small, real Nigerian plate built only from foods the app marks
 * green, so a suggestion is always a good one, and the plates are grouped by the
 * meal people actually eat them at. This is what answers "what should I eat?"
 * without the person having to think of it themselves.
 *
 * TWO founder rules govern this file, and both have been broken here before:
 *
 *  1. **Every idea must be a real plate people eat together.** No odd
 *     combinations. That is why the lunch and dinner plates below are BUILT FROM
 *     TEMPLATES rather than free combinations: a swallow only ever meets a soup
 *     that is genuinely eaten with swallow, and only ever meets a protein from an
 *     explicit whitelist. Nothing here can produce "coleslaw in egusi soup".
 *  2. **The meal must suit the time of day.** Breakfast is a hand-written list of
 *     real Nigerian breakfasts. It used to contain two swallow-and-soup plates
 *     (oat swallow with vegetable soup, and oat swallow with egusi and fish),
 *     which are lunch plates and were being offered at 7am. Do not put a
 *     swallow-and-soup plate in the breakfast list; scripts/meal-ideas-test.ts
 *     fails if you do.
 *
 * Ids are the food ids in data/foods.json. If a food is ever renamed or removed,
 * getFood drops it and the rest of the plate still shows.
 */

/**
 * The only proteins that may be put into a soup. Deliberately a hand-kept list,
 * never everything with `category: protein` — that list contains coleslaw, tuna
 * salad and coated things that nobody puts in egusi.
 */
const SOUP_PROTEINS = [
  "fish",
  "chicken",
  "goat-meat",
  "beef",
  "turkey",
  "snail",
  "prawns-crayfish",
  "smoked-fish",
  "stockfish",
  "pomo",
  "shaki",
];

/**
 * Green soups that are genuinely eaten with a swallow. The stews and sauces
 * (tomato stew, ayamase, ofe akwu, garden egg sauce) are left out on purpose:
 * they are eaten with rice, and there is no green rice in the data, so pairing
 * one with a swallow would be an odd plate.
 */
const SWALLOW_SOUPS = [
  "egusi-soup",
  "ogbono-soup",
  "efo-riro",
  "edikang-ikong",
  "afang-soup",
  "oha-soup",
  "bitterleaf-soup",
  "okra-soup",
  "vegetable-soup",
  "banga-soup",
  "groundnut-soup",
  "white-soup",
  "ora-soup",
  "owho-soup",
  "native-soup",
  "ofe-owerri",
  "okazi-soup",
  "editan-soup",
  "atama-soup",
  "miyan-kuka",
  "miyan-taushe",
  "miyan-kubewa",
];

/** Beans plates: a legume base with something eaten alongside it. */
const BEANS_BASES = ["cooked-beans", "beans-porridge"];
const BEANS_PARTNERS = ["fish", "chicken", "eggs", "smoked-fish", "beef"];

/**
 * Real Nigerian breakfasts, written out one by one. Light, quick, and the kind
 * of thing that actually goes on a table in the morning.
 */
const BREAKFAST: string[][] = [
  ["oats", "plain-yogurt"],
  ["oats", "groundnut"],
  ["oats", "soy-milk"],
  ["moi-moi", "tea-coffee"],
  ["moi-moi", "soy-milk"],
  ["moi-moi", "eggs"],
  ["okpa", "tea-coffee"],
  ["okpa", "soy-milk"],
  ["ekuru", "pepper-sauce"],
  ["eggs", "avocado"],
  ["eggs", "tea-coffee"],
  ["scrambled-egg", "avocado"],
  ["omelette", "tea-coffee"],
  ["beans-porridge", "eggs"],
  ["beans-porridge", "fish"],
  ["cooked-beans", "eggs"],
  ["dan-wake", "tea-coffee"],
  ["wara", "pepper-sauce"],
  ["plain-yogurt", "groundnut"],
  ["egg-sauce", "avocado"],
];

/**
 * A soup-and-swallow plate for every green soup, each with a protein taken from
 * the whitelist. `shift` moves the protein along so lunch and dinner do not hand
 * back the same plates on the same day.
 */
function soupPlates(shift: number): string[][] {
  return SWALLOW_SOUPS.map((soup, i) => [
    "oat-swallow",
    soup,
    SOUP_PROTEINS[(i + shift) % SOUP_PROTEINS.length],
  ]);
}

/** Beans with something to eat it with, one plate per pairing. */
function beansPlates(partners: string[]): string[][] {
  return BEANS_BASES.flatMap((base) => partners.map((p) => [base, p]));
}

/** Pepper soup, eaten on its own in the evening. A real, light dinner. */
function pepperSoupPlates(): string[][] {
  return ["fish", "chicken", "goat-meat", "turkey"].map((p) => [
    "pepper-soup",
    p,
  ]);
}

const LUNCH: string[][] = [
  ...soupPlates(0),
  ...beansPlates(BEANS_PARTNERS),
  ["ukwa", "fish"],
];

// Dinner leans lighter: pepper soup leads, the soup plates carry a different
// protein from lunch's, and the beans plates keep to the lighter partners.
const DINNER: string[][] = [
  ...pepperSoupPlates(),
  ...soupPlates(5),
  ...beansPlates(["fish", "eggs", "smoked-fish"]),
  ["ukwa", "smoked-fish"],
];

const IDEAS: Record<NamedMeal, string[][]> = {
  breakfast: BREAKFAST,
  lunch: LUNCH,
  dinner: DINNER,
};

/** The raw plates, for the test script. */
export function ideasFor(meal: NamedMeal): string[][] {
  return IDEAS[meal];
}

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

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * How far along the list one day moves.
 *
 * Stepping by 1 walks the list in order, so two people a day apart see the
 * neighbouring plate and a week looks like a run down a menu. Stepping by a
 * number that shares no factor with the list length still visits every plate
 * before repeating any, but jumps around while doing it.
 */
function stride(n: number): number {
  for (const s of [7, 5, 11, 3, 13, 2]) {
    if (s < n && gcd(s, n) === 1) return s;
  }
  return 1;
}

/**
 * The meal to show for a given day.
 *
 * Founder rules, all enforced here:
 *  - **It must change every day, and NEVER repeat day to day** ("avoid repeat at
 *    all cost"). The ideas are put in a stable order (freshest first, see below),
 *    then the DAY NUMBER steps along that order each day, so today and tomorrow
 *    can never be the same plate. `avoidIndexes` (the plates actually shown on
 *    the last few days, remembered on the device) is a second guard: if the step
 *    lands on one of them, we move on.
 *  - **It learns from what the person eats.** The stable order puts the ideas
 *    whose foods appear LEAST in their log first, so their usual plates drift to
 *    the back of the rotation. `liked` (foods they logged that came out GREEN)
 *    pulls a plate slightly back forward, so variety does not mean handing
 *    somebody food they have shown they do not want.
 *  - `offset` steps further for a "try another meal" tap.
 *  - `avoidIndexes` are plates not to land on: the last few days' plates, and
 *    the ones this person just pressed past. Both come from the device.
 *
 * Note what is NOT here: neither signal reshuffles the order from one day to the
 * next. `counts` and `liked` only move when the person logs a meal, and a skip
 * is handled as an avoid rather than a re-score. If either changed the order
 * daily, the stride could walk onto yesterday's plate, and the no-repeat rule is
 * the one that must not break.
 */
export function planForDay(
  meal: NamedMeal,
  dayKey: string,
  counts: Map<string, number>,
  offset = 0,
  avoidIndexes: number[] = [],
  liked: Map<string, number> = new Map(),
): MealIdea {
  const list = IDEAS[meal];
  const n = list.length;
  if (n === 0) return { foods: [], names: [], index: 0, count: 0 };

  // Stable order: least-eaten first, ties broken by a fixed per-idea hash (NOT
  // day-dependent, so the order only shifts when the person's eating changes).
  // A food they logged as green counts for a little less, so a plate they like
  // and that is good for them does not drift all the way to the back.
  const LIKED_DISCOUNT = 0.5;
  const scored = list.map((_, i) => {
    const idea = resolve(meal, i);
    const eaten = idea.foods.reduce(
      (sum, f) =>
        sum +
        (counts.get(f.name) ?? 0) -
        LIKED_DISCOUNT * (liked.get(f.name) ?? 0),
      0,
    );
    return { idea, eaten, tie: hash(`${meal}#${i}`) };
  });
  scored.sort((a, b) => a.eaten - b.eaten || a.tie - b.tie);

  const step = stride(n);
  let pos = (((dayNumber(dayKey) * step + offset) % n) + n) % n;
  if (avoidIndexes.length > 0 && n > avoidIndexes.length) {
    let guard = 0;
    while (avoidIndexes.includes(scored[pos].idea.index) && guard < n) {
      pos = (pos + 1) % n;
      guard += 1;
    }
  }
  return scored[pos].idea;
}
