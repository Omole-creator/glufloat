/**
 * "One voice" (co-founder dietitian, 2026-10-08): a plate shown in search
 * must read exactly as it does on the blue card. Run after any edit to
 * platesWithFood / planForDay / the scalers in lib/nextMeal.ts.
 *
 *   npx tsx scripts/one-voice-test.ts
 */
import { planForDay, platesWithFood, ideasFor, rightSizePortion, rightSizeNote, mealIdeaCalories, mealIdeaCarbs, mealIdeaFoodsForBuilder, GLUFLOAT_SIZE_STARCHES, SIZE_GROUP_LIMIT, SWALLOW_IDS, SWALLOW_WEEKLY_LIMIT, LEAN_RED_MEAT_IDS } from "../lib/nextMeal";
import { scoreMeal } from "../lib/verdictEngine";
import foodsData from "../data/foods.json";
import type { Food } from "../lib/types";
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
      // Beef and goat meat may come back for high blood pressure, at 50g
      // (co-founder dietitian, 2026-10-23); every other warned protein may not.
      check(
        !p.foods.some((f) => f.healthNote && f.category === "protein" && !LEAN_RED_MEAT_IDS.has(f.id)),
        `${id}: ${m} plate ${p.index} has a warned protein with a condition`,
      );
      const meat = p.foods.find((f) => LEAN_RED_MEAT_IDS.has(f.id));
      check(!meat || p.scaledProtein?.grams === 50, `${id}: ${m} plate ${p.index} beef/goat not at 50g`);
    }
}

// 3. A food in no plate shows nothing, and the list is closest-to-target first.
const none = platesWithFood("dodo");
check(MEALS.every((m) => none[m].length === 0), "dodo (red) should be in no plate");
const lunch = platesWithFood("oat-swallow", { lunch: 900 }).lunch;
for (let i = 1; i < lunch.length; i++)
  check(Math.abs(900 - mealIdeaCalories(lunch[i - 1])) <= Math.abs(900 - mealIdeaCalories(lunch[i])), "oat swallow lunch plates not closest-first");

// 3b. "Check a meal" built BY HAND (foods typed in one by one, the raw data,
//     no blue-card copy) gives every blue-card plate the same colour as
//     "View details" does, and says the starch's size (founder, 2026-10-25:
//     eba + soup + fish was green on the card and yellow by hand).
{
  const byId = new Map((foodsData as Food[]).map((f) => [f.id, f]));
  const hand = (ids: string[]) => scoreMeal(ids.map((id) => ({ food: byId.get(id)!, portion: rightSizePortion(id) })));
  let plates = 0;
  for (const m of MEALS)
    ideasFor(m).forEach((ids, index) => {
      plates++;
      const raw = ids.map((id) => byId.get(id)!);
      const seeded = mealIdeaFoodsForBuilder({ foods: raw, names: [], index, count: 0 } as never);
      const seededVerdict = scoreMeal(seeded.map((f) => ({ food: f, portion: rightSizePortion(f.id) }))).verdict;
      check(hand(ids).verdict === seededVerdict, `${m} plate ${index} (${ids.join("+")}): by hand ${hand(ids).verdict}, from the card ${seededVerdict}`);
      check(hand(ids).verdict === "green", `${m} plate ${index} (${ids.join("+")}) is ${hand(ids).verdict} when built by hand`);
      if (ids.some((id) => GLUFLOAT_SIZE_STARCHES.has(id)))
        check(Boolean(rightSizeNote(raw)), `${m} plate ${index}: no size line in Check a meal`);
    });
  check(plates > 100, `only ${plates} plates checked by hand`);
  // A fast-sugar swallow on its own reads the same as its search card.
  for (const id of SWALLOW_IDS) {
    const f = byId.get(id)!;
    check(hand([id]).verdict === f.baseVerdict, `${id} alone: Check a meal ${hand([id]).verdict}, search ${f.baseVerdict}`);
  }
  // Eba + soup + fish, the exact report.
  check(hand(["garri-eba", "egusi-soup", "fish"]).verdict === "green", "eba + egusi + fish not green by hand");
  // The right size never rescues a stacked plate or a fried starch.
  check(hand(["garri-eba", "pounded-yam", "egusi-soup", "fish"]).verdict === "red", "two swallows should stay red");
  check(hand(["white-rice", "boiled-yam", "efo-riro", "fish"]).verdict === "red", "rice + yam should stay red");
  check(hand(["dodo", "cooked-beans", "fish"]).verdict === "red", "beans + dodo should stay red");
  check(hand(["agege-bread", "cooked-beans"]).verdict === "red", "white bread + beans should stay red");
}

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

// 5. GluFloat-size plates (white rice, yam, plantain...): at most 2 of each,
//    and at most 2 of them all together, eaten in 7 days. The swallows have
//    their own shared count of 4 (founder, 2026-10-12). They tell the person
//    the size, and "Check a meal" scores the starch at that size.
{
  const isSize = (p: { foods: { id: string }[] }) => p.foods.some((f) => GLUFLOAT_SIZE_STARCHES.has(f.id) && !SWALLOW_IDS.has(f.id));
  const isSwallow = (p: { foods: { id: string }[] }) => p.foods.some((f) => SWALLOW_IDS.has(f.id));
  const group = new Map([["white-rice", 1], ["boiled-yam", 1]]); // 2 eaten in total
  const one = new Map([["garri-eba", 4]]); // eba four times: the swallow week is used up
  const mixed = new Map([["garri-eba", 1], ["tuwo-shinkafa", 1], ["amala-yam", 1], ["fufu-akpu", 1]]);
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
        check(!isSwallow(ebaOut), `${meal} ${day}: a swallow served after eba 4 times this week`);
        const mixOut = planForDay(meal, day, new Map(), off, [], new Map(), null, null, [], "", mixed);
        check(!isSwallow(mixOut), `${meal} ${day}: a swallow served after 4 different swallows this week`);
      }
    // Dinner may carry a swallow, under the same count.
    for (const off of [0, 1, 2, 3, 4]) {
      const capped = planForDay("dinner", day, new Map(), off, [], new Map(), null, null, [], "", one);
      check(!isSwallow(capped), `dinner ${day}: a swallow served after 4 this week`);
    }
  }
  // Three swallows eaten: one more is still allowed, and eba may be it.
  check(platesWithFood("garri-eba", {}, [], new Map([["garri-eba", 3]])).lunch.length > 0, "search should still show eba at 3 swallows");
  check(platesWithFood("garri-eba", {}, [], one).lunch.length === 0, "search should hide eba once 4 swallows are eaten");
  check(platesWithFood("acha").dinner.length > 0, "acha plates should be offered at dinner");
  check(SWALLOW_WEEKLY_LIMIT === 4, "swallow limit should be 4");
  // "Which swallows do you eat?": only ticked traditional swallows come up.
  for (let d = 1; d <= 28; d++) {
    const day = `2026-11-${String(d).padStart(2, "0")}`;
    for (const meal of ["lunch", "dinner"] as const)
      for (const off of [0, 1, 2]) {
        const p = planForDay(meal, day, new Map(), off, [], new Map(), null, null, [], "", new Map(), ["tuwo-shinkafa", "acha"]);
        const other = p.foods.find((f) => SWALLOW_IDS.has(f.id) && !["tuwo-shinkafa", "acha"].includes(f.id));
        check(!other, `${meal} ${day}: ${other?.id} offered to someone who eats only tuwo shinkafa and acha`);
      }
  }
  check(sawSize, "no GluFloat-size plate ever came up in 28 days");
  check(platesWithFood("white-rice", {}, [], group).lunch.length === 0, "search should hide white rice once the group is full");
  check(platesWithFood("garri-eba").lunch.length > 0, "search should show eba plates under the limit");
  check(platesWithFood("garri-eba", {}, [], group).lunch.length > 0, "eba keeps its own count, apart from the rice/yam group");
  check(SIZE_GROUP_LIMIT === 2, "group limit should be 2");
  if (fails) process.exit(1);
  console.log("GluFloat-size plates: size line shown, kept in Check a meal, 2 each and 2 in total a week; swallows 4 a week in total, lunch or dinner, only the ones ticked.");
}
