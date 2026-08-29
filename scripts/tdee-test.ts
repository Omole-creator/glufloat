// Sanity cases for lib/tdee.ts, no server needed. Run after any edit to it.
import {
  bmr,
  tdee,
  calorieTarget,
  carbBudgetG,
  distributeCarbs,
  distributeCalories,
  proteinCapG,
  remainingMealCalorieTarget,
  ACTIVITY_MULTIPLIER,
  ACTIVITY_LEVELS,
} from "../lib/tdee";

let failures = 0;
function assertEqual(label: string, got: number, want: number, tolerance = 0.01) {
  if (Math.abs(got - want) > tolerance) {
    console.error(`FAIL ${label}: got ${got}, want ${want}`);
    failures++;
  } else {
    console.log(`ok   ${label}`);
  }
}
function assertTrue(label: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    failures++;
  } else {
    console.log(`ok   ${label}`);
  }
}

// 1. Mifflin-St Jeor worked examples ------------------------------------------
// Male, 70kg, 175cm, 30y: 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5
const maleBmr = bmr("male", 70, 175, 30);
assertEqual("male BMR (70kg/175cm/30y)", maleBmr, 1648.75);
assertEqual("male TDEE moderate", tdee(maleBmr, "moderate"), 1648.75 * 1.55);

// Female, 65kg, 160cm, 40y: 10*65 + 6.25*160 - 5*40 - 161
const femaleBmr = bmr("female", 65, 160, 40);
assertEqual("female BMR (65kg/160cm/40y)", femaleBmr, 1289);
assertEqual("female TDEE sedentary", tdee(femaleBmr, "sedentary"), 1289 * 1.2);

// 2. Activity multipliers match the standard 5-tier scale, ascending ---------
assertTrue(
  "activity multipliers strictly increase across all 5 tiers",
  ACTIVITY_LEVELS.every(
    (a, i) => i === 0 || ACTIVITY_MULTIPLIER[a] > ACTIVITY_MULTIPLIER[ACTIVITY_LEVELS[i - 1]],
  ),
);
assertEqual("sedentary multiplier", ACTIVITY_MULTIPLIER.sedentary, 1.2);
assertEqual("extra_active multiplier", ACTIVITY_MULTIPLIER.extra_active, 1.9);

// 3. Goal adjustments: maintain is a no-op, multiple goals sum ---------------
assertEqual("maintain leaves TDEE unchanged", calorieTarget(2000, ["maintain"]), 2000);
assertEqual("lose_weight is a 500kcal deficit", calorieTarget(2000, ["lose_weight"]), 1500);
assertEqual(
  "lose_weight + build_muscle sum (recomposition)",
  calorieTarget(2000, ["lose_weight", "build_muscle"]),
  1750,
);
assertTrue("calorie target never drops below the safety floor", calorieTarget(1000, ["lose_weight"]) >= 1200);

// 4. Carb budget and distribution ---------------------------------------------
const dailyCarb = carbBudgetG(2000);
assertEqual("carb budget is ~37.5% of calories / 4", dailyCarb, Math.round((2000 * 0.375) / 4));
const spread = distributeCarbs(dailyCarb, ["breakfast", "lunch", "dinner"]);
assertTrue(
  "carbs split evenly across 3 meals",
  spread.breakfast === spread.lunch && spread.lunch === spread.dinner,
);
const calSpread = distributeCalories(2100, ["breakfast", "lunch"]);
assertEqual("calories split evenly across 2 meals", calSpread.breakfast, 1050);

// 5. Kidney protein cap overrides any goal, and only applies with kidney disease
assertTrue("no protein cap without kidney disease", proteinCapG(70, []) === null);
assertTrue("no protein cap for other conditions alone", proteinCapG(70, ["hypertension"]) === null);
assertEqual("kidney disease caps protein at 0.7 g/kg", proteinCapG(70, ["kidney_disease"])!, 49);
assertEqual(
  "kidney cap unaffected by which other conditions are also present",
  proteinCapG(70, ["hypertension", "kidney_disease", "high_cholesterol"])!,
  49,
);

// 6. Dynamic remaining-calorie allocation, recalculated meal by meal --------
assertEqual(
  "3 meals, nothing eaten yet: breakfast gets an even third",
  remainingMealCalorieTarget(1800, 0, ["breakfast", "lunch", "dinner"], "breakfast"),
  600,
);
assertEqual(
  "ate more than planned at breakfast: lunch's share shrinks",
  remainingMealCalorieTarget(1800, 600, ["breakfast", "lunch", "dinner"], "lunch"),
  600,
);
assertEqual(
  "overate breakfast: remaining meals split what's left",
  remainingMealCalorieTarget(1800, 900, ["breakfast", "lunch", "dinner"], "lunch"),
  450,
);
assertTrue(
  "budget already spent: remaining target never goes negative",
  remainingMealCalorieTarget(1800, 2500, ["breakfast", "lunch", "dinner"], "dinner") >= 0,
);
assertEqual(
  "a person who skips lunch splits the day across their 2 real meals",
  remainingMealCalorieTarget(1800, 0, ["breakfast", "dinner"], "breakfast"),
  900,
);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nall passed.");
