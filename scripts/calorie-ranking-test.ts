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

// ---- 5. suggestExtras: builds 2 real, independently-complete VARIANTS
//         (not 3, and never a cosmetic reorder), each sized EXACTLY to the
//         gap it is given via continuous safe-range scaling, and NEVER
//         repeating a food within one variant. -----------------------------
{
  // Below the threshold: nothing suggested, not even a token gesture.
  if (suggestExtras(50, "2026-08-29", "breakfast") !== null) {
    fail("suggestExtras(50, ...) should return null below the 100kcal threshold");
  }
  if (suggestExtras(0, "2026-08-29", "lunch") !== null) fail("suggestExtras(0, ...) should return null");
  if (MAX_EXTRA_ITEMS !== 2) fail("MAX_EXTRA_ITEMS should be a hard cap of 2 distinct foods per variant, not " + MAX_EXTRA_ITEMS);

  for (const meal of MEALS) {
    // A real, modest gap: exactly 2 variants (the pools are all >= 2 foods),
    // each with at least one item, no food repeated within a variant, and
    // each variant's total should land very close to the gap (continuous
    // scaling, not a fixed preset).
    const s = suggestExtras(500, "2026-08-29", meal);
    if (!s || s.variants.length === 0) {
      fail(`suggestExtras(500, ..., ${meal}) should suggest at least one variant`);
    } else {
      if (s.variants.length !== 2) {
        fail(`suggestExtras: ${meal} offered ${s.variants.length} variants, should be 2`);
      }
      for (const variant of s.variants) {
        if (variant.items.length === 0) fail(`suggestExtras: ${meal} variant should suggest at least one item`);
        if (variant.items.length > MAX_EXTRA_ITEMS) {
          fail(`suggestExtras: ${meal} variant has ${variant.items.length} items, must never exceed the ${MAX_EXTRA_ITEMS}-item cap (direct instruction: 1-2 snacks, never 3)`);
        }
        const ids = variant.items.map((o) => o.food.id);
        if (new Set(ids).size !== ids.length) {
          fail(`suggestExtras: ${meal} variant repeats a food within itself (${ids.join(", ")})`);
        }
        for (const o of variant.items) {
          if (o.units <= 0 || !Number.isInteger(o.units)) fail(`suggestExtras: ${meal} item has a non-whole unit count (${o.units})`);
          if (o.grams <= 0) fail(`suggestExtras: ${meal} item has non-positive grams`);
          if (!o.instruction || /×\s*\d/.test(o.instruction) || /\btimes today\b/.test(o.instruction)) {
            fail(`suggestExtras: ${meal} item's instruction still reads like a repeat-serving ("${o.instruction}")`);
          }
        }
        if (variant.totalCalories !== variant.items.reduce((sum, o) => sum + o.calories, 0)) {
          fail(`suggestExtras: ${meal} variant totalCalories does not match the sum of its items`);
        }
        // Continuous scaling should land very close to a moderate, easily
        // achievable gap — much tighter than the old fixed-preset design.
        if (Math.abs(variant.totalCalories - 500) > 60) {
          fail(`suggestExtras(500, ..., ${meal}) landed at ${variant.totalCalories}kcal, too far from the 500kcal gap`);
        }
      }
    }

    // A huge gap must still cap the TOTAL at the pool's own safe ceiling
    // (never invent a bigger single serving, never repeat a food) — asking
    // for more and more should stop making a difference once every distinct
    // food in the pool is already at its own safe maximum.
    const huge1 = suggestExtras(100000, "2026-08-29", meal);
    const huge2 = suggestExtras(200000, "2026-08-29", meal);
    if (!huge1 || !huge2) {
      fail(`suggestExtras with a huge remaining gap (${meal}) should still suggest something`);
    } else {
      for (const variant of [...huge1.variants, ...huge2.variants]) {
        const ids = variant.items.map((o) => o.food.id);
        if (new Set(ids).size !== ids.length) fail(`suggestExtras with a huge gap (${meal}) repeated a food`);
        if (variant.items.length > MAX_EXTRA_ITEMS) {
          fail(`suggestExtras with a huge gap (${meal}) has ${variant.items.length} items, must never exceed the ${MAX_EXTRA_ITEMS}-item cap`);
        }
      }
      // Doubling an already-huge gap must not change the total: the pool's
      // safe ceiling has already been hit, proving this is a real safety
      // bound, not a number that keeps growing with the target.
      for (let v = 0; v < huge1.variants.length; v++) {
        if (huge1.variants[v].totalCalories !== huge2.variants[v].totalCalories) {
          fail(`suggestExtras: ${meal} variant ${v} kept growing past a huge gap — should hit a fixed safe ceiling`);
        }
      }
      // Even under a huge gap, the 2 variants must use DIFFERENT foods, not
      // just reorder the same set — this is the exact bug reported live
      // ("Try a different snack" only reshuffled position). Meaningful only
      // when the meal's real candidate pool holds more foods than the
      // 2-item cap (breakfast/lunch: 3, dinner: 5 — see
      // lib/nextMeal.ts's EXTRA_CANDIDATES); with exactly 2 candidates,
      // both windows are forced to use the same pair.
      const POOL_SIZE: Record<NamedMeal, number> = { breakfast: 3, lunch: 3, dinner: 5 };
      if (huge1.variants.length === 2 && POOL_SIZE[meal] > MAX_EXTRA_ITEMS) {
        const [a, b] = huge1.variants;
        const idsA = new Set(a.items.map((o) => o.food.id));
        const idsB = new Set(b.items.map((o) => o.food.id));
        const sameSet = idsA.size === idsB.size && [...idsA].every((id) => idsB.has(id));
        if (sameSet) {
          fail(
            `suggestExtras: ${meal}'s 2 variants use the SAME foods under a huge gap (${[...idsA].join(", ")}) — "Try a different snack" would show no real change`,
          );
        }
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
        for (const variant of check.variants) {
          for (const o of variant.items) {
            if (o.food.baseVerdict !== "green") fail(`suggestExtras included a non-green food: ${o.food.id}`);
            if (!extraTimingFor(o.food.id, meal)) fail(`suggestExtras included ${o.food.id} with no timing direction`);
          }
        }
      }
    }
  }

  // Which pair leads rotates by day, so a returning person does not always
  // see the same one first.
  const days = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"];
  const firstIds = days.map((d) => suggestExtras(300, d, "lunch")?.variants[0]?.items[0]?.food.id);
  if (new Set(firstIds).size === 1) {
    fail("suggestExtras never varies which variant is first across 5 different days — the rotation is not working");
  }

  // The 2 variants for the same call must actually differ from each other —
  // that is the whole point of "Try a different snack" doing something. A
  // moderate gap (easily closed by one food alone) is the case that matters
  // most, since a huge gap can legitimately converge once every food in the
  // pool is required.
  const twoVariants = suggestExtras(300, "2026-08-29", "breakfast");
  if (twoVariants) {
    const compositions = twoVariants.variants.map((v) =>
      v.items.map((o) => `${o.food.id}:${o.units}`).sort().join(","),
    );
    if (new Set(compositions).size < Math.min(2, twoVariants.variants.length)) {
      fail("suggestExtras: breakfast's 2 variants are not meaningfully different from each other");
    }
  }

  // A food offered as an "extra" must never also appear in a meal-idea
  // plate (a food is either "your meal" or "an extra", never both) — this
  // is now enforced at RUNTIME inside suggestExtras (EXCLUDED_FROM_EXTRAS),
  // not only by this test, but the test still proves it holds.
  const blueCardIds = new Set(MEALS.flatMap((m) => ideasFor(m)).flat());
  for (const meal of MEALS) {
    const s = suggestExtras(9999, "2026-08-29", meal);
    if (s) {
      for (const variant of s.variants) {
        for (const o of variant.items) {
          if (blueCardIds.has(o.food.id)) {
            fail(`suggestExtras: ${o.food.id} is offered as an extra but also appears in a meal-idea plate`);
          }
        }
      }
    }
  }
}

// ---- 6. MEAL_MAX_CALORIES matches the real plate data, calorieTarget() is
//         NEVER capped, and a full-day walk-through (main plate + a
//         meal-scoped suggestExtras variant at each meal, same as the real
//         app) must end with a VERY small residual for realistic targets —
//         continuous safe-range scaling should land almost exactly on the
//         number, not just "within the old sanity-guard floor." A
//         genuinely extreme target is expected to fall short: the app will
//         never recommend an unsafe quantity of snack food just to hit a
//         number, so the real ceiling is safe food, not an arbitrary cap on
//         the target itself. ------------------------------------------------
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

  // The real, safety-bounded ceiling suggestExtras can ever offer for one
  // meal — read from the actual code (an enormous gap saturates every
  // candidate at its own researched safe maximum, see docs/EVIDENCE.md §9),
  // never hardcoded, so this can never silently drift from lib/nextMeal.ts.
  function extrasCeiling(meal: NamedMeal, dayKey: string): number {
    const s = suggestExtras(1_000_000, dayKey, meal);
    return s ? s.variants[0].totalCalories : 0;
  }
  for (const meal of MEALS) {
    if (extrasCeiling(meal, "2026-08-29") <= 0) {
      fail(`${meal}'s extras ceiling should be a real, positive safe amount`);
    }
  }

  // Returns the residual AND each meal's real total, so callers can check
  // both "does it close" and "is it evenly spread."
  function walkFullDay(dailyTarget: number, dayKey = "2026-08-29"): { residual: number; totals: Record<NamedMeal, number> } {
    let eatenToday = 0;
    const totals = {} as Record<NamedMeal, number>;
    for (const meal of MEALS) {
      // FLAT split, matching the real app (lib/useTodaysCalories.ts,
      // components/TodaysMeal.tsx) — no mealWeights argument. An earlier
      // version weighted this by MEAL_MAX_CALORIES, which structurally
      // under-fed breakfast; reverted by founder instruction ("I want
      // evenly split, not awkward split").
      const mealShare = remainingMealCalorieTarget(dailyTarget, eatenToday, MEALS, meal);
      const idea = planForDay(meal, dayKey, new Map(), 0, [], new Map(), null, mealShare);
      const plateCal = planCalories(meal, idea.index);
      // Same scoping the real app uses (lib/useTodaysCalories.ts): the
      // extras gap is THIS meal's own fair share minus its real plate
      // ceiling, not the whole day's remaining — so a big target's extra
      // eating is spread across all 3 meals, not front-loaded into one.
      const extrasGap = Math.max(0, mealShare - plateCal);
      const extra = suggestExtras(extrasGap, dayKey, meal);
      // A real person picks ONE variant to eat; both are built to close the
      // same gap independently, so using the first one (the default shown)
      // is representative of any real choice.
      const mealTotal = plateCal + (extra ? extra.variants[0].totalCalories : 0);
      totals[meal] = mealTotal;
      eatenToday += mealTotal;
    }
    return { residual: dailyTarget - eatenToday, totals };
  }

  // Realistic, common targets — the user's own worked example of 2,500, and
  // 2,800 / 2,900 — must close almost exactly (continuous safe-range
  // scaling comfortably covers these within the 2-item-per-meal cap).
  // Checked across several different days, since which specific real plate
  // gets served (and so each meal's exact total) varies day to day via the
  // least-eaten-first rotation.
  const TIGHT_FLOOR = 60;
  // Higher targets (3,200 / 3,430, the exact reported bug's raw TDEE) sit
  // close to what a hard 2-items-per-meal cap can safely provide, so a
  // larger, still-bounded residual is EXPECTED and correct on a
  // less-favourable day's rotation, not a bug — this is the deliberate
  // trade-off of "never more than 2 snacks" (direct instruction, 2026-09-01:
  // "1-2 extras card to meet calorie intake daily is required not 3") over
  // "always exact no matter the value." A small, honest shortfall here beats
  // a 3rd snack.
  const HIGH_FLOOR = 320;
  const days = ["2026-08-01", "2026-08-10", "2026-08-15", "2026-08-20", "2026-08-29"];
  for (const dailyTarget of [2500, 2800, 2900, 3200, 3430]) {
    const floor = dailyTarget <= 2900 ? TIGHT_FLOOR : HIGH_FLOOR;
    for (const dayKey of days) {
      const { residual, totals } = walkFullDay(dailyTarget, dayKey);
      if (residual > floor) {
        fail(
          `full-day walk-through for a ${dailyTarget}kcal target on ${dayKey} (breakfast+lunch+dinner, each plate + its meal-scoped extras) left ${residual}kcal unclosed — should close within ${floor}kcal`,
        );
      }
      // Evenly spread (founder instruction, 2026-08-31: "I want evenly
      // split, not awkward split") — no meal should land wildly far from a
      // flat third.
      const evenShare = dailyTarget / 3;
      for (const meal of MEALS) {
        const deviation = Math.abs(totals[meal] - evenShare);
        if (deviation > evenShare * 0.45) {
          fail(
            `full-day walk-through for a ${dailyTarget}kcal target on ${dayKey}: ${meal} totalled ${totals[meal]}kcal, too far from the even share of ${Math.round(evenShare)}kcal (off by ${Math.round(deviation)}) — the split should be roughly even, not lopsided`,
          );
        }
      }
    }
  }

  // A genuinely extreme target (well past what a 2-item-capped, researched
  // safe-serving pool in docs/EVIDENCE.md §9 can cover) is expected to leave
  // a real residual — and it must come from every variant sitting at its
  // own 2-item safe cap, never from the app inventing an unsafe bigger
  // serving or a 3rd item to force a match.
  const impossible = walkFullDay(50000);
  if (impossible.residual <= HIGH_FLOOR) {
    fail("a 50,000kcal target closed within the high floor — the safe-serving ceiling may not be wired correctly");
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
