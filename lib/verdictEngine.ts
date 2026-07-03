import type { Food, MealItem, MealResult, Verdict } from "./types";

/**
 * Meal scoring per the Glufloat SPEC (section 3.2).
 *
 * Score scale: 0 = deep red, 2 = solid green.
 *   RED    : score < 0.75
 *   YELLOW : 0.75 <= score < 1.75
 *   GREEN  : score >= 1.75
 *
 * Seed from the worst starch in the meal, then apply "The Fix" downgraders:
 *   + vegetable or green soup present  -> +1 toward green
 *   + protein present                  -> +0.5 toward green
 *   + starch portion set to Half       -> +1 toward green
 *   - starch portion set to Large      -> -0.5 toward red
 * Hard override: any high-GI drink or straight sugar locks the meal RED.
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
      headline: "Add foods to build your plate.",
      fixes: [],
      breakdown: [],
    };
  }

  const breakdown: string[] = [];
  const fixes: string[] = [];

  // Hard red: liquid sugar cannot be fixed by pairing.
  const sugarDrinks = items.filter((i) => isLiquidSugar(i.food));
  if (sugarDrinks.length > 0) {
    const names = sugarDrinks.map((i) => i.food.name).join(", ");
    breakdown.push(`${names}: liquid or straight sugar locks this meal red.`);
    fixes.push(
      `Swap ${sugarDrinks.length > 1 ? "them" : sugarDrinks[0].food.name} for water or unsweetened zobo. No soup or vegetable can fix liquid sugar.`
    );
    return {
      verdict: "red",
      score: 0,
      locked: true,
      headline: "This meal is red because of the sugary drink.",
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

  // Seed: worst starch if present, else worst item overall.
  let score: number;
  if (worstStarch) {
    const s = worstStarch.food;
    score = s.gi === "high" && s.baseVerdict !== "green" ? 0 : seedScore(s.baseVerdict);
    breakdown.push(
      s.gi === "high"
        ? `${s.name} is a fast starch, so the meal starts red.`
        : `${s.name} sets the starting point at ${toVerdict(score)}.`
    );
  } else {
    score = items.reduce(
      (min, i) => Math.min(min, seedScore(i.food.baseVerdict)),
      2
    );
    breakdown.push("No heavy starch here, so the worst item sets the tone.");
  }

  const hasVeg = items.some((i) => isVeg(i.food));
  const hasProtein = items.some((i) => isProtein(i.food));

  if (hasVeg) {
    score += 1;
    breakdown.push("Vegetables or a green soup slow the sugar. +1 toward green.");
  }
  if (hasProtein) {
    score += 0.5;
    breakdown.push("Protein slows the meal further. +0.5 toward green.");
  }

  if (worstStarch) {
    if (worstStarch.portion === "half") {
      score += 1;
      breakdown.push(
        `Half portion of ${worstStarch.food.name}. +1 toward green.`
      );
    } else if (worstStarch.portion === "large") {
      score -= 0.5;
      breakdown.push(
        `Large portion of ${worstStarch.food.name} pushes it back toward red.`
      );
    }
  }

  score = Math.max(0, Math.min(2, score));
  const verdict = toVerdict(score);

  // Dynamic fix tips: the exact moves that turn this meal green.
  if (verdict !== "green") {
    if (worstStarch && worstStarch.portion !== "half") {
      fixes.push(
        `Cut ${worstStarch.food.name} to a half portion. ${worstStarch.food.portionGuidance}`
      );
    }
    if (!hasVeg) {
      fixes.push(
        worstStarch && worstStarch.food.pairingAdvice
          ? `Add vegetables. ${worstStarch.food.pairingAdvice}`
          : "Add a vegetable or a green soup like efo riro or okra."
      );
    }
    if (!hasProtein) {
      fixes.push("Add a protein like fish, chicken, or boiled eggs.");
    }
    if (fixes.length === 0) {
      fixes.push(
        "This one stays cautious. Keep the portion small and do not eat it on an empty stomach."
      );
    }
  }

  const headline =
    verdict === "green"
      ? "This plate works. Enjoy it."
      : verdict === "yellow"
        ? "Close. A small fix turns this green."
        : "This plate spikes fast as it stands. Here is the fix.";

  return { verdict, score, locked: false, headline, fixes, breakdown };
}

/** Preview: would the meal turn green if the fixes were applied? */
export function greenPath(items: MealItem[]): MealResult {
  const fixed: MealItem[] = items.map((i) =>
    isStarch(i.food) ? { ...i, portion: "half" as const } : i
  );
  return scoreMeal(fixed);
}
