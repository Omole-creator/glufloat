import type { Food, MealItem } from "./types";

/**
 * Foods that may safely be eaten every day. Per dietician guidance: if a food
 * carries any form of sugar or starch, it is NOT a daily food, even when it is
 * green. So "every day" is reserved for sugar-free foods only: non-starchy
 * vegetables, green vegetable soups, plain proteins, healthy fats and
 * condiments, and plain water or unsweetened low-GI drinks. Everything else
 * (legumes, fruit, tubers, dairy, sweets, grains) is capped to a weekly count.
 */
function canBeEveryday(food: Food): boolean {
  if (food.baseVerdict !== "green") return false;
  if (food.role === "vegetable" || food.role === "soup") return true;
  if (
    food.role === "protein" ||
    food.role === "fat" ||
    food.role === "condiment"
  ) {
    return true;
  }
  if (food.role === "drink" && food.gi === "low") return true; // water, unsweetened
  return false;
}

/** A specific weekly answer for a food that may not be daily. Never vague. */
function weeklyFallback(food: Food): number {
  if (food.baseVerdict === "green") return 4;
  if (food.baseVerdict === "yellow") return 2;
  return 0; // once a month
}

/**
 * How often, as a number you can compare.
 *   tier 0 never | 1 only for a sugar crash | 2 once a month
 *   tier 3 weekly, `perWeek` times | 4 every day
 *
 * `scripts/frequency-numbers.mjs` writes one of five exact sentences into
 * `food.frequency`, so this normally just reads the number back out. The looser
 * branches below are the net for a food added later by hand.
 */
export function freqRank(food: Food): { tier: number; perWeek: number } {
  // A sweet drink or pure sweet food locks a meal red in verdictEngine, and
  // nothing on the plate can fix it. The frequency must never disagree.
  const isSweetDrink = food.role === "drink" && food.gi === "high";
  const isSweetFood = food.role === "sugar";

  const f = food.frequency.toLowerCase();

  if (f.startsWith("never, except") || f.includes("hypo") || f.includes("emergency")) {
    return { tier: 1, perWeek: 0 };
  }
  if (f.startsWith("never")) return { tier: 0, perWeek: 0 };
  if (f.includes("a month") || f.includes("rare") || f.includes("treat")) {
    return { tier: 2, perWeek: 0 };
  }

  const perWeek = f.match(/(\d+)\s*times?\s*a\s*week/);
  if (perWeek) return { tier: 3, perWeek: Number(perWeek[1]) };

  if (f.includes("every day") || f.includes("daily")) {
    if (canBeEveryday(food)) return { tier: 4, perWeek: 7 };
    const n = weeklyFallback(food);
    return n === 0 ? { tier: 2, perWeek: 0 } : { tier: 3, perWeek: n };
  }

  if (isSweetDrink || isSweetFood) return { tier: 0, perWeek: 0 };

  const n = weeklyFallback(food);
  return n === 0 ? { tier: 2, perWeek: 0 } : { tier: 3, perWeek: n };
}

/** Turns the rank into the sentence the user reads. */
function say(food: Food, rank: { tier: number; perWeek: number }): string {
  const verb = food.role === "drink" ? "drink" : "eat";
  if (rank.tier === 0) return `Best not to ${verb} this at all`;
  if (rank.tier === 1) return "Only if your sugar drops too low";
  if (rank.tier === 2) return "About 1 time a month";
  if (rank.tier === 4) return `You can ${verb} this every day`;
  return `About ${rank.perWeek} times a week`;
}

/** A clear, countable answer for one food. */
export function plainFrequency(food: Food): string {
  return say(food, freqRank(food));
}

/** Is a stricter than b? */
function stricter(a: { tier: number; perWeek: number }, b: { tier: number; perWeek: number }) {
  return a.tier !== b.tier ? a.tier < b.tier : a.perWeek < b.perWeek;
}

/** "about 2 times a week", "every day", "about 1 time a month", "at all". */
function howOftenPhrase(rank: { tier: number; perWeek: number }): string {
  if (rank.tier === 0) return "not at all";
  if (rank.tier === 1) return "only if your sugar drops too low";
  if (rank.tier === 2) return "about 1 time a month";
  if (rank.tier === 4) return "every day";
  return `about ${rank.perWeek} times a week`;
}

/**
 * One answer for the whole plate: the strictest food on it decides.
 *
 * `reason` must say what the food is holding the meal back *from*, in a real
 * number. "The white rice is what holds it back" tells nobody anything; "the
 * white rice is the reason, without it you could eat the rest about 4 times a
 * week" does. We get that number by re-scoring the plate with the strictest
 * food taken off it.
 */
export function mealFrequency(
  items: MealItem[],
): { text: string; reason: string | null } | null {
  if (items.length === 0) return null;

  const worstItem = items.reduce((worst, i) =>
    stricter(freqRank(i.food), freqRank(worst.food)) ? i : worst,
  );
  const strictest = worstItem.food;
  const rank = freqRank(strictest);

  const text =
    rank.tier === 1
      ? "Only eat this meal if your sugar drops too low."
      : rank.tier === 0
        ? "Best not to eat this meal at all."
        : `You can eat this meal ${howOftenPhrase(rank)}.`;

  // Nothing to blame when the whole plate is a daily plate, or when the meal is
  // one food and its own card already says the same thing.
  if (items.length === 1 || rank.tier === 4) return { text, reason: null };

  const rest = items.filter((i) => i.food.id !== strictest.id);
  if (rest.length === 0) return { text, reason: null };

  const restRank = rest
    .map((i) => freqRank(i.food))
    .reduce((worst, r) => (stricter(r, worst) ? r : worst));

  // If the rest is no better, no single food is to blame.
  if (!stricter(rank, restRank)) return { text, reason: null };

  const reason =
    rank.tier === 0
      ? `The ${strictest.name} is the reason. Nothing else on the plate can make it safe.`
      : `The ${strictest.name} is the reason. Without it, you could eat the rest ${howOftenPhrase(restRank)}.`;

  return { text, reason };
}
