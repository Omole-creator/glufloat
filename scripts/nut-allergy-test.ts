// Nut allergy (founder, 2026-11-06). Run after any edit to lib/nutAllergy.ts, or
// when a food holding a nut is added.   npx tsx scripts/nut-allergy-test.ts
import foods from "../data/foods.json";
import {
  allNutFoodIds,
  blockedFoods,
  NUT_ALL,
  NUT_NONE,
  NUT_OPTIONS,
  nutAllergyLabel,
  nutAllergyNote,
  withNutAllergies,
} from "../lib/nutAllergy";
import { isOatPlate, oatNextChoice, planForDay, suggestExtras, swappableFoods, swapInPlate, type PracticeRules } from "../lib/nextMeal";
import type { NamedMeal } from "../lib/mealtime";

let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (!ok) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  }
};
const ids = new Set((foods as { id: string }[]).map((f) => f.id));
for (const id of allNutFoodIds()) check(`${id} is a real food`, ids.has(id));

// A new food with a nut in its name must be listed.
const NUT_WORDS = /groundnut|peanut|cashew|walnut|almond|tiger nut|coconut|kuli|gyada/i;
for (const f of foods as { id: string; name: string }[])
  if (NUT_WORDS.test(`${f.id} ${f.name}`.replace(/-/g, " "))) check(`${f.id} is covered`, allNutFoodIds().includes(f.id));

check("not answered blocks nothing", blockedFoods(null).size === 0);
check("no blocks nothing", blockedFoods([NUT_NONE]).size === 0);
check("not sure blocks every nut", blockedFoods([NUT_ALL]).size === allNutFoodIds().length);
check("no answer keeps the rules", withNutAllergies(null, [NUT_NONE]) === null);
const merged = withNutAllergies({ avoid: ["fish"], prefer: ["groundnut", "eggs"] }, ["groundnut"])!;
check("a dietitian's left-out foods stay", merged.avoid.includes("fish") && merged.avoid.includes("groundnut"));
check("an eat-more food they cannot eat is dropped", merged.prefer.join() === "eggs");
check("the label says no", nutAllergyLabel([NUT_NONE]) === "No");
check("not answered has no label", nutAllergyLabel(null) === null);

const banana = { id: "banana", pairingAdvice: "About 10 groundnuts." };
check("a pairing with groundnut warns", /Leave it out/.test(nutAllergyNote(banana, ["groundnut"]) ?? ""));
check("no warning for another nut", nutAllergyNote(banana, ["cashew"]) === null);
check("the food itself warns", /Do not eat this/.test(nutAllergyNote({ id: "groundnut-soup", pairingAdvice: "" }, ["groundnut"]) ?? ""));

// The plates, the extras and the changes, for each nut and for not sure.
const MEALS = ["breakfast", "lunch", "dinner"] as NamedMeal[];
const days = Array.from({ length: 28 }, (_, d) => `2026-11-${String(d + 1).padStart(2, "0")}`);
for (const answer of [...NUT_OPTIONS.map((o) => [o.value]), [NUT_ALL]]) {
  const blocked = blockedFoods(answer);
  const rules = withNutAllergies(null, answer) as PracticeRules;
  const leftOut = new Set(rules.avoid);
  for (const meal of MEALS)
    for (const day of days)
      for (const offset of [0, 1, 2, 3]) {
        const idea = planForDay(meal, day, new Map(), offset, [], new Map(), null, 900, [], "", new Map(), [], rules);
        const bad = idea.foods.find((f) => blocked.has(f.id));
        check(`${answer} ${meal} ${day}: plate is clear`, !bad, bad?.id);
        if (offset > 0) continue;
        const ctx = { rules };
        if (isOatPlate(idea))
          for (const f of idea.foods) {
            const next = oatNextChoice(idea, f.id, ctx);
            check(`${answer}: oat change never offers a nut`, !next || !blocked.has(next), next);
          }
        for (const id of swappableFoods(meal, idea, ctx)) {
          const s = swapInPlate(meal, idea, id, ctx);
          const nut = s?.foods.find((f) => blocked.has(f.id));
          check(`${answer}: a swap never brings a nut`, !nut, nut?.id);
        }
        for (const gap of [150, 500, 1200]) {
          const ex = suggestExtras(gap, day, meal, [], "", new Map(), undefined, undefined, new Map(), leftOut);
          for (const v of ex?.variants ?? [])
            for (const o of v.items) check(`${answer} ${meal}: extras are clear`, !blocked.has(o.food.id), o.food.id);
        }
      }
}
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
