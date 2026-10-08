/**
 * "One voice" (co-founder dietitian, 2026-10-08): a plate shown in search
 * must read exactly as it does on the blue card. Run after any edit to
 * platesWithFood / planForDay / the scalers in lib/nextMeal.ts.
 *
 *   npx tsx scripts/one-voice-test.ts
 */
import { planForDay, platesWithFood, ideasFor, mealIdeaCalories, mealIdeaCarbs, mealIdeaFoodsForBuilder, GLUFLOAT_SIZE_STARCHES, SIZE_GROUP_LIMIT } from "../lib/nextMeal";
import { scoreMeal } from "../lib/verdictEngine";
import type { NamedMeal } from "../lib/mealtime";
import type { Condition } from "../lib/personalization";

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    console.error("FAIL:", msg);
  }
};
const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];

// 1. For every target, day and condition set, the blue card's plate appears
//    in search for each of its foods, with the same size and numbers.
const targets = [null, 450, 700, 900, 1400, 2200];
const conds: Condition[][] = [[], ["hypertension"], ["kidney_disease"]];
let compared = 0;
for (const meal of MEALS)
  for (const t of targets)
    for (const c of conds)
      for (let d = 1; d <= 12; d++) {
        const day = `2026-10-${String(d).padStart(2, "0")}`;
        const card = planForDay(meal, day, new Map(), 0, [], new Map(), null, t, c);
        for (const f of card.foods) {
          const found = platesWithFood(f.id, { [meal]: t }, c)[meal].find((p) => p.index === card.index);
          check(Boolean(found), `${meal} ${t} ${c} ${day}: plate ${card.index} missing from search for ${f.id}`);
          if (!found) continue;
          compared++;
          check(mealIdeaCalories(found) === mealIdeaCalories(card), `${meal} plate ${card.index}: kcal ${mealIdeaCalories(found)} vs ${mealIdeaCalories(card)}`);
          check(mealIdeaCarbs(found) === mealIdeaCarbs(card), `${meal} plate ${card.index}: carbs differ`);
          check(found.scaledProtein?.instruction === card.scaledProtein?.instruction, `${meal} plate ${card.index}: bigger serving differs`);
          check(found.scaledSide?.instruction === card.scaledSide?.instruction, `${meal} plate ${card.index}: bigger side differs`);
          // "Check a meal" (via View details or a search plate) totals the same.
          const built = mealIdeaFoodsForBuilder(found);
          const kcal = built.reduce((x, b) => x + (b.calories ?? 0), 0);
          const carbs = Math.round(built.reduce((x, b) => x + (b.carbG ?? 0), 0));
          check(Math.abs(kcal - mealIdeaCalories(card)) <= 1, `${meal} plate ${card.index}: builder ${kcal} kcal vs card ${mealIdeaCalories(card)}`);
          check(Math.abs(carbs - mealIdeaCarbs(card)) <= 1, `${meal} plate ${card.index}: builder ${carbs}g carbs vs card ${mealIdeaCarbs(card)}`);
        }
      }

// 2. Every plate search shows really holds the food, is green, and a flagged
//    condition never shows a protein the blue card would drop.
const allIds = new Set(MEALS.flatMap((m) => ideasFor(m).flat()));
for (const id of allIds) {
  const res = platesWithFood(id, {}, ["hypertension"]);
  for (const m of MEALS)
    for (const p of res[m]) {
      check(p.foods.some((f) => f.id === id), `${id}: a ${m} plate without it`);
      check(
        scoreMeal(p.foods.map((food) => ({ food, portion: GLUFLOAT_SIZE_STARCHES.has(food.id) ? ("half" as const) : ("normal" as const) }))).verdict === "green",
        `${id}: ${m} plate ${p.index} not green at the right size`,
      );
      check(!p.foods.some((f) => f.healthNote && f.category === "protein"), `${id}: ${m} plate ${p.index} has a warned protein with a condition`);
    }
}

// 3. A food in no plate shows nothing, and the list is closest-to-target first.
const none = platesWithFood("dodo");
check(MEALS.every((m) => none[m].length === 0), "dodo (red) should be in no plate");
const lunch = platesWithFood("oat-swallow", { lunch: 900 }).lunch;
for (let i = 1; i < lunch.length; i++)
  check(Math.abs(900 - mealIdeaCalories(lunch[i - 1])) <= Math.abs(900 - mealIdeaCalories(lunch[i])), "oat swallow lunch plates not closest-first");

console.log(`${compared} blue-card plates compared with search across ${allIds.size} foods.`);
if (fails) {
  console.error(`${fails} failure(s)`);
  process.exit(1);
}
console.log("One voice: every blue-card plate reads the same in search.");

// 4. Ofada and brown rice (3 a week): lunch only, and gone once eaten 3 times.
{
  const lunch = ideasFor("lunch");
  check(lunch.some((p) => p.includes("ofada-rice")) && lunch.some((p) => p.includes("brown-rice")), "rice plates missing from lunch");
  check(!ideasFor("dinner").some((p) => p.includes("ofada-rice") || p.includes("brown-rice")), "rice must not be at dinner");
  const full = new Map([["ofada-rice", 3], ["brown-rice", 3]]);
  for (let d = 1; d <= 28; d++) {
    const day = `2026-11-${String(d).padStart(2, "0")}`;
    for (const off of [0, 1, 2, 3]) {
      const p = planForDay("lunch", day, new Map(), off, [], new Map(), null, 900, [], "", full);
      check(!p.foods.some((f) => f.id === "ofada-rice" || f.id === "brown-rice"), `rice served after 3 this week (${day})`);
    }
  }
  check(platesWithFood("ofada-rice", {}, [], full).lunch.length === 0, "search should hide rice past its weekly count");
  check(platesWithFood("ofada-rice").lunch.length > 0, "search should show rice under its weekly count");
  if (!fails) console.log("Rice plates: lunch only, and they leave the rotation at 3 a week.");
  if (fails) process.exit(1);
}

// 5. GluFloat-size plates (eba, semo, white rice...): at most 2 of each, and
//    at most 2 of them all together, eaten in 7 days. They tell the person the
//    size, and "Check a meal" scores the starch at that size.
{
  const isSize = (p: { foods: { id: string }[] }) => p.foods.some((f) => GLUFLOAT_SIZE_STARCHES.has(f.id));
  const group = new Map([["garri-eba", 1], ["semovita", 1]]); // 2 eaten in total
  const one = new Map([["garri-eba", 2]]); // eba at its own limit
  let sawSize = false;
  for (let d = 1; d <= 28; d++) {
    const day = `2026-11-${String(d).padStart(2, "0")}`;
    for (const meal of ["breakfast", "lunch"] as const)
      for (const off of [0, 1, 2, 3, 4]) {
        const free = planForDay(meal, day, new Map(), off, [], new Map(), null, null, [], "", new Map());
        if (isSize(free)) {
          sawSize = true;
          check(Boolean(free.sizeNote), `${meal} plate ${free.index}: GluFloat-size plate without its size line`);
          const built = mealIdeaFoodsForBuilder(free);
          check(built.some((f) => f.gluFloatSize), `${meal} plate ${free.index}: builder copy does not keep the right size`);
        }
        const capped = planForDay(meal, day, new Map(), off, [], new Map(), null, null, [], "", group);
        check(!isSize(capped), `${meal} ${day}: a GluFloat-size plate served after 2 eaten this week`);
        const ebaOut = planForDay(meal, day, new Map(), off, [], new Map(), null, null, [], "", one);
        check(!ebaOut.foods.some((f) => f.id === "garri-eba"), `${meal} ${day}: eba served after 2 this week`);
      }
  }
  check(sawSize, "no GluFloat-size plate ever came up in 28 days");
  check(platesWithFood("garri-eba", {}, [], group).lunch.length === 0, "search should hide eba once the group is full");
  check(platesWithFood("garri-eba").lunch.length > 0, "search should show eba plates under the limit");
  check(SIZE_GROUP_LIMIT === 2, "group limit should be 2");
  if (fails) process.exit(1);
  console.log("GluFloat-size plates: size line shown, kept in Check a meal, 2 each and 2 in total a week.");
}
