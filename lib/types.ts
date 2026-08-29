export type Verdict = "green" | "yellow" | "red";

/**
 * Which picture to draw for a food's portion. This is stored per food rather
 * than guessed from the wording of `portionGuidance`, so that rewriting the
 * copy can never silently change the picture on a card.
 */
export type PortionKey =
  | "fist"
  | "half-cup"
  | "three-quarter-cup"
  | "cup"
  | "bowl"
  | "cards"
  | "handful"
  | "matchbox"
  | "slice"
  | "half-fruit"
  | "whole-fruit"
  | "berries"
  | "pieces"
  | "glass"
  | "spoon"
  | "eggs"
  | "cob"
  | "palm"
  | "plantain"
  | "pinch"
  | "sticks"
  | "avoid"
  | "free"
  | "generic";
export type Level = "low" | "medium" | "high";
export type Role =
  | "starch"
  | "protein"
  | "vegetable"
  | "fruit"
  | "fat"
  | "sugar"
  | "drink"
  | "dairy"
  | "legume"
  | "soup"
  | "condiment";

export interface Food {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  role: Role;
  carbLoad: Level;
  gi: Level;
  baseVerdict: Verdict;
  portionGuidance: string;
  pairingAdvice: string;
  frequency: string;
  logicNote: string;
  tags: string[];
  /**
   * The picture drawn beside the portion text. Set for every food by
   * `scripts/portion-icons.mjs`. When it is "avoid", the food is one to skip:
   * the verdict engine reads this instead of parsing the portion wording.
   */
  portionIcon?: PortionKey;
  /**
   * For fruit only: the amount that gives about 15g of carbohydrate, i.e. one
   * diabetes "fruit exchange". Omitted for fruits where a 15g-carb serving does
   * not make sense (avocado is a fat; lime/lemon is only a squeeze).
   */
  carbExchange?: string;
  /**
   * A red-box warning for people who also have high blood pressure, high
   * cholesterol, or kidney problems. Set only on foods where a salty, fatty,
   * or red/organ-meat choice could harm them even when the sugar is fine.
   */
  healthNote?: string;
  /**
   * A CALM, grey-box note about timing a tablet around a food. Owned by
   * `scripts/medicine-notes.mjs`.
   *
   * This is deliberately not `healthNote`. The red box means "this food may
   * harm you", and a red box on a green staple like okra would tell people to
   * stop eating one of the best foods on the list, which is the opposite of the
   * truth. So a medicine note must always say WHEN to take the tablet, and must
   * never discourage the food. Dietician-reviewed.
   */
  medicineNote?: string;
  /**
   * Nutrition for the food's own serving size (the gram/ml anchor already in
   * `portionGuidance`), not a generic per-100g figure. Owned by
   * `scripts/food-composition.mjs`. Never shown as a source-cited number to
   * users (same "no card cites a source" rule as the rest of the data) — used
   * for the daily calorie budget, the carb-distribution rule, and the
   * kidney/hypertension/cholesterol condition bias, never for the red/yellow/
   * green verdict itself.
   */
  calories?: number;
  proteinG?: number;
  fatG?: number;
  carbG?: number;
  fiberG?: number;
  potassiumMg?: number;
  sodiumMg?: number;
  /**
   * Internal provenance only, never shown to users. "table" = grounded in the
   * measured Nigeria Food Composition Table (2016); "estimated" = derived from
   * established nutrition figures for the food where the table had no
   * reliable row (most composite Nigerian dishes). Both are automatically
   * checked by `scripts/food-composition-audit.mjs` (Atwater energy
   * cross-check + per-category plausibility bands) before being written.
   */
  nutritionSource?: "table" | "estimated";
}

export type PortionSize = "half" | "normal" | "large";

export interface MealItem {
  food: Food;
  portion: PortionSize;
}

export interface MealResult {
  verdict: Verdict;
  score: number;
  locked: boolean;
  headline: string;
  fixes: string[];
  breakdown: string[];
}
