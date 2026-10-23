// Getting back on track after a different meal (co-founder dietitian,
// 2026-10-23). No server needed. Run after any edit to mealShareFor,
// plannedMealShare, stillPlannedToday (lib/nextMeal.ts) or lib/mealRecovery.ts.
import { mealShareFor, plannedMealShare, stillPlannedToday, ideasFor, isExtraFood } from "../lib/nextMeal";
import { remainingMealCalorieTarget } from "../lib/tdee";
import { differentMealBefore, recoveryLine, type SavedMeal } from "../lib/mealRecovery";
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

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nall passed.");
