/**
 * What meal is it, right now, on this person's own phone clock.
 *
 * The app tells the person what to eat for the current meal, always "for today":
 * breakfast in the morning, lunch midday, dinner from the evening through the
 * night. There is no "tomorrow" wording, because at any hour there is a sensible
 * meal to show for today. All worked out on the device from the local clock. No
 * server, no cost.
 */

export type NamedMeal = "breakfast" | "lunch" | "dinner";

/** Which meal the current local hour points to. */
export function currentMeal(now: Date = new Date()): NamedMeal {
  const h = now.getHours();
  if (h >= 4 && h <= 10) return "breakfast";
  if (h >= 11 && h <= 16) return "lunch";
  return "dinner"; // 17:00 through 03:59
}

/** "Your breakfast for today", the authoritative heading on the meal card. */
export function mealHeading(meal: NamedMeal): string {
  return `Your ${meal} for today`;
}

/**
 * A local-day key (YYYY-MM-DD in the browser's own timezone). Used to make the
 * day's meal stable within a day but different from one day to the next.
 */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
