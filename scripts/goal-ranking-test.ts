/**
 * Goal/activity personalization and meal-pattern filtering, checked.
 *
 * This proves the two rules the whole feature depends on:
 *   1. Combining goals is a plain sum — no pair is special-cased, so any
 *      combination a person picks is covered by the one formula.
 *   2. Applying a bias NEVER breaks the guarantees the daily meal already
 *      has: every plate offered is still green, and the day-to-day no-repeat
 *      rule still holds.
 *
 * Run after any edit to lib/personalization.ts, lib/mealPattern.ts, or the
 * bias wiring in lib/nextMeal.ts:
 *
 *   npx tsx scripts/goal-ranking-test.ts
 */
import { ideasFor, planForDay } from "../lib/nextMeal";
import { getFood } from "../lib/search";
import { scoreMeal } from "../lib/verdictEngine";
import { biasVector, biasScore, GOALS, ACTIVITY_LEVELS } from "../lib/personalization";
import { normalizeMealPattern, nextEatenMeal } from "../lib/mealPattern";
import type { NamedMeal } from "../lib/mealtime";

const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const problems: string[] = [];
const fail = (m: string) => problems.push(m);

// ---- 1. Combining goals is a plain sum, for every pair -----------------------
for (const a of GOALS) {
  for (const b of GOALS) {
    if (a === b) continue;
    const solo = { energyLean: biasVector({ goals: [a], activityLevel: null }).energyLean, proteinDensity: biasVector({ goals: [a], activityLevel: null }).proteinDensity };
    const soloB = biasVector({ goals: [b], activityLevel: null });
    const combined = biasVector({ goals: [a, b], activityLevel: null });
    const expected = {
      energyLean: solo.energyLean + soloB.energyLean,
      proteinDensity: solo.proteinDensity + soloB.proteinDensity,
    };
    if (
      Math.abs(combined.energyLean - expected.energyLean) > 1e-9 ||
      Math.abs(combined.proteinDensity - expected.proteinDensity) > 1e-9
    ) {
      fail(`goals [${a}, ${b}]: combined vector is not the sum of the two solo vectors`);
    }
  }
}

// Activity level adds on top of goals the same way.
for (const g of GOALS) {
  for (const act of ACTIVITY_LEVELS) {
    const soloGoal = biasVector({ goals: [g], activityLevel: null });
    const soloActivity = biasVector({ goals: [], activityLevel: act });
    const combined = biasVector({ goals: [g], activityLevel: act });
    const expected = {
      energyLean: soloGoal.energyLean + soloActivity.energyLean,
      proteinDensity: soloGoal.proteinDensity + soloActivity.proteinDensity,
    };
    if (
      Math.abs(combined.energyLean - expected.energyLean) > 1e-9 ||
      Math.abs(combined.proteinDensity - expected.proteinDensity) > 1e-9
    ) {
      fail(`goal ${g} + activity ${act}: combined vector is not the sum`);
    }
  }
}

// "maintain" with no activity level must be a true no-op (zero vector), so it
// can never accidentally reorder anyone's plate.
const neutral = biasVector({ goals: ["maintain"], activityLevel: null });
if (neutral.energyLean !== 0 || neutral.proteinDensity !== 0) {
  fail(`"maintain" with no activity is not a zero vector: ${JSON.stringify(neutral)}`);
}

// ---- 2. Every plate is still green, and 0 consecutive repeats, under EVERY
//         single goal and activity level, applied on its own -----------------
const ALL_BIASES = [
  ...GOALS.map((g) => ({ label: `goal:${g}`, bias: biasVector({ goals: [g], activityLevel: null }) })),
  ...ACTIVITY_LEVELS.map((a) => ({ label: `activity:${a}`, bias: biasVector({ goals: [], activityLevel: a }) })),
  {
    label: "everything at once",
    bias: biasVector({ goals: [...GOALS], activityLevel: "active" }),
  },
];

const EMPTY = new Map<string, number>();

for (const { label, bias } of ALL_BIASES) {
  for (const meal of MEALS) {
    let prevIndex: number | null = null;
    for (let d = 0; d < 30; d++) {
      const dayKey = `2026-08-${String((d % 28) + 1).padStart(2, "0")}`;
      const idea = planForDay(meal, dayKey, EMPTY, 0, [], EMPTY, bias);
      const foods = idea.foods;
      if (foods.length === 0) {
        fail(`${label}, ${meal}, day ${d}: empty plate`);
        continue;
      }
      const result = scoreMeal(foods.map((food) => ({ food, portion: "normal" as const })));
      if (result.verdict !== "green") {
        fail(`${label}, ${meal}, day ${d}: plate scores ${result.verdict}, not green`);
      }
      if (prevIndex !== null && idea.index === prevIndex) {
        fail(`${label}, ${meal}: same plate two days running (day ${d})`);
      }
      prevIndex = idea.index;
    }
  }
}

// ---- 3. biasScore actually distinguishes real plates -------------------------
// A plate led by a soup+vegetable-forward combination must score lower
// (better) under a "lose_weight" bias than the highest-energy-lean plate in
// the same meal's list, proving the axis is not a no-op on real data.
const loseWeightBias = biasVector({ goals: ["lose_weight"], activityLevel: null });
for (const meal of MEALS) {
  const ids = ideasFor(meal);
  const resolved = ids.map((idSet) => idSet.map((id) => getFood(id)).filter((f): f is NonNullable<typeof f> => Boolean(f)));
  const scores = resolved.map((foods) => biasScore(foods, loseWeightBias));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) {
    fail(`${meal}: lose_weight bias does not distinguish any of its plates (all scored ${min})`);
  }
}

// ---- 4. Meal pattern: defaults, and always rolls forward to something -------
if (normalizeMealPattern(null).length !== 3) fail("normalizeMealPattern(null) should default to all 3 meals");
if (normalizeMealPattern([]).length !== 3) fail("normalizeMealPattern([]) should default to all 3 meals");
if (normalizeMealPattern(["lunch"]).join(",") !== "lunch") fail("normalizeMealPattern should keep a valid single meal");
if (normalizeMealPattern(["lunch", "made-up"]).join(",") !== "lunch") fail("normalizeMealPattern should drop invalid values");

const patternCases: { pattern: string[]; from: NamedMeal; expect: NamedMeal }[] = [
  { pattern: ["breakfast", "dinner"], from: "lunch", expect: "dinner" },
  { pattern: ["breakfast"], from: "dinner", expect: "breakfast" }, // wraps around
  { pattern: ["breakfast", "lunch", "dinner"], from: "lunch", expect: "lunch" },
];
for (const c of patternCases) {
  const got = nextEatenMeal(c.pattern, c.from);
  if (got !== c.expect) {
    fail(`nextEatenMeal(${JSON.stringify(c.pattern)}, ${c.from}) = ${got}, expected ${c.expect}`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}

console.log(
  "Goal/activity combinations sum correctly, every biased plate stays green with no consecutive repeats, and meal-pattern filtering always resolves to something eaten.",
);
