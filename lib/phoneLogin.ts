import { normalizePhone } from "@/lib/phone";

/**
 * Logging in with a phone number, for hospital patients who have no email
 * (founder's decision, 2026-10-12: phone + password, the hospital resets a
 * forgotten password).
 *
 * Supabase accounts are keyed by email, and turning on Supabase's own phone
 * login needs a paid SMS provider. So a phone-only account is given a stand-in
 * address made from the number, `08132097317@phone.glufloat.com`. It is never
 * mailed: email confirmation is off, Mailyte skips it (lib/mailyte.ts), and
 * /forgot-password refuses it.
 *
 * These accounts are only ever made on the server (/api/hospital/join), never
 * through the public sign-up form, which refuses the domain.
 *
 * Pure: no "use client", so server routes and tests import it too.
 */
export const PHONE_LOGIN_DOMAIN = "phone.glufloat.com";

export function phoneLoginEmail(phone: string): string {
  return `${normalizePhone(phone)}@${PHONE_LOGIN_DOMAIN}`;
}

export function isPhoneLoginEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(`@${PHONE_LOGIN_DOMAIN}`);
}

/** Did they type a phone number (not an email) into the login box? */
export function looksLikePhone(input: string): boolean {
  const t = input.trim();
  if (!t || t.includes("@")) return false;
  if (!/^[+\d\s()-]+$/.test(t)) return false;
  return t.replace(/\D/g, "").length >= 10;
}
