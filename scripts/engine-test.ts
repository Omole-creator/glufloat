import { scoreMeal } from "../lib/verdictEngine";
import { searchFoods, getFood } from "../lib/search";

const f = (id: string) => getFood(id)!;

const cases: [string, ReturnType<typeof scoreMeal>][] = [
  ["eba alone (normal)", scoreMeal([{ food: f("garri-eba"), portion: "normal" }])],
  [
    "eba + efo riro + fish (normal)",
    scoreMeal([
      { food: f("garri-eba"), portion: "normal" },
      { food: f("efo-riro"), portion: "normal" },
      { food: f("fish"), portion: "normal" },
    ]),
  ],
  [
    "white rice + efo riro + fish (half rice)",
    scoreMeal([
      { food: f("white-rice"), portion: "half" },
      { food: f("efo-riro"), portion: "normal" },
      { food: f("fish"), portion: "normal" },
    ]),
  ],
  [
    "jollof + coke + chicken",
    scoreMeal([
      { food: f("jollof-rice"), portion: "half" },
      { food: f("soft-drink"), portion: "normal" },
      { food: f("chicken"), portion: "normal" },
    ]),
  ],
  [
    "moi moi + pap",
    scoreMeal([
      { food: f("moi-moi"), portion: "normal" },
      { food: f("pap"), portion: "normal" },
    ]),
  ],
  [
    "large pounded yam + egusi",
    scoreMeal([
      { food: f("pounded-yam"), portion: "large" },
      { food: f("egusi-soup"), portion: "normal" },
    ]),
  ],
  [
    "beans + plantain (should suggest vegetables/sauce, never soup or fish)",
    scoreMeal([
      { food: f("cooked-beans"), portion: "normal" },
      { food: f("boiled-plantain-ripe"), portion: "normal" },
    ]),
  ],
  [
    "beans and plantain combo alone (no odd add)",
    scoreMeal([{ food: f("beans-and-plantain"), portion: "normal" }]),
  ],
  [
    "smoothie alone (drink line only, never soup or fish)",
    scoreMeal([{ food: f("smoothie"), portion: "normal" }]),
  ],
  [
    "boiled plantain alone",
    scoreMeal([{ food: f("boiled-plantain-ripe"), portion: "normal" }]),
  ],
];

for (const [label, r] of cases) {
  console.log(
    `${label} -> ${r.verdict.toUpperCase()} (score ${r.score})${r.locked ? " [LOCKED]" : ""}`
  );
  r.fixes.forEach((x) => console.log("   fix:", x));
}

/**
 * Beans lift a plate one band, but they may never rescue a red, fried starch.
 * Dietician-reviewed: beans with boiled ripe plantain is "eat with care", while
 * beans with dodo stays "better to skip", because frying is what makes dodo red.
 */
const expected: [string, string[], "green" | "yellow" | "red"][] = [
  ["beans + boiled ripe plantain", ["cooked-beans", "boiled-plantain-ripe"], "yellow"],
  ["beans + dodo (fried, red)", ["cooked-beans", "dodo"], "red"],
  ["beans + white rice", ["cooked-beans", "white-rice"], "yellow"],
  ["whole wheat bread + beans", ["whole-wheat-bread", "cooked-beans"], "yellow"],
  // White bread is red on its own, so beans do not lift it either.
  ["white bread + beans (red starch)", ["agege-bread", "cooked-beans"], "red"],
  ["beans alone", ["cooked-beans"], "green"],
  ["boiled ripe plantain alone (no beans)", ["boiled-plantain-ripe"], "red"],
  ["eba alone (no beans)", ["garri-eba"], "red"],
  // Stacking (co-founder dietitian, 2026-10-08): more food never makes a plate
  // better. Two starches are red; three "eat with care" foods drop one colour.
  ["jollof + boiled yam", ["jollof-rice", "boiled-yam"], "red"],
  ["jollof + boiled yam + akara (akara must not rescue it)", ["jollof-rice", "boiled-yam", "akara"], "red"],
  ["three yellow starches", ["amala-plantain", "ofada-rice", "brown-rice"], "red"],
  ["two starches + soup + fish", ["ofada-rice", "boiled-yam", "efo-riro", "fish"], "red"],
  ["kilishi + ewa agoyin + akara (three yellow, no starch)", ["kilishi", "ewa-agoyin", "akara"], "red"],
  ["rice and beans dish alone (one starch)", ["rice-and-beans"], "yellow"],
  // Two yellow foods that both raise sugar are red. A yellow body-building or
  // beans food with one yellow starch is not (founder, 2026-10-08).
  ["boiled yam + kunu (two sugar yellows)", ["boiled-yam", "kunu"], "red"],
  ["pap + banana (two sugar yellows)", ["pap", "banana"], "red"],
  ["ofada rice + pawpaw (two sugar yellows)", ["ofada-rice", "pawpaw"], "red"],
  ["akara + pap (approved pairing)", ["akara", "pap"], "yellow"],
  ["moi moi + pap (approved pairing)", ["moi-moi", "pap"], "yellow"],
  ["akara + oats (approved pairing)", ["akara", "oats"], "green"],
  ["two green starches", ["oats", "oat-swallow"], "yellow"],
  // Oil and salt never count toward the yellow foods.
  ["ofada rice + palm oil + salt", ["ofada-rice", "palm-oil", "salt"], "yellow"],
  ["pounded yam + egusi + beef (ordinary plate)", ["pounded-yam", "egusi-soup", "beef"], "yellow"],
];

let failed = 0;
console.log("\nassertions:");
for (const [label, ids, want] of expected) {
  const got = scoreMeal(ids.map((id) => ({ food: f(id), portion: "normal" as const })));
  const ok = got.verdict === want;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${label} -> ${got.verdict} (want ${want}, score ${got.score})`
  );
}
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log("  all passed.");

console.log("\nsearch 'eba':", searchFoods("eba").map((x) => x.name));
console.log("search 'dodo':", searchFoods("dodo").map((x) => x.name));
console.log("search 'coke':", searchFoods("coke").map((x) => x.name));
console.log("search 'moin':", searchFoods("moin").map((x) => x.name));

// A plate made red by piling foods together must not say "2 times a week"
// under "Better to skip" (2026-10-08). A single red food keeps its own card's count.
import { mealFrequency } from "../lib/frequency";
{
  const pile = ["jollof-rice", "boiled-yam", "akara"].map((id) => ({ food: f(id), portion: "normal" as const }));
  const r = scoreMeal(pile);
  const often = mealFrequency(pile, r.stacked);
  if (!r.stacked || !often?.text.includes("1 time a month")) {
    console.error("FAIL stacked red plate frequency:", r.stacked, often);
    process.exit(1);
  }
  const eba = [{ food: f("garri-eba"), portion: "normal" as const }];
  const e = scoreMeal(eba);
  if (e.stacked || mealFrequency(eba, e.stacked)?.text.includes("1 time a month")) {
    console.error("FAIL eba alone must keep its own card's count");
    process.exit(1);
  }
  console.log("  ok   stacked red plate says about once a month; eba alone keeps its card's count");
}
