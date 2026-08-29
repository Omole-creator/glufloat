import type { Food } from "./types";
import {
  ACTIVITY_LABEL,
  ACTIVITY_LEVELS,
  CONDITION_LABEL,
  CONDITIONS,
  type ActivityLevel,
  type Condition,
} from "./tdee";

export { ACTIVITY_LABEL, ACTIVITY_LEVELS, CONDITION_LABEL, CONDITIONS };
export type { ActivityLevel, Condition };

/**
 * Goal / activity-based meal ranking. Deterministic, not ML — see the reasoning
 * in the project plan: there is no training data for "which Nigerian diabetic
 * meal helps weight loss", so a model would be guessing, not reasoning, and
 * could not be proven correct the way a formula can (scripts/goal-ranking-test.ts
 * asserts this formula's behaviour exactly, the same way scripts/engine-test.ts
 * asserts the verdict engine's).
 *
 * THE ONE RULE THIS FILE MUST NEVER BREAK: it only ever REORDERS which
 * already-GREEN plate is shown first. It never invents a portion, a GI, or a
 * frequency number, and it never changes a food's own data. The two axes below
 * are computed mechanically from fields a dietitian has already reviewed on
 * each food (category, gi, healthNote) — never a hand-typed subjective tag.
 */

export type Goal = "maintain" | "lose_weight" | "gain_weight" | "build_muscle";

export const GOALS: Goal[] = ["maintain", "lose_weight", "gain_weight", "build_muscle"];

export const GOAL_LABEL: Record<Goal, string> = {
  maintain: "Maintain my weight",
  lose_weight: "Lose weight",
  gain_weight: "Gain weight",
  build_muscle: "Build muscle",
};

export interface PlateAxes {
  /** Lower = more vegetable/lean-protein-forward. Higher = more starch/oil/nut-heavy. */
  energyLean: number;
  /** How much fish/meat/egg/beans the plate carries. */
  proteinDensity: number;
}

const ZERO_AXES: PlateAxes = { energyLean: 0, proteinDensity: 0 };

/**
 * One food's contribution to the two axes, computed only from fields already
 * reviewed elsewhere in the pipeline (category/role/gi/healthNote). Nothing
 * here is a new number — it is a mechanical read of data that exists already.
 */
function foodAxes(food: Food): PlateAxes {
  let energyLean = 0;
  if (food.role === "starch") energyLean += 1;
  if (food.gi === "high") energyLean += 1;
  else if (food.gi === "low") energyLean -= 0.5;
  if (food.role === "fat") energyLean += 1;
  const note = (food.healthNote ?? "").toLowerCase();
  if (note.includes("fried") || note.includes("oily") || note.includes("fat")) {
    energyLean += 1;
  }
  if (food.role === "vegetable" || food.role === "soup") energyLean -= 0.5;
  // A high-sodium or high-potassium serving nudges energyLean the same
  // direction as "fried"/"high GI" already do: this axis is generally "how
  // much a plate needs a light touch", not only about energy. On its own
  // this changes nothing (no bias vector wants low energyLean by default);
  // it only matters once CONDITION_WEIGHT below gives hypertension/kidney
  // disease a reason to prefer plates that score lower here.
  if ((food.sodiumMg ?? 0) >= 400) energyLean += 0.5;
  if ((food.potassiumMg ?? 0) >= 400) energyLean += 0.5;

  const proteinDensity = food.role === "protein" || food.role === "legume" ? 1 : 0;

  return { energyLean, proteinDensity };
}

/** The whole plate's axes: a plain sum of its foods' axes. */
export function plateAxes(foods: Food[]): PlateAxes {
  return foods.reduce(
    (acc, f) => {
      const a = foodAxes(f);
      return { energyLean: acc.energyLean + a.energyLean, proteinDensity: acc.proteinDensity + a.proteinDensity };
    },
    { ...ZERO_AXES },
  );
}

/**
 * How much each goal/activity value pulls the two axes. Small, hand-set
 * weights — not a clinical number, just a ranking preference, and the only
 * thing they can ever do is change which already-GREEN plate sorts first.
 */
const GOAL_WEIGHT: Record<Goal, PlateAxes> = {
  maintain: { energyLean: 0, proteinDensity: 0 },
  lose_weight: { energyLean: -1, proteinDensity: 0.25 },
  gain_weight: { energyLean: 0.5, proteinDensity: 0.75 },
  build_muscle: { energyLean: 0, proteinDensity: 1 },
};

const ACTIVITY_WEIGHT: Record<ActivityLevel, PlateAxes> = {
  sedentary: { energyLean: -0.5, proteinDensity: 0 },
  light: { energyLean: -0.25, proteinDensity: 0 },
  moderate: { energyLean: 0, proteinDensity: 0 },
  very_active: { energyLean: 0.5, proteinDensity: 0.5 },
  extra_active: { energyLean: 0.75, proteinDensity: 0.75 },
};

/**
 * How much each health condition pulls the two axes — always toward LOWER
 * energyLean (the axis that now also carries the sodium/potassium/fried
 * signal above), so a plate heavier in those moves down the list. Kidney
 * disease also pulls proteinDensity down, matching lib/tdee.ts's protein cap
 * (0.6-0.8 g/kg/day): a build_muscle goal's protein push must not win out
 * over a kidney condition, so this is summed in alongside the goal weights
 * below, not applied separately.
 */
const CONDITION_WEIGHT: Record<Condition, PlateAxes> = {
  hypertension: { energyLean: -1, proteinDensity: 0 },
  high_cholesterol: { energyLean: -1, proteinDensity: 0 },
  kidney_disease: { energyLean: -1, proteinDensity: -0.75 },
};

export interface PersonalizationInput {
  goals: Goal[];
  activityLevel: ActivityLevel | null;
  conditions?: Condition[];
}

/**
 * The person's full bias vector: every selected goal's weight, their
 * activity level's weight, and every selected condition's weight, all
 * summed. Multiple goals (or conditions) are handled by the SAME addition —
 * nothing is special-cased pair by pair, so any combination a person picks
 * is covered by this one formula.
 */
export function biasVector(input: PersonalizationInput): PlateAxes {
  const vec = { ...ZERO_AXES };
  for (const g of input.goals) {
    vec.energyLean += GOAL_WEIGHT[g].energyLean;
    vec.proteinDensity += GOAL_WEIGHT[g].proteinDensity;
  }
  if (input.activityLevel) {
    vec.energyLean += ACTIVITY_WEIGHT[input.activityLevel].energyLean;
    vec.proteinDensity += ACTIVITY_WEIGHT[input.activityLevel].proteinDensity;
  }
  for (const c of input.conditions ?? []) {
    vec.energyLean += CONDITION_WEIGHT[c].energyLean;
    vec.proteinDensity += CONDITION_WEIGHT[c].proteinDensity;
  }
  return vec;
}

/**
 * How well a plate matches a bias vector. LOWER is a better match (so it can
 * be added straight into planForDay's ascending sort). A plate whose axes move
 * in the same direction the person wants scores lower.
 */
export function biasScore(foods: Food[], bias: PlateAxes): number {
  if (bias.energyLean === 0 && bias.proteinDensity === 0) return 0;
  const axes = plateAxes(foods);
  return -(axes.energyLean * bias.energyLean + axes.proteinDensity * bias.proteinDensity);
}
