// Oat swallow rules (founder and co-founder dietitian, 2026-11-06), and the
// daily calorie target across a real WEEK. Run after any edit to planForDay,
// the weekly limits, the extras caps or the oat swallow functions.
//   npx tsx scripts/oat-plates-test.ts
import {
  OAT_HIGH_NEED_TARGET,
  OAT_HIGH_NEED_WEEKLY,
  OAT_SWALLOW,
  isOatPlate,
  mealIdeaCalories,
  mealShareFor,
  NUT_DAILY_MAX_G,
  NUT_GROUP,
  oatNextChoice,
  oatPlateIds,
  oatPlateWith,
  planForDay,
  suggestExtras,
  suggestSnack,
  swappableFoods,
  type MealIdea,
} from "../lib/nextMeal";
import type { NamedMeal } from "../lib/mealtime";
import { scoreMeal } from "../lib/verdictEngine";
import { mealFrequency, plainFrequency, withOatFrequency } from "../lib/frequency";
import { clinicalTarget } from "../lib/tdee";
import { biasVector, type Goal } from "../lib/personalization";

let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (!ok) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  }
};
const hasOat = (i: MealIdea) => i.foods.some((f) => f.id === OAT_SWALLOW);
const plan = (meal: NamedMeal, day: string, offset: number, week = new Map<string, number>(), oat = {}, conditions: never[] = []) =>
  planForDay(meal, day, new Map(), offset, [], new Map(), null, null, conditions, "", week, [], null, oat);

// 1. Once oat swallow has had its card, "Try another meal" never brings it back.
for (const meal of ["lunch", "dinner"] as NamedMeal[])
  for (let d = 1; d <= 28; d++) {
    const day = `2026-11-${String(d).padStart(2, "0")}`;
    for (let tap = 0; tap < 12; tap++) check(`${meal} ${day} tap ${tap}: no oat after its card`, !hasOat(plan(meal, day, tap, new Map(), { skip: true })));
  }

// 2. Without the rule oat swallow is still there to be offered.
check("oat swallow is still served", Array.from({ length: 28 }, (_, d) => plan("lunch", `2026-11-${String(d + 1).padStart(2, "0")}`, 0)).some(hasOat));

// 3. The weekly count: 3 for most people, 7 for a high target.
const at = (n: number) => new Map([[OAT_SWALLOW, n]]);
const days = Array.from({ length: 28 }, (_, d) => `2026-11-${String(d + 1).padStart(2, "0")}`);
check("3 eaten: no oat for an ordinary target", !days.some((d) => hasOat(plan("lunch", d, 0, at(3)))));
check("3 eaten: a high target can still have it", days.some((d) => hasOat(plan("lunch", d, 0, at(3), { highNeed: true }))));
check("7 eaten: not even a high target", !days.some((d) => hasOat(plan("lunch", d, 0, at(OAT_HIGH_NEED_WEEKLY), { highNeed: true }))));

// 4. Changing the soup and the protein.
const oatDay = days.find((d) => isOatPlate(plan("lunch", d, 0)))!;
const oatPlate = plan("lunch", oatDay, 0);
const soup = oatPlate.foods[1];
const protein = oatPlate.foods[2];
const can = swappableFoods("lunch", oatPlate, {});
check("soup has a Change button", can.has(soup.id));
check("protein has a Change button", can.has(protein.id));
const seen = new Set<string>();
let idea = oatPlate;
let change: { soup?: string; protein?: string } = {};
for (let i = 0; i < 40; i++) {
  const next = oatNextChoice(idea, idea.foods[1].id, {});
  if (!next) break;
  change = { ...change, soup: next };
  idea = oatPlateWith(oatPlate, change, {});
  seen.add(next);
  const v = scoreMeal(idea.foods.map((f) => ({ food: f, portion: "normal" as const }))).verdict;
  check(`oat swallow with ${next} is green`, v === "green", v);
  check("still an oat plate", isOatPlate(idea));
  check("keeps its plate index", idea.index === oatPlate.index);
}
check("many soups to choose from", seen.size >= 10, seen.size);
const both = oatPlateWith(oatPlate, { soup: seen.values().next().value, protein: oatNextChoice(oatPlate, protein.id, {})! }, {});
check("soup AND protein can both change", both.foods[1].id !== soup.id && both.foods[2].id !== protein.id);
check("a changed plate can keep changing", swappableFoods("lunch", both, {}).size === 2);
check("oatPlateIds matches the plate", oatPlateIds(oatPlate.foods.map((f) => f.id), both.changed!).join() === both.foods.map((f) => f.id).join());
const sized = oatPlateWith(oatPlate, { protein: "fish" }, { calorieTargetForMeal: 1200 });
check("a changed plate is sized for the target", mealIdeaCalories(sized) > mealIdeaCalories(oatPlateWith(oatPlate, { protein: "fish" }, {})));

// 4b. The card says what is served: one number, never a range.
{
  const oatFood = oatPlate.foods[0];
  check("ordinary target reads 3 a week", plainFrequency(withOatFrequency(oatFood, false)) === "About 3 times a week", plainFrequency(oatFood));
  check("high target reads once a day", plainFrequency(withOatFrequency(oatFood, true)) === "About 1 time a day");
  check("no other food changes", withOatFrequency(protein, true) === protein);
  const items = oatPlate.foods.map((f) => ({ food: withOatFrequency(f, true), portion: "normal" as const }));
  check("the whole plate says once a day", /about 1 time a day/.test(mealFrequency(items)?.text ?? ""), mealFrequency(items)?.text);
}

// 5. Health rules hold while changing.
for (const conditions of [["hypertension"], ["kidney_disease"]] as never[][]) {
  let cur = oatPlateWith(oatPlate, { protein: "fish" }, { conditions });
  for (let i = 0; i < 15; i++) {
    const next = oatNextChoice(cur, cur.foods[2].id, { conditions });
    if (!next) break;
    check(`${conditions[0]}: never offers ${next}`, !["shaki", "stockfish", "smoked-fish"].includes(next), next);
    cur = oatPlateWith(oatPlate, { protein: next }, { conditions });
  }
}
{
  const n = oatNextChoice(oatPlate, soup.id, { rules: { avoid: [oatNextChoice(oatPlate, soup.id, {})!], prefer: [] } });
  check("a dietitian's left-out food is skipped", n !== oatNextChoice(oatPlate, soup.id, {}));
}

// 6. The week, not the day: limits build up, so walk 10 days in a row. Targets up
// to 2,399kcal must land within 10% on at least 97% of days, and oat swallow is
// never on two cards in a day, and nuts never pass the daily cap.
{
  const MEALS = ["breakfast", "lunch", "dinner"] as NamedMeal[];
  let n = 0, near = 0, twice = 0, overNuts = 0;
  for (const sex of ["male", "female"] as const)
    for (const a of [30, 55, 75])
      for (const h of [155, 170, 185])
        for (const bmiV of [19, 24, 29, 36])
          for (const act of ["sedentary", "moderate", "extra_active"] as const)
            for (const g of [["maintain"], ["lose_weight"]] as Goal[][]) {
              const w = Math.round(bmiV * (h / 100) ** 2);
              const target = clinicalTarget(sex, w, h, a, act, g).target;
              if (target >= 2400) continue;
              const pk = [sex, a, w, h, act, g.join("+"), ""].join("|");
              const bias = biasVector({ goals: g, activityLevel: act, conditions: [] });
              const week: string[][] = [];
              for (const day of days.slice(0, 10)) {
                const wc = new Map<string, number>();
                for (const x of week.slice(-7)) for (const id of x) wc.set(id, (wc.get(id) ?? 0) + 1);
                let eaten = 0;
                const used = new Map<string, number>();
                const today: string[] = [];
                for (const meal of MEALS) {
                  const share = mealShareFor(target, eaten, MEALS, meal, []);
                  const idea = planForDay(meal, day, new Map(), 0, [], new Map(), bias, share, [], pk, wc, [], null, { skip: today.includes(OAT_SWALLOW), highNeed: target >= OAT_HIGH_NEED_TARGET });
                  today.push(...idea.foods.map((f) => f.id));
                  const plate = mealIdeaCalories(idea);
                  const nut = idea.foods.find((f) => NUT_GROUP.has(f.id));
                  if (nut) used.set(nut.id, (used.get(nut.id) ?? 0) + (idea.scaledSide?.food.id === nut.id ? idea.scaledSide.grams : 30));
                  const gap = Math.max(0, share - plate);
                  const ex = suggestExtras(gap, day, meal, [], pk, new Map(), undefined, undefined, used);
                  const sn = suggestSnack(meal, gap, ex, day, [], pk, new Map(), used);
                  eaten += plate;
                  for (const set of [ex, sn]) {
                    const pick = set?.variants[0];
                    for (const o of pick?.items ?? []) used.set(o.food.id, (used.get(o.food.id) ?? 0) + o.grams);
                    eaten += pick?.totalCalories ?? 0;
                  }
                }
                week.push(today);
                n++;
                if (Math.abs(eaten - target) <= target * 0.1) near++;
                if (today.filter((id) => id === OAT_SWALLOW).length > 1) twice++;
                let nuts = 0;
                for (const [id, gr] of used) if (NUT_GROUP.has(id)) nuts += gr;
                if (nuts > NUT_DAILY_MAX_G + 0.5) overNuts++;
              }
            }
  check("oat swallow never on two cards in a day", twice === 0, twice);
  check("nuts never pass the daily cap", overNuts === 0, overNuts);
  check(`targets under 2,400kcal land within 10% on 97% of days (${near}/${n})`, near / n >= 0.97, near / n);
}

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
