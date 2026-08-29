/**
 * Calorie-target-aware meal selection, checked.
 *
 * A real bug this guards against: a person with a 2,996kcal/day target was
 * shown a 312kcal breakfast, 433kcal lunch, and 300kcal dinner — barely a
 * third of their target — because the calorie bias in planForDay used to be
 * a small addend to the sort score, and the day-stride that actually decides
 * which plate is shown walks every position in the list regardless of score,
 * so the "closest match" was barely more likely to be picked than a distant
 * one. Fixed by narrowing the ROTATION POOL itself to the closest-matching
 * plates before the stride runs. This proves the fix, and that every
 * existing guarantee (green-only, no-repeat) still holds with it active.
 *
 * Run after any edit to lib/nextMeal.ts's calorie-target logic:
 *
 *   npx tsx scripts/calorie-ranking-test.ts
 */
import { ideasFor, planForDay, suggestExtras } from "../lib/nextMeal";
import { getFood } from "../lib/search";
import { scoreMeal } from "../lib/verdictEngine";
import type { NamedMeal } from "../lib/mealtime";

const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const problems: string[] = [];
const fail = (m: string) => problems.push(m);

function planCalories(meal: NamedMeal, index: number): number {
  return ideasFor(meal)[index].reduce((s, id) => s + (getFood(id)?.calories ?? 0), 0);
}

function bestAchievable(meal: NamedMeal, target: number): number {
  const cals = ideasFor(meal).map((ids) => ids.reduce((s, id) => s + (getFood(id)?.calories ?? 0), 0));
  return Math.min(...cals.map((c) => Math.abs(c - target)));
}

// ---- 1. The exact reported scenario: a big/active person's daily target
//         (2,996kcal) split evenly across 3 meals (~999kcal each). The three
//         meals actually served must land close to the best each meal's
//         plate list can do — not far below it the way 312/433/300 was. ----
const DAILY_TARGET = 2996;
const PER_MEAL_TARGET = Math.round(DAILY_TARGET / 3);
for (const meal of MEALS) {
  const idea = planForDay(meal, "2026-08-29", new Map(), 0, [], new Map(), null, PER_MEAL_TARGET);
  const cal = planCalories(meal, idea.index);
  const best = bestAchievable(meal, PER_MEAL_TARGET);
  const gotDiff = Math.abs(cal - PER_MEAL_TARGET);
  // Generous tolerance (the MIN_POOL floor keeps some variety, so this will
  // not always be the single closest plate) — but it must not be wildly off
  // the way the bug allowed.
  if (gotDiff > best + 120) {
    fail(
      `${meal}: target ${PER_MEAL_TARGET}kcal, got ${cal}kcal (off by ${gotDiff}), but the best available plate is only off by ${best} — the target is not meaningfully influencing the pick`,
    );
  }
}

// ---- 2. When the target is comfortably WITHIN the achievable range, the
//         served plate must be a real, close match — not just "less far off
//         than before." ------------------------------------------------------
for (const meal of MEALS) {
  const cals = ideasFor(meal).map((_, i) => planCalories(meal, i));
  const midTarget = Math.round((Math.min(...cals) + Math.max(...cals)) / 2);
  const idea = planForDay(meal, "2026-08-29", new Map(), 0, [], new Map(), null, midTarget);
  const cal = planCalories(meal, idea.index);
  const spread = Math.max(...cals) - Math.min(...cals);
  if (Math.abs(cal - midTarget) > spread * 0.35) {
    fail(
      `${meal}: an achievable target (${midTarget}kcal, mid-range) got ${cal}kcal — too far off for a target well within reach`,
    );
  }
}

// ---- 3. Every existing guarantee still holds WITH a calorie target active:
//         every plate offered is green, and no two days running repeat. -----
for (const meal of MEALS) {
  let prevIndex: number | null = null;
  for (let d = 0; d < 30; d++) {
    const dayKey = `2026-08-${String((d % 28) + 1).padStart(2, "0")}`;
    const idea = planForDay(meal, dayKey, new Map(), 0, [], new Map(), null, PER_MEAL_TARGET);
    if (idea.foods.length === 0) {
      fail(`${meal}, day ${d}: empty plate with a calorie target active`);
      continue;
    }
    const result = scoreMeal(idea.foods.map((food) => ({ food, portion: "normal" as const })));
    if (result.verdict !== "green") {
      fail(`${meal}, day ${d}: plate scores ${result.verdict} with a calorie target active`);
    }
    if (prevIndex !== null && idea.index === prevIndex) {
      fail(`${meal}: same plate two days running with a calorie target active (day ${d})`);
    }
    prevIndex = idea.index;
  }
}

// ---- 4. A target of 0 or null must reproduce the no-target behaviour
//         exactly (the calorie logic must never activate unintentionally). --
for (const meal of MEALS) {
  const withNull = planForDay(meal, "2026-08-29", new Map(), 0, [], new Map(), null, null);
  const withZero = planForDay(meal, "2026-08-29", new Map(), 0, [], new Map(), null, 0);
  const noTarget = planForDay(meal, "2026-08-29", new Map(), 0, [], new Map(), null);
  if (withNull.index !== noTarget.index || withZero.index !== noTarget.index) {
    fail(`${meal}: a null/zero calorie target changed the pick`);
  }
}

// ---- 5. suggestExtras: closes real gaps sensibly, never invents nonsense --
{
  // Below the threshold: nothing suggested, not even a token gesture.
  if (suggestExtras(50, "2026-08-29") !== null) {
    fail("suggestExtras(50, ...) should return null below the 100kcal threshold");
  }
  if (suggestExtras(0, "2026-08-29") !== null) fail("suggestExtras(0, ...) should return null");

  // A real gap: must suggest something, never more than 3 items, and never
  // wildly overshoot (it should stop once it reaches the gap or hits 3).
  const s = suggestExtras(500, "2026-08-29");
  if (!s || s.foods.length === 0) {
    fail("suggestExtras(500, ...) should suggest at least one food");
  } else {
    if (s.foods.length > 3) fail(`suggestExtras: ${s.foods.length} items, should never exceed 3`);
    if (s.names.length !== s.foods.length) fail("suggestExtras: names/foods length mismatch");
  }

  // A huge gap (the reported scenario's residual) must still return at most
  // 3 items — it must not pretend to close an unclosable gap by inventing
  // more food than the capped list allows.
  const huge = suggestExtras(5000, "2026-08-29");
  if (!huge || huge.foods.length > 3) {
    fail("suggestExtras with a huge remaining gap must still cap at 3 items, not invent more");
  }

  // Rotates by day, so it is not always the same suggestion.
  const days = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"];
  const firstNames = days.map((d) => suggestExtras(300, d)?.names.join(","));
  if (new Set(firstNames).size === 1) {
    fail("suggestExtras never varies across 5 different days — the rotation is not working");
  }

  // Every suggested food must actually be green (this only ever recommends
  // already-reviewed, everyday-safe foods, never anything the app itself
  // would flag).
  const check = suggestExtras(800, "2026-08-29");
  if (check) {
    for (const f of check.foods) {
      if (f.baseVerdict !== "green") fail(`suggestExtras included a non-green food: ${f.id}`);
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}

console.log(
  "Calorie-target selection lands close to what each meal's plate list can actually achieve, stays green, keeps the no-repeat guarantee, and suggestExtras closes real gaps sensibly.",
);
