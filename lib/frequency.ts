import type { Food } from "./types";

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
function weeklyFallback(food: Food): string {
  if (food.baseVerdict === "green") return "About 4 times a week";
  if (food.baseVerdict === "yellow") return "About 2 times a week";
  return "Only once in a while, about once a month";
}

/**
 * Turns the curated frequency note into a clear, countable answer.
 * If a food is not for every day, we say the number of times a week.
 */
export function plainFrequency(food: Food): string {
  const f = food.frequency.toLowerCase();

  if (f.includes("never") || f.includes("avoid")) {
    return "Best not to eat this at all";
  }
  if (f.includes("except") || f.includes("emergency") || f.includes("hypo")) {
    return "Only if your sugar drops too low";
  }
  if (f.includes("rare") || f.includes("treat")) {
    return "Only once in a while, like once a month";
  }
  // An explicit count always wins, so the answer stays specific.
  const perWeek = f.match(/(\d+)\s*times?\s*a\s*week/);
  if (perWeek) return `About ${perWeek[1]} times a week`;
  if (f.includes("once a week")) return "About 1 time a week";
  if (
    f.includes("every day") ||
    f.includes("daily") ||
    f.includes("always") ||
    f.includes("regular") ||
    f.includes("excellent") ||
    f.includes("drink plenty")
  ) {
    // Only truly sugar-free foods may be daily; the rest get a weekly cap.
    return canBeEveryday(food)
      ? "You can eat this every day"
      : weeklyFallback(food);
  }
  if (f.includes("a few times a week")) {
    return "About 3 times a week, in a small size";
  }
  if (f.includes("occasional")) {
    return "About 2 times a week";
  }
  if (f.includes("moderate")) {
    return "About 3 times a week";
  }
  if (f.includes("good") || f.includes("decent")) {
    return canBeEveryday(food)
      ? "You can eat this every day"
      : weeklyFallback(food);
  }

  // Fall back on the colour.
  if (food.baseVerdict === "green") {
    return canBeEveryday(food)
      ? "You can eat this every day"
      : weeklyFallback(food);
  }
  if (food.baseVerdict === "yellow") return "About 2 times a week";
  return "Only once in a while, about once a month";
}
