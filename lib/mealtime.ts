/**
 * What meal is it, right now, on this person's own phone clock.
 *
 * The app greets people by the time of day and points them at the meal they are
 * most likely about to eat, so opening GluFloat feels like it knows their day
 * instead of being a blank search box. All of this is worked out on the device
 * from the local clock. No server, no cost.
 */

export type MealSlot = "breakfast" | "lunch" | "dinner" | "late";
export type NamedMeal = "breakfast" | "lunch" | "dinner";

/** Which meal the current local hour falls in. */
export function currentSlot(now: Date = new Date()): MealSlot {
  const h = now.getHours();
  if (h >= 4 && h <= 10) return "breakfast";
  if (h >= 11 && h <= 15) return "lunch";
  if (h >= 16 && h <= 21) return "dinner";
  return "late";
}

/** The friendly line at the top of the app. */
export function greeting(slot: MealSlot): string {
  switch (slot) {
    case "breakfast":
      return "Good morning. What is for breakfast?";
    case "lunch":
      return "Good afternoon. What is for lunch?";
    case "dinner":
      return "Good evening. What is for dinner?";
    case "late":
      return "Still awake? Check it before you eat.";
  }
}

/**
 * The meal the app presents right now as "your meal for today". It is the meal
 * of the current time (breakfast in the morning, and so on). Late at night the
 * day's meals are done, so it points to tomorrow's breakfast.
 */
export interface TodayMeal {
  meal: NamedMeal;
  when: "today" | "tomorrow";
}

export function todayMeal(slot: MealSlot = currentSlot()): TodayMeal {
  if (slot === "late") return { meal: "breakfast", when: "tomorrow" };
  return { meal: slot, when: "today" };
}

/** "Your breakfast for today", the authoritative heading on the meal card. */
export function todayMealHeading(t: TodayMeal): string {
  return `Your ${t.meal} for ${t.when}`;
}

/** A local-day key (YYYY-MM-DD in the browser's own timezone). Used to make the
 * day's meal stable within a day but different from one day to the next. */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
