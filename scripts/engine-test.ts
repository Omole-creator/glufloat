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
