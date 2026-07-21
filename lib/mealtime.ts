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

/** Which meal the current Nigerian hour points to. */
export function currentMeal(now: Date = new Date()): NamedMeal {
  const h = watHour(now);
  if (h >= 4 && h <= 10) return "breakfast";
  if (h >= 11 && h <= 16) return "lunch";
  return "dinner"; // 17:00 through 03:59
}

/** "Your breakfast for today", the authoritative heading on the meal card. */
export function mealHeading(meal: NamedMeal): string {
  return `Your ${meal} for today`;
}

/** "Good morning / afternoon / evening", by the Nigerian clock (GMT+1). */
export function timeGreeting(now: Date = new Date()): string {
  const h = watHour(now);
  if (h >= 5 && h <= 11) return "Good morning";
  if (h >= 12 && h <= 16) return "Good afternoon";
  return "Good evening";
}

/** "Good afternoon, Ada" (or just "Good afternoon" when no name). */
export function personalGreeting(name: string | null): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? `${timeGreeting()}, ${first}` : timeGreeting();
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
