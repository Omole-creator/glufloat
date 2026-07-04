export type Verdict = "green" | "yellow" | "red";
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
   * For fruit only: the amount that gives about 15g of carbohydrate, i.e. one
   * diabetes "fruit exchange". Omitted for fruits where a 15g-carb serving does
   * not make sense (avocado is a fat; lime/lemon is only a squeeze).
   */
  carbExchange?: string;
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
