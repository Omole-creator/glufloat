import type { Food, MealItem, MealResult, Verdict } from "./types";
import { cleanFoodName } from "./foodName";

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
  "Add fish, chicken, or meat (90g). That is two chunks that, put together, fill your palm.";

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
    "Add a green vegetable soup, like efo riro, okra, or egusi. Two big spoons (250ml).",
  rice: "Add vegetables to it, like ugu or a garden-egg and tomato stew. One cup (250ml).",
  pasta: "Add vegetables to it, like a sauce with carrot, green beans, and pepper. One cup (250ml).",
  tuber: "Add a garden-egg sauce or green vegetables on the side. One cup (250ml).",
  plantain:
    "Add green vegetables or a vegetable sauce on the side. One cup (250ml).",
  // Bread is deliberately absent. Nobody puts vegetables on bread here, so
  // there is no coherent vegetable fix for it. Its fix lives in PROTEIN_FIX.
};

/**
 * What protein or slow-down food to add, again worded to match the main food.
 * Each line must name something people actually eat with that food. Bread gets
 * an egg, beans or moi moi, which is how bread is eaten here. It does not get
 * "add vegetables", and it does not get the meat line, because nobody eats a
 * palm-size piece of goat meat with a slice of bread.
 */
const PROTEIN_FIX: Record<string, string> = {
  swallow: DECK,
  rice: DECK,
  pasta: DECK,
  tuber: DECK,
  plantain: DECK,
  cereal: "Add moi moi or akara to slow it down.",
  corn: "Add groundnut or a boiled egg to slow it down.",
  bread: "Eat it with an egg, beans, or moi moi. Never bread on its own.",
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
      const names = sweetDrinks.map((i) => cleanFoodName(i.food.name)).join(", ");
      breakdown.push(
        `${names} is sweet, and sweet drinks make sugar rise very fast.`,
      );
      fixes.push(
        `Take away the ${cleanFoodName(sweetDrinks[0].food.name)}. Instead drink water, or zobo with no sugar, one cup (250ml). Nothing else can fix a sweet drink.`,
      );
    } else {
      const names = sweetFoods.map((i) => cleanFoodName(i.food.name)).join(", ");
      breakdown.push(
        `${names} is very sweet, and sweet foods make sugar rise very fast.`,
      );
      fixes.push(
        `Best to skip the ${cleanFoodName(sweetFoods[0].food.name)}. Nothing else on the plate can make a sweet food like this safe.`,
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
        ? `${cleanFoodName(s.name)} turns to sugar fast, so we have to be careful.`
        : `${cleanFoodName(s.name)} is the main thing to watch here.`,
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
  const hasBeans = items.some((i) => i.food.role === "legume");

  if (hasVeg) {
    score += 1;
    breakdown.push("You added vegetables. Good, they slow the sugar down.");
  }
  if (hasProtein) {
    score += 0.5;
    breakdown.push("You added fish, meat, egg, or beans. That helps too.");
  }

  // Beans are the one food on the Nigerian plate that really slows a starch
  // down, so they lift the plate one band: beans with boiled ripe plantain is
  // "eat with care", not "better to skip". Dietician-reviewed.
  //
  // But beans may NOT rescue a starch that is already red. Ewa ati dodo is
  // usually made with FRIED plantain, and frying is the reason dodo is red in
  // the first place. Beans with dodo stays red, which is also what the
  // Beans and Plantain card says: use boiled or roasted plantain, not fried.
  if (hasBeans && worstStarch && worstStarch.food.baseVerdict !== "red") {
    score += 0.5;
    breakdown.push("The beans slow the sugar down a lot. That helps here.");
  }

  if (worstStarch) {
    if (worstStarch.portion === "half") {
      score += 1;
      breakdown.push(
        `You chose a small size of ${cleanFoodName(worstStarch.food.name)}. That helps a lot.`,
      );
    } else if (worstStarch.portion === "large") {
      score -= 0.5;
      breakdown.push(
        `A large size of ${cleanFoodName(worstStarch.food.name)} makes the sugar rise more.`,
      );
    }
  }

  score = Math.max(0, Math.min(2, score));

  // Stacking rules (co-founder dietitian, 2026-10-08). Both can only ever make
  // a plate WORSE, never better, so they cannot break the asymmetry rule in
  // docs/EVIDENCE.md. Without them, adding akara to rice + yam lifted a red
  // plate to yellow: more food gave a better answer.
  //
  // 1. Two or more starches on one plate is twice the sugar. If any of them is
  //    not green, the plate is red, and nothing else on it can rescue it.
  //    Two green starches together are at best "eat with care".
  const distinctStarches = [...new Map(starches.map((i) => [i.food.id, i])).values()];
  const stackedStarch = distinctStarches.length >= 2;
  if (stackedStarch) {
    const allGreen = distinctStarches.every((i) => i.food.baseVerdict === "green");
    score = allGreen ? Math.min(score, GREEN_AT - 0.25) : 0;
    breakdown.push(
      `${distinctStarches.map((i) => cleanFoodName(i.food.name)).join(" and ")} are ${distinctStarches.length === 2 ? "both" : "all"} heavy foods. Eaten together, they push your sugar up much more.`,
    );
  }

  // 2. "Eat with care" foods add up. Oil, salt and seasoning are yellow for
  //    blood pressure and cholesterol, not for sugar, so they never count.
  const careFoods = [
    ...new Map(
      items
        .filter(
          (i) =>
            i.food.baseVerdict === "yellow" &&
            i.food.role !== "fat" &&
            i.food.role !== "condiment",
        )
        .map((i) => [i.food.id, i]),
    ).values(),
  ];
  //    (Decided with the founder, 2026-10-08.) Two kinds of stacking:
  //    a. TWO yellow foods that both raise sugar (a starch, a fruit, a drink)
  //       are red: boiled yam + kunu, pap + banana.
  //       A yellow body-building or beans food (akara, ewa agoyin, kilishi)
  //       slows the sugar instead, so akara + pap stays yellow.
  //    b. THREE or more yellow foods of any kind are red.
  //    Oil, salt and seasoning still show their own red warning box.
  const SUGAR_ROLES = new Set(["starch", "fruit", "drink"]);
  const sugarCare = careFoods.filter((i) => SUGAR_ROLES.has(i.food.role));
  const stackedSugar = sugarCare.length >= 2;
  const stackedCare = careFoods.length >= 3;
  if (stackedSugar || stackedCare) {
    score = 0;
    // Only one reason line: when the sugar foods are just the starches, the
    // "heavy foods" line above has already said it.
    const onlyStarches = sugarCare.every((i) => i.food.role === "starch");
    if (stackedSugar && !(stackedStarch && onlyStarches)) {
      breakdown.push(
        `${sugarCare.map((i) => cleanFoodName(i.food.name)).join(" and ")} ${sugarCare.length === 2 ? "both" : "all"} raise your sugar. Eaten together, they push it up too much.`,
      );
    } else if (!stackedSugar) {
      breakdown.push(
        `You have ${careFoods.length} foods that need care on one plate. Together they are too much.`,
      );
    }
  }

  const verdict = toVerdict(score);

  // Plain, do-this-now fixes. We only ever suggest adding something that
  // truly goes with the main food. When there is no sensible pairing, we say
  // nothing rather than give an odd suggestion.
  if (verdict !== "green") {
    const mainCategory = worstStarch?.food.category ?? null;

    // A list, not "X or Y": display names already contain "or" ("Garri or
    // Eba"), so "the Garri or Eba or the Fufu or Akpu" could not be read.
    const pickOne = (list: MealItem[]) =>
      `Keep only one of these: ${list.map((i) => cleanFoodName(i.food.name)).join(", ")}. Take the others off your plate.`;
    const sugarIds = new Set(sugarCare.map((i) => i.food.id));
    const starchCovered =
      stackedSugar && distinctStarches.every((i) => sugarIds.has(i.food.id));
    if (stackedStarch && !starchCovered) fixes.push(pickOne(distinctStarches));
    if (stackedSugar) fixes.push(pickOne(sugarCare));
    // After keeping one sugar food, are three or more yellow foods still left?
    const careLeft = careFoods.length - (stackedSugar ? sugarCare.length - 1 : 0);
    if (careLeft >= 3) {
      const others = careFoods.filter((i) => !sugarIds.has(i.food.id));
      const drop = careLeft - 2;
      fixes.push(
        `${stackedSugar ? "Also take" : "Take"} ${["one", "two", "three", "four", "five"][drop - 1] ?? drop} of these off your plate: ${others
          .map((i) => cleanFoodName(i.food.name))
          .join(", ")}. Keep only two foods that need care.`,
      );
    }

    if (worstStarch && worstStarch.portion !== "half") {
      const pg = worstStarch.food.portionGuidance;
      if (worstStarch.food.portionIcon === "avoid") {
        // A food to skip reads badly after "A safe size is". Drop the opening
        // "Best to skip this." so the sentence is not said twice.
        const rest = pg.replace(/^(best to skip this|none)[.,\s]*/i, "");
        fixes.push(
          rest
            ? `Best to skip the ${cleanFoodName(worstStarch.food.name)}. ${rest}`
            : `Best to skip the ${cleanFoodName(worstStarch.food.name)}.`,
        );
      } else {
        fixes.push(
          `Eat less ${cleanFoodName(worstStarch.food.name)}. A safe size is ${lower(pg)}`,
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

  const stacked = verdict === "red" && (stackedStarch || stackedSugar || stackedCare);
  return { verdict, score, locked: false, headline, fixes, breakdown, stacked };
}

/** Preview: would the meal turn green if the starch were made small? */
export function greenPath(items: MealItem[]): MealResult {
  const fixed: MealItem[] = items.map((i) =>
    isStarch(i.food) ? { ...i, portion: "half" as const } : i,
  );
  return scoreMeal(fixed);
}
