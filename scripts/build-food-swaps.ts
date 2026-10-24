/**
 * Builds lib/foodSwaps.ts, the list of swaps the "I don't have this" button may
 * make. Run it again after any change to the foods' numbers or the plates:
 *
 *   npx tsx scripts/build-food-swaps.ts
 *
 * Source: the co-founder dietitian's marked table (GluFloat-Food-Swaps-Marked.docx,
 * 2026-10-24), MARKS below, with the founder's rules:
 *  - Her No is never offered. Her one-way rows go one way only.
 *  - Mixed dishes (soups, porridges, egg dishes, moi moi, okpa, pap, jollof...)
 *    swap at their own card size, never resized ("where the portion cannot be
 *    measured reliably, the app should not pretend"), and only when they are
 *    really equivalent at that size: calories within 25%, carbs within 6g, fat
 *    within 9g, salt within 150mg, body-building food within 9g (the limits her
 *    table used for "equivalent").
 *  - Single foods: her Yes swaps at card size. Her "adjust portion" becomes the
 *    nearest countable amount (whole pieces, half balls, quarter cups), keeping
 *    carbs equal for starches and body-building food equal for meat, fish and
 *    eggs. Every swap, whatever its size, must pass her equivalence limits
 *    above (founder, 2026-10-24), or it is not offered.
 *  - A starch that must be eaten at the right size (GLUFLOAT_SIZE_STARCHES), and
 *    eggs, are never resized: card size only.
 * Conditions, weekly limits, ticked swallows and a dietitian's rules are checked
 * when the swap is made (swapInPlate in lib/nextMeal.ts), not here.
 */
import { writeFileSync } from "node:fs";
import { FOODS } from "../lib/search";
import { GLUFLOAT_SIZE_STARCHES } from "../lib/nextMeal";
import type { Food } from "../lib/types";

type Mark = "yes" | "adjust" | "no" | "oneway";
// [her row number, food A, food B, her mark]
const MARKS: [number, string, string, Mark][] = [
  [1, "eggs", "fish", "adjust"],
  [2, "eggs", "omelette", "adjust"],
  [3, "eggs", "scrambled-egg", "adjust"],
  [4, "eggs", "smoked-fish", "adjust"],
  [5, "chicken", "eggs", "adjust"],
  [6, "chicken", "fish", "adjust"],
  [7, "chicken", "goat-meat", "yes"],
  [8, "chicken", "smoked-fish", "adjust"],
  [9, "chicken", "turkey", "yes"],
  [10, "egg-sauce", "eggs", "oneway"],
  [11, "egg-sauce", "scrambled-egg", "adjust"],
  [12, "fish", "goat-meat", "adjust"],
  [13, "fish", "smoked-fish", "adjust"],
  [14, "fish", "turkey", "yes"],
  [15, "goat-meat", "turkey", "yes"],
  [16, "beef", "eggs", "adjust"],
  [17, "beef", "chicken", "adjust"],
  [18, "beef", "fish", "yes"],
  [19, "beef", "smoked-fish", "adjust"],
  [20, "acha", "cocoyam-fufu", "adjust"],
  [21, "acha", "fufu-akpu", "adjust"],
  [22, "acha", "garri-eba", "adjust"],
  [23, "acha", "oat-swallow", "adjust"],
  [24, "acha", "semovita", "yes"],
  [25, "acha", "tuwo-shinkafa", "yes"],
  [26, "amala-plantain", "garri-eba", "adjust"],
  [27, "amala-yam", "lafun", "yes"],
  [28, "amala-yam", "semovita", "yes"],
  [29, "cocoyam-fufu", "fufu-akpu", "adjust"],
  [30, "cocoyam-fufu", "garri-eba", "adjust"],
  [31, "cocoyam-fufu", "semovita", "adjust"],
  [32, "fufu-akpu", "garri-eba", "yes"],
  [33, "fufu-akpu", "semovita", "yes"],
  [34, "garri-eba", "semovita", "yes"],
  [35, "lafun", "semovita", "yes"],
  [36, "oat-swallow", "pounded-yam", "oneway"],
  [37, "oat-swallow", "tuwo-shinkafa", "adjust"],
  [38, "pounded-yam", "semovita", "adjust"],
  [39, "tuwo-dawa", "tuwo-masara", "yes"],
  [40, "tuwo-dawa", "tuwo-shinkafa", "yes"],
  [41, "tuwo-masara", "tuwo-shinkafa", "yes"],
  [42, "afang-soup", "efo-riro", "no"],
  [43, "afang-soup", "native-soup", "adjust"],
  [44, "afang-soup", "okra-soup", "no"],
  [45, "atama-soup", "vegetable-soup", "no"],
  [46, "banga-soup", "miyan-kuka", "no"],
  [47, "bitterleaf-soup", "okazi-soup", "yes"],
  [48, "bitterleaf-soup", "okra-soup", "adjust"],
  [49, "bitterleaf-soup", "vegetable-soup", "yes"],
  [50, "edikang-ikong", "egusi-soup", "no"],
  [51, "edikang-ikong", "okra-soup", "yes"],
  [52, "edikang-ikong", "owho-soup", "yes"],
  [53, "editan-soup", "okra-soup", "yes"],
  [54, "efo-riro", "okra-soup", "yes"],
  [55, "efo-riro", "ora-soup", "yes"],
  [56, "egusi-soup", "groundnut-soup", "no"],
  [57, "egusi-soup", "miyan-taushe", "no"],
  [58, "groundnut-soup", "miyan-taushe", "no"],
  [59, "miyan-kubewa", "miyan-kuka", "yes"],
  [60, "miyan-kubewa", "miyan-yakuwa", "yes"],
  [61, "miyan-kubewa", "ogbono-soup", "no"],
  [62, "miyan-kubewa", "white-soup", "no"],
  [63, "miyan-kuka", "okra-soup", "yes"],
  [64, "ofe-owerri", "oha-soup", "yes"],
  [65, "ogbono-soup", "white-soup", "adjust"],
  [66, "basmati-rice", "boiled-plantain-unripe", "adjust"],
  [67, "basmati-rice", "white-rice", "adjust"],
  [68, "basmati-rice", "ofada-rice", "yes"],
  [69, "cocoyam", "sweet-potato", "adjust"],
  [70, "boiled-plantain-ripe", "boiled-plantain-unripe", "yes"],
  [71, "boiled-plantain-ripe", "boiled-yam", "yes"],
  [72, "boiled-plantain-unripe", "white-rice", "yes"],
  [73, "boiled-plantain-unripe", "boiled-yam", "yes"],
  [74, "boiled-plantain-unripe", "ofada-rice", "adjust"],
  [75, "boiled-water-yam", "cocoyam", "adjust"],
  [76, "boiled-water-yam", "sweet-potato", "yes"],
  [77, "boiled-yam", "brown-rice", "adjust"],
  [78, "coconut-rice", "fried-rice", "yes"],
  [79, "coconut-rice", "jollof-rice", "yes"],
  [80, "custard", "eko-agidi", "yes"],
  [81, "custard", "pap", "yes"],
  [82, "eko-agidi", "pap", "yes"],
  [83, "fried-rice", "jollof-rice", "yes"],
  [84, "macaroni", "rice-and-beans", "yes"],
  [85, "ofada-rice", "white-rice", "adjust"],
  [86, "parboiled-rice", "white-rice", "yes"],
  [87, "parboiled-rice", "spaghetti", "adjust"],
  [88, "oats", "weetabix", "adjust"],
  [89, "spaghetti", "white-rice", "adjust"],
  [90, "unripe-plantain-porridge", "yam-porridge", "adjust"],
  [91, "beans-porridge", "cooked-beans", "adjust"],
  [92, "beans-porridge", "moi-moi", "adjust"],
  [93, "beans-porridge", "ukwa", "adjust"],
  [94, "cooked-beans", "moi-moi", "oneway"],
  [95, "cooked-beans", "ukwa", "adjust"],
  [96, "dan-wake", "moi-moi", "no"],
  [97, "dan-wake", "okpa", "no"],
  [98, "moi-moi", "okpa", "yes"],
  [99, "plain-yogurt", "soy-milk", "yes"],
];

// Her one-way rows: [row] -> [the food that is missing, what replaces it].
const ONE_WAY: Record<number, [string, string]> = {
  10: ["egg-sauce", "eggs"],
  36: ["pounded-yam", "oat-swallow"],
  94: ["moi-moi", "cooked-beans"],
};

const MIXED = /porridge|egg-sauce|moi-moi|okpa|omelette|scrambled|jollof|fried-rice|coconut-rice|rice-and-beans|dan-wake|custard|^pap$|eko|macaroni|ukwa/;
const isMixed = (f: Food) => f.role === "soup" || MIXED.test(f.id);
const isMeat = (f: Food) => f.category === "protein" || f.id === "eggs";

type Unit = { unit: number; step: number; say: (n: string, plural: boolean, g: number) => string };
/** How a single food is counted at home: grams per unit and the smallest part. */
const UNITS: Record<string, Unit> = {
  eggs: { unit: 50, step: 1, say: (n, p, g) => `${n} egg${p ? "s" : ""} (about ${g}g).` },
  fish: { unit: 100, step: 0.5, say: (n, p, g) => p ? `${n} pieces of fish, each as wide as your palm (${g}g in total).` : `${n} piece of fish as wide as your palm (${g}g).` },
  "smoked-fish": { unit: 90, step: 0.5, say: (n, p, g) => p ? `${n} pieces of smoked fish, each as wide as your palm (${g}g in total).` : `${n} piece of smoked fish as wide as your palm (${g}g).` },
  chicken: { unit: 45, step: 1, say: (n, p, g) => `${n} medium piece${p ? "s" : ""} of chicken (${g}g${p ? " in total" : ""}).` },
  turkey: { unit: 45, step: 1, say: (n, p, g) => `${n} piece${p ? "s" : ""} of turkey (${g}g${p ? " in total" : ""}).` },
  "goat-meat": { unit: 45, step: 1, say: (n, p, g) => `${n} medium chunk${p ? "s" : ""} of goat meat (${g}g${p ? " in total" : ""}).` },
  beef: { unit: 45, step: 1, say: (n, p, g) => `${n} medium chunk${p ? "s" : ""} of beef (${g}g${p ? " in total" : ""}).` },
  "oat-swallow": { unit: 100, step: 0.5, say: (n, p, g) => p ? `${n} balls of oat swallow, each the size of your fist (${g}g in total).` : `${n} ball of oat swallow the size of your fist (${g}g).` },
  "amala-plantain": { unit: 100, step: 0.5, say: (n, p, g) => p ? `${n} balls of plantain amala, each the size of your fist (${g}g in total).` : `${n} ball of plantain amala the size of your fist (${g}g).` },
  "cocoyam-fufu": { unit: 100, step: 0.5, say: (n, p, g) => p ? `${n} balls of cocoyam fufu, each the size of your fist (${g}g in total).` : `${n} ball of cocoyam fufu the size of your fist (${g}g).` },
  acha: { unit: 100, step: 0.5, say: (n, p, g) => p ? `${n} balls of acha, each the size of your fist (${g}g in total).` : `${n} ball of acha the size of your fist (${g}g).` },
  "basmati-rice": { unit: 160, step: 0.25, say: (n, _p, g) => `${n} of cooked basmati rice (${g}g).` },
  "ofada-rice": { unit: 160, step: 0.25, say: (n, _p, g) => `${n} of cooked ofada rice (${g}g).` },
  "brown-rice": { unit: 160, step: 0.25, say: (n, _p, g) => `${n} of cooked brown rice (${g}g).` },
  "parboiled-rice": { unit: 180, step: 0.25, say: (n, _p, g) => `${n} of cooked rice (${g}g).` },
  spaghetti: { unit: 260, step: 0.25, say: (n, _p, g) => `${n} of cooked pasta (${g}g).` },
  oats: { unit: 80, step: 0.25, say: (n, _p, g) => `${n} of dry oats (${g}g). Measure it before cooking. Make it with water.` },
  "cooked-beans": { unit: 260, step: 0.25, say: (n, _p, g) => `${n} of cooked beans (${g}g).` },
};
const CUPS = new Set(["basmati-rice", "ofada-rice", "brown-rice", "parboiled-rice", "spaghetti", "oats", "cooked-beans"]);

const WORD = ["", "One", "Two", "Three", "Four", "Five", "Six"];
function countWords(n: number, cups: boolean): { text: string; plural: boolean } {
  const whole = Math.floor(n);
  const part = n - whole;
  if (cups) {
    if (whole === 0) return { text: part === 0.5 ? "Half a cup" : part === 0.25 ? "A quarter of a cup" : "Three-quarters of a cup", plural: false };
    const frac = part === 0.25 ? "a quarter" : part === 0.5 ? "a half" : part === 0.75 ? "three-quarters" : "";
    return { text: frac ? `${WORD[whole]} and ${frac} cups` : `${WORD[whole]} cup${whole > 1 ? "s" : ""}`, plural: false };
  }
  if (whole === 0) return { text: "Half a", plural: false };
  return { text: part ? `${WORD[whole]} and a half` : WORD[whole], plural: whole > 1 || part > 0 };
}

const byId = (id: string) => {
  const f = FOODS.find((x) => x.id === id);
  if (!f) throw new Error(`no food ${id}`);
  return f;
};
function cardGrams(f: Food): number | null {
  const m = [...f.portionGuidance.matchAll(/(\d+(?:\.\d+)?)\s*(?:g|ml)\b/g)];
  return m.length ? parseFloat(m[m.length - 1][1]) : null;
}

interface Built { from: string; to: string; row: number; grams?: number; calories?: number; carbG?: number; instruction?: string }

function equivalent(a: Food, b: Food): boolean {
  const k = Math.abs(a.calories! - b.calories!) / Math.max(a.calories!, b.calories!);
  return (
    k < 0.25 &&
    Math.abs(a.carbG! - b.carbG!) < 6 &&
    Math.abs(a.fatG! - b.fatG!) < 9 &&
    Math.abs(a.sodiumMg! - b.sodiumMg!) < 150 &&
    Math.abs(a.proteinG! - b.proteinG!) < 9
  );
}

/** `f` served at `grams` instead of its card size. */
function atGrams(f: Food, grams: number): Food {
  const k = grams / cardGrams(f)!;
  return { ...f, calories: f.calories! * k, carbG: f.carbG! * k, fatG: f.fatG! * k, sodiumMg: f.sodiumMg! * k, proteinG: f.proteinG! * k };
}

/** One direction: `fromId` is missing, `toId` replaces it. null = not offered. */
function build(row: number, fromId: string, toId: string, mark: Mark): Built | null {
  if (mark === "no") return null;
  const from = byId(fromId);
  const to = byId(toId);
  const atCard = equivalent(from, to) ? { from: fromId, to: toId, row } : null;
  // Mixed dishes, her plain Yes, a right-size starch and eggs: card size only.
  // (Eggs carry their own weekly count, so they are never made bigger.)
  const u = toId === "eggs" ? undefined : UNITS[toId];
  if (isMixed(from) || isMixed(to) || mark === "yes" || GLUFLOAT_SIZE_STARCHES.has(toId) || !u) return atCard;
  // "Adjust portion": the countable amount nearest to equal carbs (starches)
  // or equal body-building food (meat, fish, eggs), then her limits again.
  const key = isMeat(from) || isMeat(to) ? "proteinG" : "carbG";
  const card = cardGrams(to);
  const want = from[key] ?? 0;
  if (!card || !want || !to[key]) return atCard;
  const perG = to[key]! / card;
  const units = Math.max(u.step, Math.round(want / perG / u.unit / u.step) * u.step);
  const grams = Math.round(units * u.unit);
  if (grams === card) return atCard;
  if (!equivalent(from, atGrams(to, grams))) return atCard;
  const w = countWords(units, CUPS.has(toId));
  const scaled = atGrams(to, grams);
  return {
    from: fromId,
    to: toId,
    row,
    grams,
    calories: Math.round(scaled.calories!),
    carbG: Math.round(scaled.carbG! * 10) / 10,
    instruction: u.say(w.text, w.plural, grams),
  };
}

const out: Built[] = [];
const dropped: string[] = [];
for (const [row, a, b, mark] of MARKS) {
  const dirs: [string, string][] = ONE_WAY[row] ? [ONE_WAY[row]] : mark === "no" ? [] : [[a, b], [b, a]];
  if (dirs.length === 0) dropped.push(`${row} ${a} / ${b}: her No`);
  for (const [f, t] of dirs) {
    const s = build(row, f, t, ONE_WAY[row] ? "adjust" : mark);
    if (s) out.push(s);
    else dropped.push(`${row} ${f} -> ${t}`);
  }
}

const body = `// GENERATED by scripts/build-food-swaps.ts. Do not edit by hand: change that
// script (or the foods' numbers) and run it again.
//
// The swaps the "I don't have this" button may make, one direction each:
// \`from\` is the food the person does not have, \`to\` replaces it. A swap
// with \`grams\` serves \`to\` at that size, with its \`instruction\`; otherwise
// at its own card size. Every swap lands on a plate already on the blue card.
export interface FoodSwap {
  from: string;
  to: string;
  /** The row in the dietitian's marked table. */
  row: number;
  grams?: number;
  calories?: number;
  carbG?: number;
  instruction?: string;
}

export const FOOD_SWAPS: FoodSwap[] = ${JSON.stringify(out, null, 2)};
`;
writeFileSync("lib/foodSwaps.ts", body);
console.log(`${out.length} swaps written, ${dropped.length} directions not offered:`);
dropped.forEach((d) => console.log("  " + d));
