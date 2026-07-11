/**
 * The partner (referral) programme.
 *
 * A dietitian, nurse, pharmacist or doctor gets a link like /r/ada4. Anyone who
 * signs up after clicking it belongs to them, and when that person pays, the
 * partner earns a share of it.
 */

/** The cookie that remembers which partner sent this visitor. First touch. */
export const REF_COOKIE = "gf_ref";

/** How long a partner keeps the credit for a click. A year. */
export const REF_COOKIE_DAYS = 365;

/**
 * 40% of what the customer actually paid, on every renewal, for the first 12
 * payments. After that the customer is fully Glufloat's.
 *
 * These two numbers are ALSO written into the `earn_commission` trigger in
 * supabase/partners-schema.sql, which is what actually creates the money. The
 * copies here are for showing on the admin screen. If you change one, change the
 * other, or the screen will promise something the database does not do.
 */
export const COMMISSION_RATE = 0.4;
export const COMMISSION_CAP = 12;

export const PROFESSIONS = [
  "Dietitian",
  "Nurse",
  "Pharmacist",
  "Doctor",
  "Other",
] as const;

export type Profession = (typeof PROFESSIONS)[number];

export type Partner = {
  id: string;
  seq: number;
  code: string;
  name: string;
  profession: string;
  email: string;
  phone: string | null;
  active: boolean;
  created_at: string;
};

/**
 * The link code: the first name, lowercased, plus the partner's position in the
 * order they were added. The 4th partner ever created, called Ada Okoye, gets
 * "ada4". Two people called Ada never collide, because their numbers differ.
 */
export function partnerCode(fullName: string, seq: number): string {
  const first = fullName
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `${first || "partner"}${seq}`;
}

/** Kobo to naira, the way it is written here. 60000 -> "N600". */
export function naira(kobo: number): string {
  return "N" + Math.round(kobo / 100).toLocaleString();
}
