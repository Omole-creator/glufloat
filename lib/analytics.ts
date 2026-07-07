import { track } from "@vercel/analytics";

/**
 * Lightweight usage events, visible in the Vercel Analytics dashboard.
 * This is how you can see people using the site during the free trial,
 * even though nobody signs up. It counts actions, not identities.
 */
export const events = {
  trialStarted: (props?: Record<string, string>) =>
    safeTrack("trial_started", props),
  foodChecked: (food: string) => safeTrack("food_checked", { food }),
  mealBuilt: (verdict: string) => safeTrack("meal_built", { verdict }),
  paywallHit: (where: string) => safeTrack("paywall_hit", { where }),
  unlocked: () => safeTrack("access_unlocked"),
};

function safeTrack(name: string, props?: Record<string, string>) {
  try {
    track(name, props);
  } catch {
    /* analytics must never break the app */
  }
}
