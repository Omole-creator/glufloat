/**
 * "I don't have this" (co-founder dietitian + founder, 2026-10-24). Run after
 * any edit to lib/foodSwaps.ts, scripts/build-food-swaps.ts, swapInPlate or
 * the plates:
 *
 *   npx tsx scripts/food-swap-test.ts
 */
import { FOOD_SWAPS } from "../lib/foodSwaps";
import {
  ideasFor,
  planForDay,
  swapInPlate,
  swappableFoods,
  mealIdeaCalories,
  mealIdeaCarbs,
  mealIdeaFoodsForBuilder,
  LEAN_RED_MEAT_IDS,
  type MealIdea,
} from "../lib/nextMeal";
import { scoreMeal } from "../lib/verdictEngine";
import { getFood } from "../lib/search";
import type { NamedMeal } from "../lib/mealtime";
import type { Condition } from "../lib/personalization";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const key = (a: string[]) => [...a].sort().join("|");

// Her No rows and one-way rows (GluFloat-Food-Swaps-Marked.docx).
const HER_NO: [string, string][] = [
  ["afang-soup", "efo-riro"], ["afang-soup", "okra-soup"], ["atama-soup", "vegetable-soup"],
  ["banga-soup", "miyan-kuka"], ["edikang-ikong", "egusi-soup"], ["egusi-soup", "groundnut-soup"],
  ["egusi-soup", "miyan-taushe"], ["groundnut-soup", "miyan-taushe"], ["miyan-kubewa", "ogbono-soup"],
  ["miyan-kubewa", "white-soup"], ["dan-wake", "moi-moi"], ["dan-wake", "okpa"],
];
const ONE_WAY_BACK: [string, string][] = [["eggs", "egg-sauce"], ["oat-swallow", "pounded-yam"], ["cooked-beans", "moi-moi"]];

// 1. The list itself.
for (const [a, b] of HER_NO) {
  check(`her No ${a}/${b} never offered`, !FOOD_SWAPS.some((s) => (s.from === a && s.to === b) || (s.from === b && s.to === a)));
}
for (const [from, to] of ONE_WAY_BACK) {
  check(`one-way row never runs backwards (${from} -> ${to})`, !FOOD_SWAPS.some((s) => s.from === from && s.to === to));
}
check("eggs are never resized", !FOOD_SWAPS.some((s) => s.to === "eggs" && s.grams));

// 2. Every swap is green the way the card serves it (a blue-card plate, or a new green plate).
const unused: string[] = [];
for (const s of FOOD_SWAPS) {
  let landed = 0;
  for (const meal of MEALS) {
    const list = ideasFor(meal);
    list.forEach((plate, i) => {
      if (!plate.includes(s.from)) return;
      const idea: MealIdea = { foods: plate.map((id) => getFood(id)!), names: [], index: i, count: list.length };
      let swapped: MealIdea | null = null;
      for (let turn = 0; turn < 8 && swapped?.swapped?.to.id !== s.to; turn++) swapped = swapInPlate(meal, idea, s.from, {}, turn);
      if (!swapped || swapped.swapped?.to.id !== s.to) return;
      landed++;
      const foods = mealIdeaFoodsForBuilder(swapped);
      const verdict = scoreMeal(foods.map((f) => ({ food: f, portion: f.gluFloatSize ? "half" : "normal" }))).verdict;
      check(`${meal}: ${s.from} -> ${s.to} stays green`, verdict === "green", verdict);
      const ids = swapped.foods.map((f) => f.id);
      check(`${meal}: ${s.from} -> ${s.to} changes exactly one food`, ids.length === plate.length && ids.filter((id) => !plate.includes(id)).join() === s.to);
      if (meal === "dinner") {
        const to = getFood(s.to)!;
        check(`dinner: ${s.to} keeps dinner slow-sugar (or a swallow)`, list.some((p) => key(p) === key(ids)) || to.gi === "low" || ["garri-eba","pounded-yam","amala-yam","amala-plantain","fufu-akpu","cocoyam-fufu","lafun","semovita","wheat-swallow","tuwo-shinkafa","tuwo-masara","tuwo-dawa","acha","starch-delta"].includes(s.to));
      }
      if (s.grams) {
        const copy = foods.find((f) => f.id === s.to)!;
        check(`${s.from} -> ${s.to}: View details shows the swapped size`, copy.portionGuidance === s.instruction);
        const sum = foods.reduce((t, f) => t + (f.calories ?? 0), 0);
        check(`${s.from} -> ${s.to}: kcal agree with View details`, Math.abs(sum - mealIdeaCalories(swapped)) <= 1, `${sum} vs ${mealIdeaCalories(swapped)}`);
        check(`${s.from} -> ${s.to}: carbs include the new size`, mealIdeaCarbs(swapped) >= 0);
      }
    });
  }
  // A swap can only land where its food is served. Pap, custard and eko left
  // the blue card on 2026-10-26 (yellow even at the right size), so their
  // swaps stay in Favour's table, unused, until one of them is served again.
  const served = MEALS.some((m) => ideasFor(m).some((p) => p.includes(s.from)));
  if (!served) unused.push(`${s.from} -> ${s.to}`);
  else check(`${s.from} -> ${s.to} lands on at least one plate`, landed > 0);
}
if (unused.length) console.log(`Unused (food not on any blue-card plate): ${unused.join(", ")}`);
check("only the pap, custard and eko swaps are unused", unused.every((u) => /^(pap|custard|eko-agidi) ->/.test(u)), unused.join(", "));

// 3. The person's rules.
function anySwapInto(conditions: Condition[], to: Set<string>, extra: Parameters<typeof swapInPlate>[3] = {}): string | null {
  for (const meal of MEALS) {
    const list = ideasFor(meal);
    for (let i = 0; i < list.length; i++) {
      const idea: MealIdea = { foods: list[i].map((id) => getFood(id)!), names: [], index: i, count: list.length };
      for (const f of idea.foods) {
        for (let turn = 0; turn < 4; turn++) {
          const next = swapInPlate(meal, idea, f.id, { conditions, ...extra }, turn);
          if (next && to.has(next.swapped!.to.id)) return `${meal} ${f.id} -> ${next.swapped!.to.id}`;
        }
      }
    }
  }
  return null;
}
const hit1 = anySwapInto(["hypertension"], LEAN_RED_MEAT_IDS);
check("high blood pressure: never swapped INTO beef or goat", hit1 === null, hit1 ?? "");
const hit2 = anySwapInto(["high_cholesterol"], LEAN_RED_MEAT_IDS);
check("high cholesterol: never swapped INTO beef or goat", hit2 === null, hit2 ?? "");
const hit3 = anySwapInto(["kidney_disease"], new Set(["beef", "goat-meat", "smoked-fish"]));
check("kidney disease: never swapped into beef, goat or smoked fish", hit3 === null, hit3 ?? "");
const hit4 = anySwapInto([], new Set(["oat-swallow"]), { weekCounts: new Map([["oat-swallow", 3]]) });
check("oat swallow eaten 3 times this week: never swapped in", hit4 === null, hit4 ?? "");
const hit5 = anySwapInto([], new Set(["semovita"]), { swallows: ["garri-eba"] });
check("only ticked swallows are swapped in", hit5 === null, hit5 ?? "");
const hit6 = anySwapInto([], new Set(["turkey"]), { rules: { avoid: ["turkey"], prefer: [] } });
check("a dietitian's left-out food is never swapped in", hit6 === null, hit6 ?? "");
const noRed = anySwapInto([], LEAN_RED_MEAT_IDS);
check("without those conditions, beef or goat can be swapped in", noRed !== null);

// 4. The card: only foods with a swap get the button, and a swapped plate offers none.
let sawButton = false;
for (const meal of MEALS) {
  for (let d = 0; d < 14; d++) {
    const day = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10);
    const idea = planForDay(meal, day, new Map());
    const can = swappableFoods(meal, idea);
    for (const id of can) {
      sawButton = true;
      const next = swapInPlate(meal, idea, id);
      check(`${meal} ${day}: button on ${id} leads somewhere`, next !== null);
      if (next) check(`${meal} ${day}: one swap at a time`, next.swapped !== undefined && swappableFoods(meal, next).size === 0);
    }
  }
}
check("some blue-card plates offer a swap", sawButton);

// 5. With a calorie target the swapped plate is sized like the blue card.
const lunch = planForDay("lunch", "2026-10-05", new Map(), 0, [], new Map(), null, 900);
for (const id of swappableFoods("lunch", lunch, { calorieTargetForMeal: 900 })) {
  const next = swapInPlate("lunch", lunch, id, { calorieTargetForMeal: 900 })!;
  check(`calorie target: ${id} swap keeps the plate near its share`, mealIdeaCalories(next) <= 900 + 250, String(mealIdeaCalories(next)));
}

console.log(`${FOOD_SWAPS.length} swaps checked.`);
if (failures > 0) {
  console.log(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("all passed.");
