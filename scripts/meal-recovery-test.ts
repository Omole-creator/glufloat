// Getting back on track after a different meal (co-founder dietitian,
// 2026-10-23). No server needed. Run after any edit to mealShareFor,
// plannedMealShare, stillPlannedToday (lib/nextMeal.ts) or lib/mealRecovery.ts.
import {
  mealShareFor,
  plannedMealShare,
  stillPlannedToday,
  ideasFor,
  isExtraFood,
  excludedProteinsFor,
  leanRedMeatServing,
  planForDay,
  platesWithFood,
  mealIdeaCalories,
  LEAN_RED_MEAT_IDS,
} from "../lib/nextMeal";
import { getFood, FOODS } from "../lib/search";
import { remainingMealCalorieTarget } from "../lib/tdee";
import { differentMealBefore, recoveryLine, followUpLine, FOLLOW_UP, type SavedMeal } from "../lib/mealRecovery";
import type { NamedMeal } from "../lib/mealtime";

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`ok   ${label}`);
  else {
    console.error(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
    failures++;
  }
}

const THREE: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const TWO: NamedMeal[] = ["breakfast", "dinner"];
const TARGETS = [1200, 1500, 1800, 2200, 2700, 3200, 4000];
const KIDNEY = [[], ["kidney_disease"]] as const;

// 1. A normal day (each meal eaten at its own share) is exactly as before.
for (const T of TARGETS) {
  for (const cond of KIDNEY) {
    for (const pattern of [THREE, TWO]) {
      let eaten = 0;
      for (const m of THREE) {
        if (!pattern.includes(m)) continue;
        const share = mealShareFor(T, eaten, pattern, m, [...cond]);
        const planned = plannedMealShare(T, pattern, m, [...cond]);
        check(`normal day ${T} ${cond.join("") || "-"} ${pattern.length} ${m}: share is the plan`, Math.abs(share - planned) <= 1, `${share} vs ${planned}`);
        eaten += share;
      }
    }
  }
}

// 2. Ada: 1,800 a day, 600 breakfast, a 1,000 lunch. Dinner stays 600.
{
  const T = 1800;
  const dinner = mealShareFor(T, 1600, THREE, "dinner");
  check("Ada: dinner stays 600 after a 1,000 lunch", dinner === 600, String(dinner));
  check("Ada: the old budget rule would have said 200", remainingMealCalorieTarget(T, 1600, THREE, "dinner") === 200);
  check("Ada: still planned before dinner is 600", stillPlannedToday(T, 1600, THREE, "dinner") === 600);
  check("Ada: nothing planned once dinner is eaten", stillPlannedToday(T, 2200, THREE, "dinner", [], 600) === 0);
}

// 3. A big meal earlier never makes a later meal smaller, at any size.
for (const T of TARGETS) {
  for (const cond of KIDNEY) {
    const lunchPlan = plannedMealShare(T, THREE, "lunch", [...cond]);
    const dinnerPlan = plannedMealShare(T, THREE, "dinner", [...cond]);
    for (const extra of [1, 100, 400, 1000, 3000]) {
      const b = plannedMealShare(T, THREE, "breakfast", [...cond]) + extra;
      const lunch = mealShareFor(T, b, THREE, "lunch", [...cond]);
      check(`${T} ${cond.join("") || "-"}: big breakfast (+${extra}) keeps lunch`, lunch >= lunchPlan - 1, `${lunch} < ${lunchPlan}`);
      const dinner = mealShareFor(T, b + lunchPlan + extra, THREE, "dinner", [...cond]);
      check(`${T} ${cond.join("") || "-"}: big lunch (+${extra}) keeps dinner`, dinner >= dinnerPlan - 1, `${dinner} < ${dinnerPlan}`);
    }
  }
}

// 4. A smaller meal is still made up later.
{
  const T = 1800;
  const dinner = mealShareFor(T, 600 + 300, THREE, "dinner");
  check("small lunch: dinner makes up the gap (900)", dinner === 900, String(dinner));
}

// 5. Eating at THIS meal still counts against it, as before.
{
  const T = 1800;
  const after = mealShareFor(T, 600 + 600, THREE, "lunch", [], 600);
  check("lunch share after eating lunch matches the old rule", after === remainingMealCalorieTarget(T, 1200, THREE, "lunch"), String(after));
  check("share is never below 0", mealShareFor(T, 5000, THREE, "dinner", [], 5000) === 0);
}

// 6. The different-meal rule.
{
  const lunchPlate = ideasFor("lunch")[0];
  const shown = (m: NamedMeal) => (m === "lunch" ? lunchPlate : null);
  const extraId = ["walnut", "cashew-nut", "tiger-nut", "coconut"].find(isExtraFood);
  check("an extras food exists to test with", !!extraId);
  const notOnPlate = ideasFor("lunch").flat().find((id) => !lunchPlate.includes(id) && !isExtraFood(id))!;
  const run = (saved: SavedMeal[]) => differentMealBefore("dinner", saved, shown, isExtraFood);

  check("ate the blue-card lunch: no line", run([{ meal: "lunch", foodIds: [...lunchPlate] }]) === null);
  check("ate part of it: no line", run([{ meal: "lunch", foodIds: [lunchPlate[0]] }]) === null);
  check("lunch plus extras: no line", run([{ meal: "lunch", foodIds: [...lunchPlate] }, { meal: "lunch", foodIds: [extraId!] }]) === null);
  check("only extras at lunch: no line", run([{ meal: "lunch", foodIds: [extraId!] }]) === null);
  check("nothing saved: no line", run([]) === null);
  check("a different lunch: line", run([{ meal: "lunch", foodIds: [notOnPlate] }]) === "lunch");
  check("blue plate plus another food: line", run([{ meal: "lunch", foodIds: [...lunchPlate, notOnPlate] }]) === "lunch");
  check("plate not known (another phone): no line", differentMealBefore("dinner", [{ meal: "lunch", foodIds: [notOnPlate] }], () => null, isExtraFood) === null);
  check("breakfast has nothing before it", differentMealBefore("breakfast", [{ meal: "breakfast", foodIds: [notOnPlate] }], shown, isExtraFood) === null);
  check("dinner's own meal is not 'before'", run([{ meal: "dinner", foodIds: [notOnPlate] }]) === null);
  check(
    "the line is her words",
    recoveryLine("lunch", "dinner") === "You've logged a different meal at lunch. Your personalised dinner recommendation is ready below.",
  );
  check("the line has no em dash", !recoveryLine("breakfast", "lunch").includes("—"));
}

// 7. Her follow-up lines.
{
  const drink = FOODS.find((f) => f.role === "drink" && f.gi === "high")!.id;
  const sweet = FOODS.find((f) => f.role === "sugar")!.id;
  const fried = FOODS.find((f) => (f.healthNote ?? "").startsWith("This food is fried"))!.id;
  const plain = ideasFor("lunch")[0];
  const line = (saved: SavedMeal[]) => followUpLine("dinner", saved, getFood, isExtraFood);
  check("sweet drink line", line([{ meal: "lunch", foodIds: [drink], sizes: ["normal"] }]) === FOLLOW_UP.sweetDrink);
  check("sweet food line", line([{ meal: "lunch", foodIds: [sweet], sizes: ["normal"] }]) === FOLLOW_UP.sweetFood);
  check("fried food line", line([{ meal: "lunch", foodIds: [fried], sizes: ["normal"] }]) === FOLLOW_UP.fried);
  check("drink wins over fried", line([{ meal: "lunch", foodIds: [fried, drink], sizes: ["normal", "normal"] }]) === FOLLOW_UP.sweetDrink);
  check("ate more line", line([{ meal: "lunch", foodIds: [...plain], sizes: plain.map((_, i) => (i === 0 ? "more:1.5" : "normal")) }]) === FOLLOW_UP.more);
  check("older 'large' counts as more", line([{ meal: "lunch", foodIds: [plain[0]], sizes: ["large"] }]) === FOLLOW_UP.more);
  check("blue card's bigger serving is not 'more'", line([{ meal: "lunch", foodIds: [plain[0]], sizes: ["163g"] }]) === null);
  check("the plate at its size: no line", line([{ meal: "lunch", foodIds: [...plain], sizes: plain.map(() => "normal") }]) === null);
  check("nothing before breakfast", followUpLine("breakfast", [{ meal: "breakfast", foodIds: [drink] }], getFood, isExtraFood) === null);
  check("no follow-up line has an em dash", Object.values(FOLLOW_UP).every((l) => !l.includes("—")));
}

// 8. Beef and goat meat (co-founder dietitian, 2026-10-23).
{
  const none = new Map<string, number>();
  for (const id of LEAN_RED_MEAT_IDS) check(`${id} exists`, !!getFood(id));
  check("no condition: nothing dropped", excludedProteinsFor([], none).size === 0);
  const bp = excludedProteinsFor(["hypertension"], none);
  const chol = excludedProteinsFor(["high_cholesterol"], none);
  const kid = excludedProteinsFor(["kidney_disease"], none);
  const bpKid = excludedProteinsFor(["hypertension", "kidney_disease"], none);
  for (const id of LEAN_RED_MEAT_IDS) {
    check(`blood pressure: ${id} allowed`, !bp.has(id));
    check(`cholesterol: ${id} allowed`, !chol.has(id));
    check(`kidney: ${id} still dropped`, kid.has(id));
    check(`blood pressure + kidney: ${id} still dropped`, bpKid.has(id));
  }
  for (const id of ["pomo", "shaki", "stockfish", "smoked-fish"]) {
    if (kid.has(id)) check(`blood pressure: ${id} still dropped`, bp.has(id));
  }
  const three = new Map([["beef", 2], ["goat-meat", 1]]);
  check("3 this week (beef + goat together): dropped again", excludedProteinsFor(["hypertension"], three).has("beef"));
  check("2 this week: still allowed", !excludedProteinsFor(["hypertension"], new Map([["beef", 2]])).has("goat-meat"));

  const beef = getFood("beef")!;
  const s1 = leanRedMeatServing([beef], ["hypertension"]);
  check("50g serving for blood pressure", s1?.grams === 50, String(s1?.grams));
  check("50g serving has fewer calories", !!s1 && s1.calories < (beef.calories ?? 0) && s1.extraCalories < 0);
  check("no smaller serving without the conditions", leanRedMeatServing([beef], []) === null);
  check("no smaller serving for kidney", leanRedMeatServing([beef], ["kidney_disease", "hypertension"]) === null);
  check("the instruction names 50g", !!s1 && s1.instruction.includes("50g"));

  // On the blue card and in search, a beef or goat plate shows the 50g size.
  let seen = 0;
  for (const meal of ["breakfast", "lunch", "dinner"] as NamedMeal[]) {
    for (let d = 0; d < 28; d++) {
      const day = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10);
      // No calorie target: since soups are counted without meat (2026-10-24) the
      // lighter beef plates rarely win the calorie narrowing, and this check is
      // about the 50g size whenever beef or goat is shown, not how often.
      const idea = planForDay(meal, day, new Map(), 0, [], new Map(), null, null, ["hypertension"]);
      const meat = idea.foods.find((f) => LEAN_RED_MEAT_IDS.has(f.id));
      if (!meat) continue;
      seen++;
      check(`blue card ${meal} ${day}: ${meat.id} at 50g`, idea.scaledProtein?.food.id === meat.id && idea.scaledProtein.grams === 50);
    }
  }
  check("beef or goat comes up for blood pressure at all", seen > 0, String(seen));
  for (const id of LEAN_RED_MEAT_IDS) {
    const plates = platesWithFood(id, { lunch: 900, dinner: 900 }, ["high_cholesterol"]);
    const all = [...plates.lunch, ...plates.dinner];
    check(`search shows ${id} plates for cholesterol`, all.length > 0);
    check(`search ${id} plates at 50g`, all.every((p) => p.scaledProtein?.grams === 50));
    check(`search ${id} kcal uses the smaller size`, all.every((p) => mealIdeaCalories(p) < p.foods.reduce((s, f) => s + (f.calories ?? 0), 0)));
    check(`search hides ${id} for kidney`, [...Object.values(platesWithFood(id, {}, ["kidney_disease"]))].flat().length === 0);
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nall passed.");
