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

console.log("\nsearch 'eba':", searchFoods("eba").map((x) => x.name));
console.log("search 'dodo':", searchFoods("dodo").map((x) => x.name));
console.log("search 'coke':", searchFoods("coke").map((x) => x.name));
console.log("search 'moin':", searchFoods("moin").map((x) => x.name));
