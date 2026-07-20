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
 * The meal AFTER the one happening now, which is what the "eat next" button
 * suggests. At breakfast it points to lunch; at lunch, dinner; in the evening or
 * late at night, tomorrow's breakfast.
 */
export function nextMeal(slot: MealSlot): NamedMeal {
  switch (slot) {
    case "breakfast":
      return "lunch";
    case "lunch":
      return "dinner";
    case "dinner":
    case "late":
      return "breakfast";
  }
}
