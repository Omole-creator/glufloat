"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Record a product-usage tap, so the admin can see how the app is really used
 * (see supabase/usage-schema.sql). Fire-and-forget: a failed write must never
 * get in the way of what the person is doing.
 */
export type UsageEvent =
  | "app_open" // opened /app (see trackAppOpen: at most once every 30 minutes)
  | "meal_reroll" // pressed "show me another food" on the daily meal
  | "food_search" // opened a food from search
  | "meal_logged" // tapped "I ate this" / "I ate this meal"
  | "doctor_report" // made or sent the doctor report
  | "channel_join" // tapped the WhatsApp channel link
  | "check_this_meal"; // tapped "check this meal for full details"

export async function trackUsage(event: UsageEvent): Promise<void> {
  try {
    await createClient().from("usage_events").insert({ event });
  } catch {
    /* never break the app over a metric */
  }
}

/** How long two opens must be apart to count as two (see below). */
const OPEN_GAP_MS = 30 * 60 * 1000;
const OPEN_KEY = "gf_open_last";

/**
 * One real open of the app.
 *
 * This is the number that answers "do people come back before every meal?", so
 * it has to mean an OPEN and not a render: a reload, a back-navigation or a tap
 * between the tools would otherwise each write a row and the answer would look
 * three times better than it is. Two opens inside half an hour are one visit;
 * breakfast, lunch and dinner are hours apart and still count as three.
 *
 * If storage is blocked (private mode) the event is sent anyway, exactly like
 * the blog reader count: slightly high beats an app that looks unopened.
 */
export function trackAppOpen(): void {
  try {
    const last = Number(localStorage.getItem(OPEN_KEY) || 0);
    if (Date.now() - last < OPEN_GAP_MS) return;
    localStorage.setItem(OPEN_KEY, String(Date.now()));
  } catch {
    /* storage blocked: count it rather than lose it */
  }
  void trackUsage("app_open");
}
