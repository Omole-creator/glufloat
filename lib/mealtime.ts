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

/**
 * The hour of day in Nigeria (WAT, GMT+1), NOT the device's own timezone.
 * Everyone here is in Nigeria, and a phone (or a server) set to another timezone
 * must still get the right meal and greeting. WAT has no daylight saving, so a
 * fixed +1 on UTC is always correct.
 */
function watHour(now: Date = new Date()): number {
  return (now.getUTCHours() + 1) % 24;
}

/**
 * Which meal the current Nigerian hour points to.
 *
 * The day breaks at midnight, the same place `localDayKey` breaks it. The small
 * hours used to belong to DINNER (the band ran 17:00 straight through to 04:59),
 * so somebody opening the app at 3am was greeted with "Good evening" and handed
 * a dinner plate, on a day that had already rolled over. Nobody wants dinner at
 * 3am; the next meal they will actually eat is breakfast. Founder's call.
 */
export function currentMeal(now: Date = new Date()): NamedMeal {
  const h = watHour(now);
  if (h <= 10) return "breakfast"; // 00:00 through 10:59
  if (h <= 16) return "lunch"; // 11:00 through 16:59
  return "dinner"; // 17:00 through 23:59
}

/** "Your breakfast for today", the authoritative heading on the meal card. */
export function mealHeading(meal: NamedMeal): string {
  return `Your ${meal} for today`;
}

/**
 * "Good morning / afternoon / evening". DERIVED from currentMeal so the greeting
 * and the meal can never disagree (breakfast → morning, lunch → afternoon,
 * dinner → evening).
 */
export function timeGreeting(now: Date = new Date()): string {
  const meal = currentMeal(now);
  if (meal === "breakfast") return "Good morning";
  if (meal === "lunch") return "Good afternoon";
  return "Good evening";
}

/** "Good afternoon, Ada" (or just "Good afternoon" when no name). */
export function personalGreeting(name: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? `${timeGreeting()}, ${first}` : timeGreeting();
}

/**
 * The "come back later" nudge, tied to the meal-time notifications (Nigerian
 * time): during breakfast it points to lunch at 12pm, during lunch to dinner at
 * 5pm, and in the evening to breakfast at 7am.
 *
 * These three times ARE the push cron (07:00 / 12:00 / 17:00 WAT = 06:00 /
 * 11:00 / 16:00 UTC, see app/api/push/send/route.ts). Change one and you must
 * change the other, or the app promises a reminder that never arrives.
 */
export function checkBackMessage(now: Date = new Date()): string {
  const meal = currentMeal(now);
  if (meal === "breakfast") return "Come back at 12pm to check your lunch.";
  if (meal === "lunch") return "Come back at 5pm to check your dinner.";
  return "Come back at 7am to check your breakfast.";
}

/**
 * A local-day key (YYYY-MM-DD in the browser's own timezone). Used to make the
 * day's meal stable within a day but different from one day to the next.
 */
export function localDayKey(d: Date = new Date()): string {
  // The Nigerian calendar day (GMT+1), so the meal changes at Nigerian midnight.
  const wat = new Date(d.getTime() + 60 * 60 * 1000);
  const y = wat.getUTCFullYear();
  const m = String(wat.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wat.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
