// Dietician-feedback data edits (safe id-keyed pattern, like add-food.mjs):
//   1. Fix the one odd pairingAdvice line the audit found (Fruit Smoothie).
//   2. Add `carbExchange` to the carby fruits: the amount that gives about 15g
//      of carbohydrate, i.e. one diabetes "fruit exchange".
//
// These amounts match the safe serving the app already shows for each fruit
// (the fruit portions were authored to ~15g carb per serving). Avocado (a fat)
// and lime/lemon (a squeeze) are left out on purpose.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

// 1. pairingAdvice fixes (odd lines that do not combine with the food).
const pairing = {
  // Must match REAL_PAIRINGS.smoothie in clear-instructions.mjs, which runs last.
  smoothie: "Drink it with a meal, not on its own. Better to eat the whole fruit.",
};

// 2. One fruit exchange (~15g carbs) per fruit. Short amount phrase.
const carbExchange = {
  pawpaw: "four pieces",
  watermelon: "six pieces",
  orange: "one medium orange",
  apple: "one small apple",
  banana: "half of a medium banana",
  mango: "half of a small mango",
  pineapple: "one round slice",
  guava: "one small guava",
  agbalumo: "one small fruit",
  soursop: "four pieces",
  dates: "one date",
  "cashew-fruit": "one fruit",
  tangerine: "one medium fruit",
  grapefruit: "half of a medium fruit",
  "velvet-tamarind": "about 10 pods",
  tamarind: "one pod (one teaspoon of pulp)",
  jackfruit: "three pieces",
  pomegranate: "the seeds from half of one medium pomegranate",
  grapes: "about 15 grapes",
  strawberry: "about 8 berries",
  "golden-melon": "six pieces",
  // Measured as the fruit itself, never in cups (founder, 2026-10-08).
  pomelo: "three segments",
  fig: "two small figs",
  "monkey-kola": "two small fruits",
  "passion-fruit": "two fruits",
};

const byId = new Map(foods.map((f) => [f.id, f]));

for (const [id, text] of Object.entries(pairing)) {
  const f = byId.get(id);
  if (!f) {
    console.error("no food with id", id);
    process.exit(1);
  }
  f.pairingAdvice = text;
}

for (const [id, text] of Object.entries(carbExchange)) {
  const f = byId.get(id);
  if (!f) {
    console.error("no food with id", id);
    process.exit(1);
  }
  if (f.role !== "fruit") {
    console.error("carbExchange set on non-fruit", id);
    process.exit(1);
  }
  f.carbExchange = text;
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(
  `updated ${Object.keys(pairing).length} pairing, ${Object.keys(carbExchange).length} fruit exchanges. total: ${foods.length}`,
);
