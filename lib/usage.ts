"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Record a product-usage tap, so the admin can see how the app is really used
 * (see supabase/usage-schema.sql). Fire-and-forget: a failed write must never
 * get in the way of what the person is doing.
 */
export type UsageEvent =
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
