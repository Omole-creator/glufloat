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

// Meat comes in chunks, not palm-shaped slabs, so the palm measures the total.
const DECK =
  "Add fish, chicken, or meat (90g). That is two or three chunks that, put together, fill your palm.";

/**
 * Shown right after a fix that suggests meat. Many people with diabetes also
 * have high blood pressure, high cholesterol, or kidney problems, so red meat
 * that is fine for sugar can still harm them. The leading "Note:" lets the meal
 * builder render this line in red instead of as a numbered step.
 */
const MEAT_NOTE =
  "Note: only add beef or red meat if you do not have high blood pressure, high cholesterol, or kidney problems. If you do, use fish or skinless chicken instead.";

/**
 * What vegetables to add, worded so they actually go with the main food.
 * Keyed by the main starch's category. If a category is not here, we say
 * nothing rather than give an odd pairing (e.g. never tell a smoothie or
 * beans to add efo riro soup).
 */
const VEG_FIX: Record<string, string> = {
  swallow:
    "Add a green vegetable soup, like efo riro, okra, or egusi. Two big spoons, about one cup.",
  rice: "Add vegetables to it, like a spoon of ugu or a garden-egg and tomato stew. About one cup.",
  pasta: "Add vegetables to it, like a sauce with carrot, green beans, and pepper. About one cup.",
  tuber: "Add a garden-egg sauce or green vegetables on the side. About one cup.",
  plantain:
    "Add green vegetables or a vegetable sauce on the side. About one cup.",
  bread: "Add an egg and vegetables, never bread on its own.",
};

/**
 * What protein or slow-down food to add, again worded to match the main food.
 * Bread is left out on purpose; its VEG_FIX line already mentions the egg.
 */
const PROTEIN_FIX: Record<string, string> = {
  swallow: DECK,
  rice: DECK,
  pasta: DECK,
  tuber: DECK,
  plantain: DECK,
  cereal: "Add moi moi or akara to slow it down.",
  corn: "Add groundnut or a boiled egg to slow it down.",
};

/** Lowercase the first letter so a portion phrase reads well mid-sentence. */
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

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
// A high-GI drink is liquid sugar; a role:sugar item is pure sweet food (sugar,
// honey, biscuit, cake). Both lock the meal red, but they are worded apart so a
// biscuit is never called a "drink".
const isSweetDrink = (f: Food) => f.role === "drink" && f.gi === "high";
const isSweetFood = (f: Food) => f.role === "sugar";

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

  // Sweet drinks and pure sweet foods cannot be fixed by anything else on the
  // plate. A drink and a biscuit are both red, but each is worded correctly.
  const sweetDrinks = items.filter((i) => isSweetDrink(i.food));
  const sweetFoods = items.filter((i) => isSweetFood(i.food));
  if (sweetDrinks.length > 0 || sweetFoods.length > 0) {
    if (sweetDrinks.length > 0) {
      const names = sweetDrinks.map((i) => i.food.name).join(", ");
      breakdown.push(
        `${names} is sweet, and sweet drinks make sugar rise very fast.`,
      );
      fixes.push(
        `Take away the ${sweetDrinks[0].food.name}. Instead drink water, or zobo with no sugar, one cup (250ml). Nothing else can fix a sweet drink.`,
      );
    } else {
      const names = sweetFoods.map((i) => i.food.name).join(", ");
      breakdown.push(
        `${names} is very sweet, and sweet foods make sugar rise very fast.`,
      );
      fixes.push(
        `Best to skip the ${sweetFoods[0].food.name}. Nothing else on the plate can make a sweet food like this safe.`,
      );
    }
    return {
      verdict: "red",
      score: 0,
      locked: true,
      headline:
        sweetDrinks.length > 0
          ? "The sweet drink makes this red."
          : "This sweet food makes it red.",
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
    breakdown.push("You added fish, meat, egg, or beans. That helps too.");
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

  // Plain, do-this-now fixes. We only ever suggest adding something that
  // truly goes with the main food. When there is no sensible pairing, we say
  // nothing rather than give an odd suggestion.
  if (verdict !== "green") {
    const mainCategory = worstStarch?.food.category ?? null;

    if (worstStarch && worstStarch.portion !== "half") {
      const pg = worstStarch.food.portionGuidance;
      if (worstStarch.food.portionIcon === "avoid") {
        // A food to skip reads badly after "A safe size is". Drop the opening
        // "Best to skip this." so the sentence is not said twice.
        const rest = pg.replace(/^(best to skip this|none)[.,\s]*/i, "");
        fixes.push(
          rest
            ? `Best to skip the ${worstStarch.food.name}. ${rest}`
            : `Best to skip the ${worstStarch.food.name}.`,
        );
      } else {
        fixes.push(
          `Eat less ${worstStarch.food.name}. A safe size is ${lower(pg)}`,
        );
      }
    }
    if (!hasVeg && mainCategory && VEG_FIX[mainCategory]) {
      fixes.push(VEG_FIX[mainCategory]);
    }
    if (!hasProtein && mainCategory && PROTEIN_FIX[mainCategory]) {
      const proteinFix = PROTEIN_FIX[mainCategory];
      fixes.push(proteinFix);
      // Only the meat suggestion carries the blood-pressure/cholesterol note.
      if (proteinFix === DECK) fixes.push(MEAT_NOTE);
    }
    if (fixes.length === 0) {
      const hasDrink = items.some((i) => i.food.role === "drink");
      fixes.push(
        hasDrink
          ? "This is a drink. Keep it to one glass (200ml), and take it with food, not on its own."
          : "Keep each food to the safe size shown below, and do not eat on an empty stomach.",
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
