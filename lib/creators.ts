/**
 * Creator partners: the rules, pure (no database), so
 * scripts/creator-partners-test.ts can prove every one of them.
 * Server side is lib/creatorsServer.ts. Terms are the founder's (2026-10-22).
 *
 * Safe on client and server: no "use client", no I/O.
 */
import { TIER_AMOUNTS, type Tier } from "@/lib/pricing";

/** 20% off each of the first 3 MONTHLY payments. Yearly already has its own 20% off. */
export const CREATOR_DISCOUNT = 0.2;
export const CREATOR_DISCOUNT_PAYMENTS = 3;

/** What a monthly plan costs with a creator's code: N1,200 / N2,000 / N3,600. */
export const TIER_CREATOR_AMOUNTS: Record<Tier, number> = {
  basic: Math.round(TIER_AMOUNTS.basic * (1 - CREATOR_DISCOUNT)),
  plus: Math.round(TIER_AMOUNTS.plus * (1 - CREATOR_DISCOUNT)),
  dietitian: Math.round(TIER_AMOUNTS.dietitian * (1 - CREATOR_DISCOUNT)),
};

export const CREATOR_RATE = 0.4;
export const CREATOR_RATE_HIGH = 0.5;
/** Once this many of a creator's people have paid, NEW payments earn the higher rate. */
export const CREATOR_HIGH_AFTER = 50;
/** A creator earns on a person for 12 months from that person's first payment. */
export const CREATOR_WINDOW_DAYS = 365;
/** Only earnings at least this old are paid out (refund hold). */
export const CREATOR_HOLD_DAYS = 14;
/** Paid by this day of each month. */
export const CREATOR_PAY_DAY = 10;

const DAY_MS = 86_400_000;

/**
 * Words a code can never be, because glufloat.com/<word> is already one of
 * our own pages or files. scripts/creator-partners-test.ts fails if a new
 * top-level page or public file is missing from this list.
 */
export const RESERVED_CODES = new Set(
  [
    // pages and routes under app/
    "about", "account", "admin", "agent", "api", "app", "blog", "c", "contact", "creator", "d", "dietitians",
    "disclaimer", "doctors", "forgot-password", "hospital", "hospitals", "i", "inbox", "j", "p", "privacy", "r",
    "reset-password", "robots", "signin", "signup", "sitemap", "terms", "trial", "unlock", "favicon",
    // files and folders under public/
    "creators", "img", "llms", "logo-full", "logo-mark", "sw", "icon", "apple-touch-icon",
    // words that would read as ours
    "glufloat", "help", "support", "login", "logout", "pricing", "pay", "home", "new", "free", "test", "demo",
    "staff", "team", "partner", "partners", "dashboard", "settings", "_next",
  ].map((w) => normalizeCode(w)),
);

/** "faith ", "Faith" and "FAITH" are the same code. Letters and digits only. */
export function normalizeCode(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** A code we would accept for a creator: 3 to 20 letters/digits, starting with a letter, not ours. */
export function validCode(code: string): boolean {
  return /^[A-Z][A-Z0-9]{2,19}$/.test(code) && !RESERVED_CODES.has(code);
}

/**
 * The code a new creator gets from their name: the first name ("Faith Eze" →
 * FAITH), skipping a title. If it is taken, the first letter of the surname
 * is added (FAITHE), then a number (FAITH2...). `taken` is the set of codes
 * already in use.
 */
export function codeFromName(name: string, taken: Set<string>): string {
  const words = String(name ?? "")
    .replace(/^(dr|dtn|mr|mrs|ms|miss|prof|pharm|nurse|chef)\.?\s+/i, "")
    .split(/\s+/)
    .map((w) => normalizeCode(w))
    .filter(Boolean);
  let base = words[0] ?? "";
  if (!/^[A-Z]/.test(base)) base = `C${base}`;
  base = base.slice(0, 16);
  if (base.length < 3) base = (base + "GLU").slice(0, 3);
  const ok = (c: string) => validCode(c) && !taken.has(c);
  if (ok(base)) return base;
  const surname = words[1]?.[0];
  if (surname && ok(base + surname)) return base + surname;
  for (let n = 2; n < 1000; n++) if (ok(`${base}${n}`)) return `${base}${n}`;
  return `${base}${Date.now() % 100000}`;
}

/**
 * The discounted price a person pays for this tier, or null when they get no
 * discount. Only monthly plans, and only the first 3 payments.
 */
export function creatorPrice(tier: Tier, paymentsSoFar: number): number | null {
  if (paymentsSoFar >= CREATOR_DISCOUNT_PAYMENTS) return null;
  return TIER_CREATOR_AMOUNTS[tier];
}

/** Is this one of the creator-discount amounts? (lib/pricing.ts uses it to read the tier.) */
export function isCreatorAmount(amountKobo: number | null | undefined): boolean {
  return Object.values(TIER_CREATOR_AMOUNTS).includes(amountKobo as number);
}

/** The creator's rate on a NEW payment, given how many of their people had paid before it. */
export function creatorRate(payersBefore: number): number {
  return payersBefore >= CREATOR_HIGH_AFTER ? CREATOR_RATE_HIGH : CREATOR_RATE;
}

/** Is this payment still inside the 12 months from the person's first payment? */
export function creatorWindowOpen(firstPaidAt: Date | null, paidAt: Date): boolean {
  if (!firstPaidAt) return true;
  return paidAt.getTime() - firstPaidAt.getTime() < CREATOR_WINDOW_DAYS * DAY_MS;
}

/** The creator's share in kobo: rate × (what was paid − Paystack's fee), rounded down. */
export function creatorShare(amountKobo: number, feeKobo: number, rate: number): number {
  const received = Math.max(0, amountKobo - feeKobo);
  return Math.floor(received * rate);
}

/** Can this earning be paid out now? At least 14 days old. */
export function payableNow(earnedAt: string | Date, now: number = Date.now()): boolean {
  return now - new Date(earnedAt).getTime() >= CREATOR_HOLD_DAYS * DAY_MS;
}

/** The next payout day (the 10th), from `now`, as a Date in local time. */
export function nextPayDay(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), CREATOR_PAY_DAY);
  if (now.getDate() > CREATOR_PAY_DAY) d.setMonth(d.getMonth() + 1);
  return d;
}

/** The link a creator shares: glufloat.com/faith (lower case reads friendlier). */
export function creatorLink(siteUrl: string, code: string): string {
  return `${siteUrl.replace(/^https?:\/\/(www\.)?/, "")}/${code.toLowerCase()}`;
}

/** Talking points sent with the code (founder's terms: no cure claims). */
export function talkingPoints(code: string, link: string): string {
  return [
    `Your code: ${code}`,
    `Your link: ${link}`,
    "",
    "Things you can say:",
    "- Glufloat tells you what to eat at every meal, with the Nigerian food you already eat.",
    "- It tells you how much to eat, what to eat it with, and how often.",
    "- You can check any food or your whole plate before you eat it.",
    "- You can save your sugar tests next to your meals and show your doctor a report.",
    `- Start with a free week, no card needed. Then use my code ${code} for 20% off your first 3 months.`,
    "",
    "Please don't say:",
    "- That Glufloat cures diabetes or reverses it.",
    "- That anyone can stop or change their medicine because of Glufloat.",
    '- A number for how much it lowers sugar (like "it lowers sugar by 50").',
    "- That Glufloat is a doctor. It gives food guidance and does not replace a doctor or medicine.",
    "",
    "If we ask you to take a post down, please do it within 48 hours.",
  ].join("\n");
}
