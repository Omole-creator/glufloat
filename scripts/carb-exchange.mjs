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
  smoothie: "A small glass with a meal, not on its own. Better to eat the whole fruit.",
};

// 2. One fruit exchange (~15g carbs) per fruit. Short amount phrase.
const carbExchange = {
  pawpaw: "one slice (half a cup diced)",
  watermelon: "one cup diced",
  orange: "one medium orange",
  apple: "one small apple",
  banana: "half of a medium banana",
  mango: "half of a small mango",
  pineapple: "one thin slice",
  guava: "one small guava",
  agbalumo: "one to two small fruits",
  soursop: "half a cup (three small pieces)",
  dates: "one to two pieces",
  "cashew-fruit": "one to two fruits",
  tangerine: "one medium fruit",
  grapefruit: "half of a medium fruit",
  "velvet-tamarind": "a small handful of pods",
  tamarind: "one to two pods (a spoon of pulp)",
  jackfruit: "three to four pieces (half a cup)",
  pomegranate: "half a cup of seeds",
  grapes: "ten to fifteen grapes",
  strawberry: "seven to eight berries",
  "golden-melon": "one cup diced",
  "monkey-kola": "two to three small fruits",
  "passion-fruit": "one to two fruits",
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
