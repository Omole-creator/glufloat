/**
 * The three tiers, and the ONE mapping from a Paystack amount to a tier.
 *
 * No "use client" here on purpose: this is read by server routes (the webhook,
 * the claim route) and by client code (lib/account.ts, the pricing UI) alike,
 * so it has to be safe in both. Each tier is a separate FIXED-amount Paystack
 * hosted page, so the kobo amount Paystack reports is an unambiguous way to
 * tell them apart with no new metadata plumbing — see lib/access.ts for the
 * three page URLs.
 */

export type Tier = "basic" | "plus" | "dietitian";

export const TIERS: Tier[] = ["basic", "plus", "dietitian"];

const TIER_RANK: Record<Tier, number> = { basic: 0, plus: 1, dietitian: 2 };

export function tierAtLeast(tier: Tier, min: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

/** Kobo. N1,500 / N2,500 / N4,500. */
export const TIER_AMOUNTS: Record<Tier, number> = {
  basic: 150_000,
  plus: 250_000,
  dietitian: 450_000,
};

/**
 * Which tier a charge belongs to, from the amount Paystack reports. An amount
 * that matches neither the Plus nor the Dietitian page falls back to Basic —
 * deliberately never upward, so an unrecognised amount can never silently
 * grant a higher tier than was actually paid for.
 */
export function tierForAmount(amountKobo: number | null | undefined): Tier {
  if (amountKobo === TIER_AMOUNTS.dietitian) return "dietitian";
  if (amountKobo === TIER_AMOUNTS.plus) return "plus";
  return "basic";
}

export const TIER_LABEL: Record<Tier, string> = {
  basic: "GluFloat",
  plus: "GluFloat Plus",
  dietitian: "GluFloat + Dietitian",
};
