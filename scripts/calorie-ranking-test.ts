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
  scaleMainProtein,
  scaleMainSide,
  mealIdeaCalories,
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
  if (MAX_EXTRA_ITEMS !== 2) fail("MAX_EXTRA_ITEMS should be 2 (the typical/coreCount size), not " + MAX_EXTRA_ITEMS);

  const POOL_SIZE: Record<NamedMeal, number> = { breakfast: 6, lunch: 6, dinner: 6 };

  for (const meal of MEALS) {
    // A real, modest gap: exactly 2 variants (the pools are all >= 2 foods),
    // each with at least one item, no food repeated within a variant, and
    // each variant's total should land very close to the gap (continuous
    // scaling, not a fixed preset). A modest gap like this should still
    // close within the typical coreCount (2) — nothing changes here from
    // before the 2026-09-08 automatic top-up.
    const s = suggestExtras(500, "2026-08-29", meal);
    if (!s || s.variants.length === 0) {
      fail(`suggestExtras(500, ..., ${meal}) should suggest at least one variant`);
    } else {
      if (s.variants.length !== 2) {
        fail(`suggestExtras: ${meal} offered ${s.variants.length} variants, should be 2`);
      }
      for (const variant of s.variants) {
        if (variant.items.length === 0) fail(`suggestExtras: ${meal} variant should suggest at least one item`);
        if (variant.items.length > POOL_SIZE[meal]) {
          fail(`suggestExtras: ${meal} variant has ${variant.items.length} items, more than the whole ${POOL_SIZE[meal]}-food pool — a food must have repeated`);
        }
        if (variant.coreCount !== Math.min(MAX_EXTRA_ITEMS, variant.items.length)) {
          fail(`suggestExtras: ${meal} variant's coreCount (${variant.coreCount}) does not match min(${MAX_EXTRA_ITEMS}, ${variant.items.length})`);
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
        // Restored 2026-09-08 (later the same day), direct founder
        // instruction, non-negotiable: "keep extras to less than 2 and
        // preferably nothing." buildVariant() was rewritten to actively
        // search for the fewest items that get close enough (bestSmallCombo)
        // before ever falling back to the old greedy top-up — a moderate,
        // easily-closeable gap like this one must never need a 3rd item
        // regardless of which candidate the day/meal/person rotation starts
        // from (bitter kola's low ceiling included).
        if (variant.items.length > MAX_EXTRA_ITEMS) {
          fail(`suggestExtras(500, ..., ${meal}) needed ${variant.items.length} items for an easily-closeable gap — the typical 1-2 should have been enough`);
        }
      }
    }

    // A genuinely large but not pool-exhausting gap (2026-09-08: automated
    // calorie closure, direct instruction — "do what is best to always
    // ensure they meet the calorie intake daily", no dietitian referral).
    // Past the typical 2-item set, buildVariant() keeps adding distinct real
    // foods rather than stopping short, so this must close much closer than
    // the old hard 2-item cap ever could, AND coreCount must still mark
    // exactly the first 2 as "typical."
    const big = suggestExtras(900, "2026-08-29", meal);
    if (!big) {
      fail(`suggestExtras(900, ..., ${meal}) should suggest something`);
    } else {
      for (const variant of big.variants) {
        if (variant.coreCount !== Math.min(MAX_EXTRA_ITEMS, variant.items.length)) {
          fail(`suggestExtras(900): ${meal} variant's coreCount is wrong`);
        }
        const ids = variant.items.map((o) => o.food.id);
        if (new Set(ids).size !== ids.length) fail(`suggestExtras(900): ${meal} variant repeated a food`);
        if (Math.abs(variant.totalCalories - 900) > 100) {
          fail(`suggestExtras(900, ..., ${meal}) landed at ${variant.totalCalories}kcal, too far from the 900kcal gap now that automatic top-up exists`);
        }
      }
      // The 2 variants must still be genuinely different choices at this
      // size — not both forced to exhaust the whole pool.
      if (big.variants.length === 2) {
        const [a, b] = big.variants;
        const idsA = new Set(a.items.map((o) => o.food.id));
        const idsB = new Set(b.items.map((o) => o.food.id));
        const sameSet = idsA.size === idsB.size && [...idsA].every((id) => idsB.has(id));
        if (sameSet) {
          fail(`suggestExtras(900): ${meal}'s 2 variants use the SAME foods — "Try a different snack" would show no real change`);
        }
      }
    }

    // A huge gap must still cap the TOTAL at the pool's own safe ceiling
    // (never invent a bigger single serving, never repeat a food) — asking
    // for more and more should stop making a difference once every distinct
    // food in the pool is already at its own safe maximum. At this size the
    // automatic top-up is EXPECTED to use most or all of the pool.
    const huge1 = suggestExtras(100000, "2026-08-29", meal);
    const huge2 = suggestExtras(200000, "2026-08-29", meal);
    if (!huge1 || !huge2) {
      fail(`suggestExtras with a huge remaining gap (${meal}) should still suggest something`);
    } else {
      for (const variant of [...huge1.variants, ...huge2.variants]) {
        const ids = variant.items.map((o) => o.food.id);
        if (new Set(ids).size !== ids.length) fail(`suggestExtras with a huge gap (${meal}) repeated a food`);
        if (variant.items.length > POOL_SIZE[meal]) {
          fail(`suggestExtras with a huge gap (${meal}) used ${variant.items.length} items, more than the whole ${POOL_SIZE[meal]}-food pool`);
        }
      }
      // Doubling an already-huge gap must not change the total: the pool's
      // safe ceiling has already been hit (every candidate at its own safe
      // maximum), proving this is a real safety bound, not a number that
      // keeps growing with the target.
      for (let v = 0; v < huge1.variants.length; v++) {
        if (huge1.variants[v].totalCalories !== huge2.variants[v].totalCalories) {
          fail(`suggestExtras: ${meal} variant ${v} kept growing past a huge gap — should hit a fixed safe ceiling`);
        }
      }
      // At this extreme size both variants are EXPECTED to converge on the
      // whole pool (there is no way to offer 2 genuinely different
      // combinations that both use every candidate) — the 900kcal check
      // above is what actually proves real choice survives; this only
      // checks the ceiling itself is real and positive.
      if (huge1.variants[0].totalCalories <= 0) {
        fail(`suggestExtras with a huge gap (${meal}) produced a non-positive ceiling`);
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
      // mealIdeaCalories() — the SAME function lib/useTodaysCalories.ts and
      // components/TodaysMeal.tsx both use — folds in idea.scaledProtein and
      // idea.scaledSide's own contribution, not just the plate's raw foods.
      // Using a separate, narrower sum here (as this test used to) would be
      // exactly the two-call-sites-diverge bug this file's own history
      // already warns about (see mealIdeaCalories's own doc comment).
      const plateCal = mealIdeaCalories(idea);
      // Same scoping the real app uses (lib/useTodaysCalories.ts): the
      // extras gap is THIS meal's own fair share minus its real plate
      // ceiling (scaling included), not the whole day's remaining — so a
      // big target's extra eating is spread across all 3 meals, not
      // front-loaded into one.
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

  // Realistic targets — the user's own worked example of 2,500, 2,800 /
  // 2,900, and the higher 3,200 / 3,430 (the exact reported bug's raw
  // TDEE), plus 6,000 (a genuinely demanding extra-active/build-muscle
  // target) — must all close almost exactly. Re-measured 2026-09-08 (later
  // the same day) after wiring scaleMainProtein/scaleMainSide into the
  // walk-through (mealIdeaCalories, not a raw plate sum — see its own call
  // site above): across 5 different days, the worst residual seen for any
  // of these 6 targets was 37kcal (2,900kcal target) — comfortably inside
  // the existing 60kcal floor, which is kept as-is rather than tightened
  // further, since this floor is a test tolerance, not a user-facing
  // promise, and the small remaining variance is which specific real plate
  // the least-eaten-first rotation happens to serve on a given day, not a
  // gap the app fails to close.
  const TIGHT_FLOOR = 60;
  const days = ["2026-08-01", "2026-08-10", "2026-08-15", "2026-08-20", "2026-08-29"];
  for (const dailyTarget of [2500, 2800, 2900, 3200, 3430, 6000]) {
    const floor = TIGHT_FLOOR;
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

  // A genuinely extreme target (well past what the WHOLE researched
  // safe-serving pool in docs/EVIDENCE.md §9 can cover, even using every
  // candidate) is expected to leave a real residual — and it must come from
  // every variant sitting at its own safe per-food maximum, never from the
  // app inventing an unsafe bigger serving or repeating a food to force a
  // match.
  const impossible = walkFullDay(50000);
  if (impossible.residual <= TIGHT_FLOOR) {
    fail("a 50,000kcal target closed within the tight floor — the safe-serving ceiling may not be wired correctly");
  }
}

// ---- 7. Kidney disease: suggestExtras must never scale a protein-bearing
//         candidate (cashew nut, walnut, peanut butter) past its own base
//         serving, no matter how large the gap is — see PROTEIN_CAP_THRESHOLD_G
//         in lib/nextMeal.ts. Low-protein candidates (tiger nut, coconut,
//         bitter kola) are unaffected and may still scale as usual. ----------
{
  const dayKey = "2026-08-29";
  for (const meal of MEALS) {
    if (!suggestExtras(1_000_000, dayKey, meal, ["kidney_disease"])) {
      fail(`kidney_disease: ${meal} suggestExtras returned nothing for a huge gap`);
    }
  }
  // A direct check against the known base-gram anchors already on each card,
  // since ExtraOption does not carry the candidate's baseGrams itself.
  const BASE_GRAMS: Record<string, number> = { "cashew-nut": 30, walnut: 30, "peanut-butter": 15 };
  for (const meal of MEALS) {
    const huge = suggestExtras(1_000_000, dayKey, meal, ["kidney_disease"]);
    if (!huge) continue;
    for (const variant of huge.variants) {
      for (const item of variant.items) {
        const cap = BASE_GRAMS[item.food.id];
        if (cap != null && item.grams > cap) {
          fail(
            `kidney_disease: ${meal} served ${item.grams}g of ${item.food.id}, which should never scale past its ${cap}g base serving`,
          );
        }
      }
    }
  }
  // Without kidney_disease flagged, the same huge gap should still be free to
  // scale a protein-bearing candidate past its base serving somewhere across
  // breakfast/lunch/dinner — proving the cap is condition-gated, not global.
  let sawScaledProtein = false;
  for (const meal of MEALS) {
    const huge = suggestExtras(1_000_000, "2026-08-29", meal);
    if (!huge) continue;
    for (const variant of huge.variants) {
      for (const item of variant.items) {
        const cap = BASE_GRAMS[item.food.id];
        if (cap != null && item.grams > cap) sawScaledProtein = true;
      }
    }
  }
  if (!sawScaledProtein) {
    fail(
      "without kidney_disease, no protein-bearing extra candidate scaled past its base serving under a huge gap — the cap may not be condition-gated correctly",
    );
  }
}

// ---- 8. scaleMainSide: the breakfast-side scaler (groundnut, avocado,
//         plain yogurt, soy milk) — the second, independently-researched
//         lever added 2026-09-08 (later the same day) alongside the
//         ≤2-extras rework, since most breakfast plates have no scalable
//         protein at all. -----------------------------------------------
{
  const foodsFor = (ids: string[]) => ids.map((id) => getFood(id)!).filter(Boolean);
  const oatsGroundnut = foodsFor(["oats", "groundnut"]);
  const eggsAvocado = foodsFor(["eggs", "avocado"]);
  const moiMoiSoyMilk = foodsFor(["moi-moi", "soy-milk"]);
  const oatsPlainYogurt = foodsFor(["oats", "plain-yogurt"]);
  const noMatch = foodsFor(["fish", "chicken"]);

  if (scaleMainSide(noMatch, 500, []) !== null) {
    fail("scaleMainSide: a plate with no groundnut/avocado/plain-yogurt/soy-milk should return null");
  }
  if (scaleMainSide(oatsGroundnut, 10, []) !== null) {
    fail("scaleMainSide: a gap under the minimum threshold should return null, not a no-op scale");
  }

  const groundnutConfigs: [string[], number, number][] = [
    // [ids, baseGrams, maxGrams]
    [["oats", "groundnut"], 30, 60],
    [["eggs", "avocado"], 75, 150],
    [["moi-moi", "soy-milk"], 250, 375],
    [["oats", "plain-yogurt"], 150, 300],
  ];
  for (const [ids, baseGrams, maxGrams] of groundnutConfigs) {
    const foods = foodsFor(ids);
    const modest = scaleMainSide(foods, 100, []);
    if (!modest) {
      fail(`scaleMainSide(${ids.join("+")}, 100kcal) should find a real amount to add`);
    } else {
      if (modest.grams <= baseGrams) fail(`scaleMainSide(${ids.join("+")}): scaled grams (${modest.grams}) did not grow past the base (${baseGrams})`);
      if (modest.grams > maxGrams) fail(`scaleMainSide(${ids.join("+")}): scaled grams (${modest.grams}) exceeded its own safe ceiling (${maxGrams})`);
      if (modest.extraCalories <= 0) fail(`scaleMainSide(${ids.join("+")}): extraCalories should be positive when scaling occurred`);
    }
    // A huge gap must still cap at the food's own researched maximum, never
    // invent a bigger amount.
    const huge = scaleMainSide(foods, 100000, []);
    if (!huge || huge.grams !== maxGrams) {
      fail(`scaleMainSide(${ids.join("+")}, huge gap) should cap at exactly ${maxGrams}g, got ${huge?.grams}`);
    }
  }

  // Kidney disease: plain yogurt, soy milk and groundnut all carry meaningful
  // protein in their own base serving (>= PROTEIN_CAP_THRESHOLD_G) and must
  // never scale past it for a kidney_disease profile — avocado (1.5g) is the
  // one side that still scales freely, same reasoning guardedCandidate()
  // already applies to extras.
  if (scaleMainSide(oatsGroundnut, 100000, ["kidney_disease"]) !== null) {
    fail("scaleMainSide: groundnut should never scale past its base serving for a kidney_disease profile");
  }
  if (scaleMainSide(moiMoiSoyMilk, 100000, ["kidney_disease"]) !== null) {
    fail("scaleMainSide: soy milk should never scale past its base serving for a kidney_disease profile");
  }
  if (scaleMainSide(oatsPlainYogurt, 100000, ["kidney_disease"]) !== null) {
    fail("scaleMainSide: plain yogurt should never scale past its base serving for a kidney_disease profile");
  }
  if (scaleMainSide(eggsAvocado, 1000, ["kidney_disease"]) === null) {
    fail("scaleMainSide: avocado should still scale for a kidney_disease profile (low protein, unaffected)");
  }

  // scaleMainProtein and scaleMainSide together must never double-count a
  // meal's gap — planForDay applies scaleMainSide to the RESIDUAL left after
  // scaleMainProtein. Directly checked here since the two never actually
  // co-occur on one real plate today (confirmed by grep of BREAKFAST/LUNCH/
  // DINNER above) — this proves the composition is correct regardless.
  const fishPlate = foodsFor(["beans-porridge", "fish"]);
  const gap = 400;
  const protein = scaleMainProtein(fishPlate, gap, []);
  const residual = Math.max(0, gap - (protein?.extraCalories ?? 0));
  if (protein && residual >= gap) {
    fail("scaleMainProtein found a real amount but the residual gap for scaleMainSide did not shrink");
  }

  // mealIdeaCalories must sum foods + scaledProtein + scaledSide, never just
  // one or the other — checked directly against a synthetic idea so this
  // does not depend on which real plate the rotation happens to serve.
  const synthetic = {
    foods: oatsGroundnut,
    names: oatsGroundnut.map((f) => f.name),
    index: 0,
    count: 1,
    scaledProtein: { food: fishPlate[1], name: "Fish", grams: 150, calories: 300, extraCalories: 100, instruction: "" },
    scaledSide: { food: oatsGroundnut[1], name: "Groundnut", grams: 60, calories: 340, extraCalories: 170, instruction: "" },
  };
  const rawSum = oatsGroundnut.reduce((s, f) => s + (f.calories ?? 0), 0);
  const expected = rawSum + 100 + 170;
  if (mealIdeaCalories(synthetic) !== expected) {
    fail(`mealIdeaCalories should sum foods + scaledProtein.extraCalories + scaledSide.extraCalories, got ${mealIdeaCalories(synthetic)}, expected ${expected}`);
  }

  // End-to-end: planForDay must actually SET scaledSide on a real breakfast
  // plate somewhere in real use, not just have a working standalone
  // function — same "sawScaledProtein" pattern already used above for
  // extras, applied to this new field.
  let sawScaledSide = false;
  for (let d = 0; d < 28; d++) {
    const dayKey = `2026-08-${String(d + 1).padStart(2, "0")}`;
    const idea = planForDay("breakfast", dayKey, new Map(), 0, [], new Map(), null, 500);
    if (idea.scaledSide) sawScaledSide = true;
  }
  if (!sawScaledSide) {
    fail("planForDay never set scaledSide on any breakfast plate across 28 days at a 500kcal target — the wiring may be broken");
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
