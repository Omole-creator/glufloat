/**
 * Leftovers from the old device-based gating, kept only for what is still used.
 *
 * Access is no longer a localStorage fact. It is an account fact: see
 * `lib/account.ts`, which reads the Supabase session, the `profiles.trial_start`
 * stamp, and the `subscriptions` row written by the Paystack webhook. The free
 * check allowance, the unlock codes, and the on-device trial are all gone.
 *
 * What remains here is the payment link and the disclaimer flag, which really is
 * a per-device preference and has nothing to do with access.
 */

export const PAYSTACK_URL = "https://paystack.shop/pay/glufloat";

const K_DISCLAIMER = "gf_disclaimer_ok";

const canStore = () => typeof window !== "undefined";

export function disclaimerAccepted(): boolean {
  if (!canStore()) return false;
  return localStorage.getItem(K_DISCLAIMER) === "yes";
}

export function acceptDisclaimer(): void {
  if (canStore()) localStorage.setItem(K_DISCLAIMER, "yes");
}
