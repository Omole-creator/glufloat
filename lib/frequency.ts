import type { Food } from "./types";

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
    return "You can eat this every day";
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
    return "You can eat this every day";
  }

  // Fall back on the colour.
  if (food.baseVerdict === "green") return "You can eat this every day";
  if (food.baseVerdict === "yellow") return "About 2 times a week";
  return "Only once in a while, about once a month";
}
