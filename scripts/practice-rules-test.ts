// npx tsx scripts/practice-rules-test.ts
//
// GluFloat for dietitians: a dietitian's food rules for one patient
// (lib/nextMeal.ts applyPracticeRules). Run after ANY edit to planForDay,
// suggestExtras or suggestSnack.
//   - a left-out food is never on the blue card, at any meal, on any day;
//   - an eat-more food shows up clearly more often than without the rule;
//   - the no-repeat rule still holds with rules on;
//   - a left-out food never comes back as an extra or a snack, even when the
//     gap is huge and the fallback would otherwise use the full list;
//   - no rules gives exactly the same plates as before.
import { planForDay, practiceRuleFoodIds, suggestExtras, suggestSnack, type PracticeRules } from "../lib/nextMeal";
import type { NamedMeal } from "../lib/mealtime";

let fails = 0;
function check(name: string, ok: boolean, got?: unknown) {
  if (!ok) {
    fails++;
    console.log(`FAIL ${name}`, got ?? "");
  } else console.log(`ok   ${name}`);
}

const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const DAYS = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);

/** 30 days of one meal the way TodaysMeal walks them: the last 3 plates shown are avoided. */
function walk(meal: NamedMeal, rules: PracticeRules | null, key = "p1") {
  const shown: number[] = [];
  const out = [];
  for (const day of DAYS) {
    const idea = planForDay(meal, day, new Map(), 0, shown.slice(-3), new Map(), null, null, [], key, new Map(), [], rules);
    shown.push(idea.index);
    out.push(idea);
  }
  return out;
}
const has = (idea: { foods: { id: string }[] }, id: string) => idea.foods.some((f) => f.id === id);

// Leave out fish everywhere.
const noFish: PracticeRules = { avoid: ["fish"], prefer: [] };
for (const meal of MEALS) {
  const plates = walk(meal, noFish);
  check(`${meal}: fish never served when left out`, plates.every((p) => !has(p, "fish")), plates.filter((p) => has(p, "fish")).map((p) => p.names.join("+")));
  const repeats = plates.filter((p, i) => i > 0 && p.index === plates[i - 1].index).length;
  check(`${meal}: no plate two days running with rules on`, repeats === 0, repeats);
}

// Eat more okra soup at lunch and dinner.
const moreOkra: PracticeRules = { avoid: [], prefer: ["okra-soup"] };
for (const meal of ["lunch", "dinner"] as NamedMeal[]) {
  const before = walk(meal, null).filter((p) => has(p, "okra-soup")).length;
  const after = walk(meal, moreOkra).filter((p) => has(p, "okra-soup")).length;
  check(`${meal}: okra soup served more often (${before} -> ${after} of 30 days)`, after >= before + 5, { before, after });
}

// Both at once: a food cannot be pushed and blocked; left out still wins in the picker.
const both: PracticeRules = { avoid: ["chicken"], prefer: ["okra-soup"] };
const lunchBoth = walk("lunch", both);
check("lunch: left out chicken still never served with an eat-more rule on", lunchBoth.every((p) => !has(p, "chicken")));

// No rules = the same plates as before (the argument is optional).
for (const meal of MEALS) {
  const a = walk(meal, null).map((p) => p.index).join();
  const b = DAYS.map(() => 0).length && (() => {
    const shown: number[] = [];
    return DAYS.map((day) => {
      const idea = planForDay(meal, day, new Map(), 0, shown.slice(-3), new Map(), null, null, [], "p1", new Map(), []);
      shown.push(idea.index);
      return idea.index;
    }).join();
  })();
  check(`${meal}: no rules gives exactly the old plates`, a === b);
}

// Extras and snacks never bring a left-out food back, even on a huge gap.
const allExtras = practiceRuleFoodIds();
const leftOut = new Set(["walnut", "cashew-nut", "tiger-nut", "coconut"].filter((id) => allExtras.includes(id)));
let leaked = 0;
for (const meal of MEALS)
  for (const day of DAYS.slice(0, 10)) {
    const ex = suggestExtras(1500, day, meal, [], "p1", new Map(), undefined, undefined, new Map(), leftOut);
    const sn = suggestSnack(meal, 3000, ex, day, [], "p1", new Map(), new Map(), leftOut);
    for (const set of [ex, sn]) for (const v of set?.variants ?? []) for (const it of v.items) if (leftOut.has(it.food.id)) leaked++;
  }
check(`extras and snacks never use a left-out food (${[...leftOut].join(", ")})`, leaked === 0, leaked);

check("the dietitian's food list covers the blue card and the extras", allExtras.length > 50 && allExtras.includes("walnut") && allExtras.includes("fish"), allExtras.length);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
