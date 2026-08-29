// Re-runnable, unattended sanity check over the nutrition fields
// scripts/food-composition.mjs writes onto data/foods.json: an Atwater
// energy cross-check (protein*4 + fat*9 + carb*4 vs stated calories) and a
// per-category kcal/100g plausibility band. Exits non-zero on any violation
// — the automated stand-in for a manual "go through it five times" review.
import { readFileSync } from "node:fs";
import { PLAUSIBILITY_BANDS, DEFAULT_SERVING_G } from "./food-composition-bands.mjs";

const foods = JSON.parse(readFileSync("data/foods.json", "utf8"));

// Alcoholic drinks get a real share of their calories from ethanol (7kcal/g),
// which has no place in the protein/fat/carb Atwater formula, so they are
// expected to fail a plain 4/4/9 cross-check even when correct.
const ALCOHOLIC = new Set(["palm-wine", "beer", "local-gin", "pito"]);

// Same override-first order as food-composition.mjs's own parseServingGrams:
// roughly 140 foods have no parseable gram/ml anchor in their portionGuidance
// text at all ("Eat as much as you like", "Two eggs. Cook them with tomato,
// pepper, and onion.") — without falling back to the shared override table,
// this check silently skipped its plausibility-band verification for every
// one of them on every run.
function servingGrams(food) {
  if (food.id in DEFAULT_SERVING_G) return DEFAULT_SERVING_G[food.id];
  const matches = [...food.portionGuidance.matchAll(/\(?(?:about\s+)?(\d+(?:\.\d+)?)\s*(g|ml)\)?/gi)];
  return matches.length > 0 ? parseFloat(matches[matches.length - 1][1]) : null;
}

let failures = 0;

for (const food of foods) {
  if (food.calories == null) {
    console.error(`${food.id}: missing nutrition fields`);
    failures++;
    continue;
  }

  // Atwater cross-check on the food's own serving (proportional, so grams
  // cancel out). Skipped for alcoholic drinks (see ALCOHOLIC above), and an
  // absolute-kcal floor keeps this from firing on foods so low-calorie that
  // a few kcal of rounding reads as a large percentage (a leafy vegetable at
  // 12 vs 15 stated kcal is not a real error).
  const recomputed = food.proteinG * 4 + food.fatG * 9 + food.carbG * 4;
  const absDiff = Math.abs(recomputed - food.calories);
  const diff = absDiff / Math.max(food.calories, 1);
  if (!ALCOHOLIC.has(food.id) && diff > 0.25 && absDiff > 8) {
    console.error(
      `${food.id}: Atwater mismatch — stated ${food.calories}kcal, recomputed ${recomputed.toFixed(1)}kcal (${(diff * 100).toFixed(0)}% off)`,
    );
    failures++;
  }

  // Category plausibility band, normalised back to kcal/100g.
  const grams = servingGrams(food);
  const band = PLAUSIBILITY_BANDS[food.category];
  if (grams && band) {
    const per100 = (food.calories / grams) * 100;
    if (per100 < band[0] || per100 > band[1]) {
      console.error(
        `${food.id} (${food.category}): ${per100.toFixed(0)}kcal/100g is outside the expected ${band[0]}-${band[1]} band`,
      );
      failures++;
    }
  }

  // Sanity floors: sodium/potassium should never be negative, and a
  // "measured" table-grounded food should never be missing a source tag.
  if (food.sodiumMg < 0 || food.potassiumMg < 0) {
    console.error(`${food.id}: negative mineral value`);
    failures++;
  }
  if (!food.nutritionSource) {
    console.error(`${food.id}: missing nutritionSource`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} issue(s) found across ${foods.length} foods.`);
  process.exit(1);
}
console.log(`food-composition-audit: all ${foods.length} foods pass Atwater + plausibility checks.`);
