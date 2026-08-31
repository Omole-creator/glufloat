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
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  very_active: "Very active",
  extra_active: "Extremely active",
};

/**
 * The full explanation shown for each activity level in the dropdown
 * (`components/PersonalizationSettings.tsx`) — founder-supplied wording,
 * 2026-08-29. `ACTIVITY_LABEL` above stays the short form used anywhere
 * space is tight (the closed dropdown, a summary line).
 */
export const ACTIVITY_DESCRIPTION: Record<ActivityLevel, string> = {
  sedentary: "Little or no exercise; mostly sitting or doing light activities throughout the day.",
  light:
    "Light exercise or physical activity 1–3 days a week, such as walking, cycling, dancing, or home workouts.",
  moderate:
    "Moderate exercise or physical activity 3–5 days a week, such as brisk walking, running, sports, or regular workouts.",
  very_active: "Intense exercise or physical activity 6–7 days a week, or a job that keeps you physically active.",
  extra_active: "Very intense daily exercise or training, combined with a physically demanding job.",
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
 * The real ceiling on what this app's own meal-idea plates + extras can ever
 * serve in a day: 3 meals at their structural max (breakfast 425 + lunch 725
 * + dinner 674 = 1,824kcal, from lib/nextMeal.ts's IDEAS, verified against
 * data/foods.json) plus one extra option at each meal (best case
 * ~196+180+225 = 601kcal, lib/nextMeal.ts's EXTRA_OPTIONS) — a theoretical
 * 2,425kcal/day. This constant sits a safety margin below that because
 * planForDay's MIN_POOL variety floor means the served plate is not always
 * the single largest eligible one.
 *
 * A target above this used to be shown honestly, with "calories remaining"
 * left unable to ever reach 0 for a very active or muscle-building person —
 * a deliberate design choice, reversed by direct founder instruction: the
 * target the app actually plans meals and tracks "remaining" against must
 * always be achievable by real food, full stop. calorieTarget() clamps to
 * this so every consumer (the settings display, per-meal planning, and the
 * "remaining" calc) agrees on one number. bmr()/tdee() stay uncapped
 * (labelled "Resting energy"/"Full daily need", not a target).
 */
export const MEAL_PLANNING_CALORIE_CEILING = 2200;

/**
 * Multiple goals are a plain sum, same rule as lib/personalization.ts's bias
 * vector — no pair is special-cased. Floored well above any starvation range,
 * and capped at MEAL_PLANNING_CALORIE_CEILING (see above) so the target is
 * always closeable by real food.
 */
export function calorieTarget(tdeeValue: number, goals: Goal[]): number {
  const adjust = goals.reduce((sum, g) => sum + GOAL_CALORIE_ADJUST[g], 0);
  const raw = Math.max(1200, Math.round(tdeeValue + adjust));
  return Math.min(raw, MEAL_PLANNING_CALORIE_CEILING);
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
 *
 * `mealWeights` (optional) splits the remaining budget PROPORTIONALLY to
 * each meal's own real achievable range instead of a flat equal share —
 * breakfast structurally maxes far lower than lunch/dinner in Nigerian
 * cuisine (see lib/nextMeal.ts's MEAL_MAX_CALORIES), so a flat split could
 * assign breakfast a target no breakfast plate could ever reach. Omitting it
 * reproduces the old flat-split behaviour exactly, byte for byte — every
 * existing caller and every existing test keeps working unmodified.
 */
export function remainingMealCalorieTarget(
  dailyTarget: number,
  eatenToday: number,
  mealPattern: NamedMeal[],
  meal: NamedMeal,
  mealWeights?: Partial<Record<NamedMeal, number>>,
): number {
  const idx = MEAL_ORDER.indexOf(meal);
  const remaining = mealPattern.filter((m) => MEAL_ORDER.indexOf(m) >= idx);
  const mealsLeft = remaining.length > 0 ? remaining.length : 1;
  const budgetLeft = Math.max(0, dailyTarget - eatenToday);
  if (!mealWeights) return Math.round(budgetLeft / mealsLeft);
  const weightOf = (m: NamedMeal) => mealWeights[m] ?? 1;
  const remainingMeals = remaining.length > 0 ? remaining : [meal];
  const totalWeight = remainingMeals.reduce((s, m) => s + weightOf(m), 0);
  return Math.round((budgetLeft * weightOf(meal)) / (totalWeight || 1));
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
