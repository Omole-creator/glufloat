/**
 * Accounts that are ours, not users: the QA account the test suite signs in
 * as, and the demo accounts for each tier (demo@, demoo@, demooo@). They hold
 * far-future subscriptions so they never lapse, which made /admin count them
 * as paying customers and report monthly revenue nobody paid.
 *
 * Every admin number leaves them out. The accounts themselves are untouched,
 * because scripts/qa.mjs and the tier demos depend on them.
 */
const INTERNAL_DOMAINS = ["@glufloat.com"];

// Team members on personal addresses. Our co-founder dietitian holds a free,
// never-ending Premium (amount 0, no payment row), granted 2026-10-07; she is
// not a customer, so she must not appear as a paying subscriber either.
const INTERNAL_EMAILS = ["fchiamaka91@gmail.com"];

export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return INTERNAL_EMAILS.includes(e) || INTERNAL_DOMAINS.some((d) => e.endsWith(d));
}
