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
import {
  ideasFor,
  planForDay,
  suggestExtras,
  extraTimingFor,
  MEAL_MAX_CALORIES,
  MAX_EXTRA_ITEMS,
} from "../lib/nextMeal";
import { getFood } from "../lib/search";
import { scoreMeal } from "../lib/verdictEngine";
import type { NamedMeal } from "../lib/mealtime";
import { calorieTarget, remainingMealCalorieTarget } from "../lib/tdee";

// Must match lib/useTodaysCalories.ts's DAY_END_FLOOR — the small residual
// the real app floors to a displayed 0 once dinner is under way.
const DAY_END_FLOOR = 200;

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

// ---- 5. suggestExtras: sizes a real LIST of items to close the gap it is
//         given (not 3 alternatives to pick one of), never invents a bigger
//         single serving, and is bounded only by the MAX_EXTRA_ITEMS sanity
//         guard, never by a calorie ceiling. --------------------------------
{
  // Below the threshold: nothing suggested, not even a token gesture.
  if (suggestExtras(50, "2026-08-29", "breakfast") !== null) {
    fail("suggestExtras(50, ...) should return null below the 100kcal threshold");
  }
  if (suggestExtras(0, "2026-08-29", "lunch") !== null) fail("suggestExtras(0, ...) should return null");

  for (const meal of MEALS) {
    // A real, modest gap: must suggest at least one item, each item never
    // more than 2 foods, and the list's total should land close to the gap
    // (never wildly over — the loop stops once it's within one item of it).
    const s = suggestExtras(500, "2026-08-29", meal);
    if (!s || s.items.length === 0) {
      fail(`suggestExtras(500, ..., ${meal}) should suggest at least one item`);
    } else {
      for (const o of s.items) {
        if (o.foods.length > 2) fail(`suggestExtras: ${meal} item has ${o.foods.length} foods, should never exceed 2`);
        if (o.names.length !== o.foods.length) fail(`suggestExtras: ${meal} names/foods length mismatch`);
      }
      if (s.totalCalories !== s.items.reduce((sum, o) => sum + o.calories, 0)) {
        fail(`suggestExtras: ${meal} totalCalories does not match the sum of its items`);
      }
      const maxItemCal = Math.max(...s.items.map((o) => o.calories));
      if (s.totalCalories < 500 - maxItemCal) {
        fail(`suggestExtras(500, ..., ${meal}) undershoots by more than one item's worth (total ${s.totalCalories})`);
      }
    }

    // A huge gap must still cap each individual item's size (never invent a
    // bigger single serving), but is now allowed to use MANY items — the
    // sanity guard (MAX_EXTRA_ITEMS), never a calorie ceiling, is what
    // eventually bounds the list. A big enough gap should actually hit that
    // guard, proving the list really does grow to meet a big number rather
    // than silently stopping short.
    const huge = suggestExtras(100000, "2026-08-29", meal);
    if (!huge) {
      fail(`suggestExtras with a huge remaining gap (${meal}) should still suggest something`);
    } else {
      if (huge.items.some((o) => o.foods.length > 2)) {
        fail(`suggestExtras with a huge remaining gap (${meal}) must still cap each item at 2 foods, not invent more`);
      }
      if (huge.items.length !== MAX_EXTRA_ITEMS) {
        fail(`suggestExtras with a huge remaining gap (${meal}) should hit the MAX_EXTRA_ITEMS guard (${MAX_EXTRA_ITEMS}), got ${huge.items.length} items`);
      }
    }

    // Every suggested food must actually be green (this only ever recommends
    // already-reviewed, everyday-safe foods), and every one must carry a
    // WHEN-to-eat direction — a food with a calorie count and no timing reads
    // exactly like the confusing, direction-less list this card replaced.
    for (let d = 0; d < 20; d++) {
      const dayKey = `2026-08-${String((d % 28) + 1).padStart(2, "0")}`;
      const check = suggestExtras(800, dayKey, meal);
      if (check) {
        for (const o of check.items) {
          for (const f of o.foods) {
            if (f.baseVerdict !== "green") fail(`suggestExtras included a non-green food: ${f.id}`);
            if (!extraTimingFor(f.id, meal)) fail(`suggestExtras included ${f.id} with no timing direction`);
          }
        }
      }
    }
  }

  // Rotates by day, so a returning person does not always see the same
  // combination first.
  const days = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"];
  const firstNames = days.map((d) => suggestExtras(300, d, "lunch")?.items[0]?.names.join(","));
  if (new Set(firstNames).size === 1) {
    fail("suggestExtras never varies across 5 different days — the rotation is not working");
  }

  // A food offered as an "extra" must never also appear in that food's own
  // meal-idea plates (a food is either "your meal" or "an extra", never
  // both), and the reverse: no blue-card food should be reused as an extra.
  const blueCardIds = new Set(MEALS.flatMap((m) => ideasFor(m)).flat());
  for (const meal of MEALS) {
    const s = suggestExtras(9999, "2026-08-29", meal);
    if (s) {
      for (const o of s.items) {
        for (const f of o.foods) {
          if (blueCardIds.has(f.id)) {
            fail(`suggestExtras: ${f.id} is offered as an extra but also appears in a meal-idea plate`);
          }
        }
      }
    }
  }
}

// ---- 6. MEAL_MAX_CALORIES matches the real plate data, calorieTarget() is
//         NEVER capped, and a full-day walk-through (main plate + a
//         meal-scoped suggestExtras list at each meal, same as the real app)
//         must end with a small, floorable residual — for realistic targets
//         AND for a deliberately extreme one, proving the day's 3
//         recommended meals really do add up to whatever the target is,
//         "no matter the value" (founder instruction, 2026-08-31). ----------
{
  const realMax = (meal: NamedMeal) =>
    Math.max(...ideasFor(meal).map((ids) => ids.reduce((s, id) => s + (getFood(id)?.calories ?? 0), 0)));
  for (const meal of MEALS) {
    if (MEAL_MAX_CALORIES[meal] !== realMax(meal)) {
      fail(`MEAL_MAX_CALORIES.${meal} (${MEAL_MAX_CALORIES[meal]}) does not match the real plate data (${realMax(meal)})`);
    }
  }

  // calorieTarget() must never clamp — a high-TDEE build_muscle raw value
  // passes straight through (only the 1,200kcal safety floor still applies,
  // and build_muscle's own documented +250kcal adjustment, lib/tdee.ts).
  const rawTdeeTarget = calorieTarget(3430, ["build_muscle"]);
  if (rawTdeeTarget !== 3680) {
    fail(`calorieTarget() must never cap the target — 3,430 + 250 in, got ${rawTdeeTarget} out`);
  }

  function walkFullDay(dailyTarget: number): number {
    let eatenToday = 0;
    for (const meal of MEALS) {
      const mealShare = remainingMealCalorieTarget(dailyTarget, eatenToday, MEALS, meal, MEAL_MAX_CALORIES);
      const idea = planForDay(meal, "2026-08-29", new Map(), 0, [], new Map(), null, mealShare);
      eatenToday += planCalories(meal, idea.index);
      // Same scoping the real app uses (lib/useTodaysCalories.ts): the
      // extras gap is THIS meal's own fair share minus its real plate
      // ceiling, not the whole day's remaining — so a big target's extra
      // eating is spread across all 3 meals, not front-loaded into one.
      const extrasGap = Math.max(0, mealShare - (MEAL_MAX_CALORIES[meal] ?? 0));
      const extra = suggestExtras(extrasGap, "2026-08-29", meal);
      if (extra) eatenToday += extra.totalCalories;
    }
    return dailyTarget - eatenToday;
  }

  // Every target the founder named explicitly (2,900 / 3,200), the exact
  // reported bug's raw TDEE (3,430), and a deliberately extreme one (6,000 —
  // well past any real person's TDEE) must all close to within the real
  // app's DAY_END_FLOOR. This is the literal proof of "no matter the value."
  for (const dailyTarget of [2900, 3200, 3430, 6000]) {
    const residual = walkFullDay(dailyTarget);
    if (residual > DAY_END_FLOOR) {
      fail(
        `full-day walk-through for a ${dailyTarget}kcal target (breakfast+lunch+dinner, each plate + its meal-scoped extras) left ${residual}kcal unclosed — should be within the ${DAY_END_FLOOR}kcal end-of-day floor`,
      );
    }
  }

  // A target so far beyond MAX_EXTRA_ITEMS × every meal's own extras that it
  // genuinely cannot close within one day is the ONLY case where a residual
  // is expected — and it must still come from the MAX_EXTRA_ITEMS sanity
  // guard, never from a calorie ceiling on the target itself.
  const impossible = walkFullDay(50000);
  if (impossible <= DAY_END_FLOOR) {
    fail("a 50,000kcal target closed within the end-of-day floor — the MAX_EXTRA_ITEMS guard may not be wired correctly");
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
