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

/**
 * A one-time payment page, not a subscription page. Paystack cannot offer Pay
 * with Transfer or Pay with USSD on a recurring plan (neither channel can be
 * charged again automatically), so a subscription page only ever showed card.
 * The webhook grants 30 days per `charge.success`, so nothing depended on
 * Paystack's own recurring billing.
 */
export const PAYSTACK_URL = "https://paystack.shop/pay/glufloat-monthly";

const K_DISCLAIMER = "gf_disclaimer_ok";
/**
 * The reference of a payment that has not settled yet. Transfer and USSD are
 * asynchronous: the buyer is redirected back before the money lands, so the
 * claim cannot succeed on the first try. We remember the reference on this
 * device and keep claiming it until it clears, even if they close the tab.
 */
const K_PENDING_REF = "gf_pending_ref";

const canStore = () => typeof window !== "undefined";

export function savePendingReference(reference: string): void {
  if (canStore()) localStorage.setItem(K_PENDING_REF, reference);
}

export function pendingReference(): string | null {
  if (!canStore()) return null;
  return localStorage.getItem(K_PENDING_REF);
}

export function clearPendingReference(): void {
  if (canStore()) localStorage.removeItem(K_PENDING_REF);
}

export function disclaimerAccepted(): boolean {
  if (!canStore()) return false;
  return localStorage.getItem(K_DISCLAIMER) === "yes";
}

export function acceptDisclaimer(): void {
  if (canStore()) localStorage.setItem(K_DISCLAIMER, "yes");
}
