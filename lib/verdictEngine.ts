import type { Food, MealItem, MealResult, Verdict } from "./types";

/**
 * Meal scoring per the Glufloat SPEC (section 3.2).
 *
 * Score scale: 0 = deep red, 2 = solid green.
 *   RED    : score < 0.75
 *   YELLOW : 0.75 <= score < 1.75
 *   GREEN  : score >= 1.75
 *
 * All words shown to the user are kept plain, so anyone can follow them.
 */

const GREEN_AT = 1.75;
const YELLOW_AT = 0.75;

function toVerdict(score: number): Verdict {
  if (score >= GREEN_AT) return "green";
  if (score >= YELLOW_AT) return "yellow";
  return "red";
}

function seedScore(v: Verdict): number {
  if (v === "green") return 2;
  if (v === "yellow") return 1;
  return 0;
}

const isVeg = (f: Food) =>
  f.role === "vegetable" || (f.role === "soup" && f.baseVerdict === "green");
const isProtein = (f: Food) =>
  f.role === "protein" || f.role === "legume" || f.role === "dairy";
const isStarch = (f: Food) => f.role === "starch";
const isLiquidSugar = (f: Food) =>
  (f.role === "drink" && f.gi === "high") || f.role === "sugar";

export function scoreMeal(items: MealItem[]): MealResult {
  if (items.length === 0) {
    return {
      verdict: "green",
      score: 2,
      locked: false,
      headline: "Add your food to see the answer.",
      fixes: [],
      breakdown: [],
    };
  }

  const breakdown: string[] = [];
  const fixes: string[] = [];

  // Sweet drinks cannot be fixed by anything else on the plate.
  const sugarDrinks = items.filter((i) => isLiquidSugar(i.food));
  if (sugarDrinks.length > 0) {
    const names = sugarDrinks.map((i) => i.food.name).join(", ");
    breakdown.push(
      `${names} is sweet, and sweet drinks make sugar rise very fast.`,
    );
    fixes.push(
      `Take away the ${sugarDrinks[0].food.name}. Drink water, or zobo with no sugar. Nothing else can fix a sweet drink.`,
    );
    return {
      verdict: "red",
      score: 0,
      locked: true,
      headline: "The sweet drink makes this red.",
      fixes,
      breakdown,
    };
  }

  const starches = items.filter((i) => isStarch(i.food));
  const worstStarch = starches.reduce<MealItem | null>((worst, i) => {
    if (!worst) return i;
    return seedScore(i.food.baseVerdict) < seedScore(worst.food.baseVerdict)
      ? i
      : worst;
  }, null);

  let score: number;
  if (worstStarch) {
    const s = worstStarch.food;
    score = s.gi === "high" && s.baseVerdict !== "green" ? 0 : seedScore(s.baseVerdict);
    breakdown.push(
      s.gi === "high"
        ? `${s.name} turns to sugar fast, so we start careful.`
        : `${s.name} is the main thing to watch here.`,
    );
  } else {
    score = items.reduce(
      (min, i) => Math.min(min, seedScore(i.food.baseVerdict)),
      2,
    );
    breakdown.push("No heavy swallow or rice here, which is good.");
  }

  const hasVeg = items.some((i) => isVeg(i.food));
  const hasProtein = items.some((i) => isProtein(i.food));

  if (hasVeg) {
    score += 1;
    breakdown.push("You added vegetables. Good, they slow the sugar down.");
  }
  if (hasProtein) {
    score += 0.5;
    breakdown.push("You added meat, fish, or egg. That helps too.");
  }

  if (worstStarch) {
    if (worstStarch.portion === "half") {
      score += 1;
      breakdown.push(
        `You chose a small size of ${worstStarch.food.name}. That helps a lot.`,
      );
    } else if (worstStarch.portion === "large") {
      score -= 0.5;
      breakdown.push(
        `A large size of ${worstStarch.food.name} makes the sugar rise more.`,
      );
    }
  }

  score = Math.max(0, Math.min(2, score));
  const verdict = toVerdict(score);

  // Plain, do-this-now fixes.
  if (verdict !== "green") {
    if (worstStarch && worstStarch.portion !== "half") {
      fixes.push(
        `Eat a smaller size of ${worstStarch.food.name}. Take about half of what you normally would.`,
      );
    }
    if (!hasVeg) {
      fixes.push("Add vegetable soup, like efo, okra, or egusi.");
    }
    if (!hasProtein) {
      fixes.push("Add some meat, fish, or egg.");
    }
    if (fixes.length === 0) {
      fixes.push(
        "Keep the size small, and do not eat it when your stomach is empty.",
      );
    }
  }

  const headline =
    verdict === "green"
      ? "This food is good. Enjoy it."
      : verdict === "yellow"
        ? "Almost there. One small change makes it green."
        : "This one raises sugar fast. Here is how to fix it.";

  return { verdict, score, locked: false, headline, fixes, breakdown };
}

/** Preview: would the meal turn green if the starch were made small? */
export function greenPath(items: MealItem[]): MealResult {
  const fixed: MealItem[] = items.map((i) =>
    isStarch(i.food) ? { ...i, portion: "half" as const } : i,
  );
  return scoreMeal(fixed);
}
