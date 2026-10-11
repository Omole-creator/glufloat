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
  if (amountKobo === TIER_AMOUNTS.dietitian || amountKobo === TIER_YEARLY_AMOUNTS.dietitian) return "dietitian";
  if (amountKobo === TIER_AMOUNTS.plus || amountKobo === TIER_YEARLY_AMOUNTS.plus) return "plus";
  return "basic";
}

/**
 * Paying for a whole year: 12 months for the price of 12, less 20%. Each is
 * its own fixed-amount Paystack page (lib/access.ts PAYSTACK_YEARLY_URLS), so
 * the amount alone says both the tier AND that it was a year, exactly like
 * the monthly pages. N14,400 / N24,000 / N43,200.
 */
export const YEARLY_DISCOUNT = 0.2;
export const TIER_YEARLY_AMOUNTS: Record<Tier, number> = {
  basic: 1_440_000,
  plus: 2_400_000,
  dietitian: 4_320_000,
};

export function isYearlyAmount(amountKobo: number | null | undefined): boolean {
  return TIERS.some((t) => TIER_YEARLY_AMOUNTS[t] === amountKobo);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long one payment buys. Anything that is not a yearly amount stays the
 * 30 days it has always been, so an unknown amount can never grant a year.
 */
export function periodMsForAmount(amountKobo: number | null | undefined): number {
  return (isYearlyAmount(amountKobo) ? 365 : 30) * DAY_MS;
}

/** What a subscription is worth per month, for MRR. A year counts as 1/12. */
export function monthlyValue(amountKobo: number | null | undefined): number {
  if (!amountKobo) return 0;
  return isYearlyAmount(amountKobo) ? Math.round(amountKobo / 12) : amountKobo;
}

/** "N14,400" from kobo, the same "N" style used everywhere on the site. */
export function nairaLabel(amountKobo: number): string {
  return `N${Math.round(amountKobo / 100).toLocaleString("en-US")}`;
}

// Display names only. The stored enum value stays "dietitian" (it is already
// live in the database) — only what a person READS changed to "Premium".
export const TIER_LABEL: Record<Tier, string> = {
  basic: "GluFloat",
  plus: "GluFloat Plus",
  dietitian: "GluFloat Premium",
};
