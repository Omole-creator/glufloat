import type { NamedMeal } from "./mealtime";
import type { Goal } from "./personalization";

/**
 * BMR/TDEE/calorie-target math (Mifflin-St Jeor, the current standard —
 * Academy of Nutrition and Dietetics considers it more accurate than the
 * older Harris-Benedict equation). Pure functions, no I/O, same shape as
 * lib/glucose.ts. Tested by scripts/tdee-test.ts.
 *
 * THE ONE RULE THIS FILE MUST NEVER BREAK, same as lib/personalization.ts:
 * nothing here ever touches a food's gi/baseVerdict/portionGuidance/frequency
 * or the verdict engine's score. Calories are a separate, additive layer — a
 * daily budget the person sees, and a soft tiebreak in lib/nextMeal.ts that
 * reorders which already-GREEN plate is offered. Never a new way to grade a
 * food.
 */

export type Sex = "male" | "female";

/**
 * Five tiers, matching the standard TDEE activity-multiplier table. Labels
 * are the dietitian's own wording for tiers 4/5 ("Very active" / "Extremely
 * active"), kept verbatim.
 */
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active" | "extra_active";

export type Condition = "hypertension" | "high_cholesterol" | "kidney_disease";

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "very_active",
  "extra_active",
];

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Light activity (exercise 1 to 3 days a week)",
  moderate: "Moderate activity (exercise 3 to 5 days a week)",
  very_active: "Very active (exercise 6 to 7 days a week)",
  extra_active: "Extremely active (a physical job, plus training)",
};

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const CONDITIONS: Condition[] = ["hypertension", "high_cholesterol", "kidney_disease"];

export const CONDITION_LABEL: Record<Condition, string> = {
  hypertension: "Hypertension (high blood pressure)",
  high_cholesterol: "High cholesterol",
  kidney_disease: "Kidney disease",
};

/** Mifflin-St Jeor. Male: 10w + 6.25h - 5a + 5. Female: 10w + 6.25h - 5a - 161. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export function tdee(bmrValue: number, activityLevel: ActivityLevel): number {
  return bmrValue * ACTIVITY_MULTIPLIER[activityLevel];
}

/**
 * How much a goal shifts the daily calorie target off TDEE. A round,
 * conservative number per goal, not a clinical prescription — maintain is a
 * no-op, weight loss is the standard ~500kcal/day deficit (about 0.5kg/week),
 * weight gain and muscle building are smaller surpluses so the gain stays
 * gradual and mostly lean.
 */
const GOAL_CALORIE_ADJUST: Record<Goal, number> = {
  maintain: 0,
  lose_weight: -500,
  gain_weight: 400,
  build_muscle: 250,
};

/**
 * Multiple goals are a plain sum, same rule as lib/personalization.ts's bias
 * vector — no pair is special-cased. Floored well above any starvation range.
 */
export function calorieTarget(tdeeValue: number, goals: Goal[]): number {
  const adjust = goals.reduce((sum, g) => sum + GOAL_CALORIE_ADJUST[g], 0);
  return Math.max(1200, Math.round(tdeeValue + adjust));
}

/**
 * A house formula (documented, not a lone research finding — same footing as
 * the weekly-frequency numbers in docs/EVIDENCE.md §8, pending dietitian
 * sign-off): about 37.5% of calories from carbohydrate, which sits under the
 * general 45%+ guidance because this app already runs a stricter low-GI
 * philosophy than standard advice.
 */
export function carbBudgetG(calorieTargetValue: number): number {
  return Math.round((calorieTargetValue * 0.375) / 4);
}

/**
 * Even split of a daily total across whichever meals the person actually
 * eats (their own meal_pattern), generalising the dietitian's own "10g each
 * for morning, afternoon, evening" example to N meals.
 */
function distributeEvenly(daily: number, mealPattern: NamedMeal[]): Record<NamedMeal, number> {
  const meals = mealPattern.length > 0 ? mealPattern : (["breakfast", "lunch", "dinner"] as NamedMeal[]);
  const perMeal = Math.round(daily / meals.length);
  const out = {} as Record<NamedMeal, number>;
  for (const m of meals) out[m] = perMeal;
  return out;
}

export function distributeCarbs(dailyCarbG: number, mealPattern: NamedMeal[]): Record<NamedMeal, number> {
  return distributeEvenly(dailyCarbG, mealPattern);
}

export function distributeCalories(
  dailyCalorieTarget: number,
  mealPattern: NamedMeal[],
): Record<NamedMeal, number> {
  return distributeEvenly(dailyCalorieTarget, mealPattern);
}

const MEAL_ORDER: NamedMeal[] = ["breakfast", "lunch", "dinner"];

/**
 * The calorie allocation for THIS meal, given what has already been eaten
 * today and how many meals are left. This is the dynamic, "recalculate as
 * the day goes" piece of the dietitian's spec: breakfast eaten more than
 * planned means lunch and dinner's targets shrink automatically, rather than
 * three independent flat thirds. Meals are ordered breakfast < lunch <
 * dinner; "remaining" is this meal plus whichever LATER meals are in the
 * person's own mealPattern. Never goes below 0.
 */
export function remainingMealCalorieTarget(
  dailyTarget: number,
  eatenToday: number,
  mealPattern: NamedMeal[],
  meal: NamedMeal,
): number {
  const idx = MEAL_ORDER.indexOf(meal);
  const remaining = mealPattern.filter((m) => MEAL_ORDER.indexOf(m) >= idx);
  const mealsLeft = remaining.length > 0 ? remaining.length : 1;
  const budgetLeft = Math.max(0, dailyTarget - eatenToday);
  return Math.round(budgetLeft / mealsLeft);
}

/**
 * Kidney disease caps daily protein at 0.6-0.8 g/kg/day (NKF KDOQI /
 * International Society of Renal Nutrition and Metabolism guidance), a real
 * restriction that overrides any weight/muscle goal's usual protein push —
 * a build_muscle goal must never raise a kidney-disease profile's protein
 * target. 0.7 g/kg is used as the documented central estimate. Returns null
 * (no cap) for anyone without kidney disease.
 */
export function proteinCapG(weightKg: number, conditions: Condition[]): number | null {
  if (!conditions.includes("kidney_disease")) return null;
  return Math.round(weightKg * 0.7 * 10) / 10;
}
