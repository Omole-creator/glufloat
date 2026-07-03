/**
 * MVP access gating (client-side, localStorage).
 *
 * Payment and the 7-day trial run on Nestuge (nestuge.com/glufloat).
 * After a buyer pays, Nestuge's post-purchase delivery sends them to
 * /unlock?code=<ACCESS_CODE>, which flips the access flag on their device.
 *
 * This is link-based MVP gating, not per-user auth. Real accounts and
 * server-side subscription checks arrive in Phase 2.
 */

export const NESTUGE_URL = "https://nestuge.com/glufloat";
export const FREE_LIMIT = 3;

/** Codes accepted by /unlock. Keep in sync with the Nestuge delivery message. */
const ACCESS_CODES = ["GLU-GREEN-2026", "GLUFLOAT-MEMBER"];

const K_CHECKS = "gf_checks";
const K_ACCESS = "gf_access";
const K_DISCLAIMER = "gf_disclaimer_ok";

const canStore = () => typeof window !== "undefined";

export function getChecksUsed(): number {
  if (!canStore()) return 0;
  return parseInt(localStorage.getItem(K_CHECKS) ?? "0", 10) || 0;
}

export function recordCheck(): number {
  if (!canStore()) return 0;
  const n = getChecksUsed() + 1;
  localStorage.setItem(K_CHECKS, String(n));
  return n;
}

export function hasAccess(): boolean {
  if (!canStore()) return false;
  return localStorage.getItem(K_ACCESS) === "yes";
}

export function tryUnlock(code: string): boolean {
  const ok = ACCESS_CODES.includes(code.trim().toUpperCase());
  if (ok && canStore()) localStorage.setItem(K_ACCESS, "yes");
  return ok;
}

export function freeChecksLeft(): number {
  return Math.max(0, FREE_LIMIT - getChecksUsed());
}

export function isGated(): boolean {
  return !hasAccess() && freeChecksLeft() <= 0;
}

export function disclaimerAccepted(): boolean {
  if (!canStore()) return false;
  return localStorage.getItem(K_DISCLAIMER) === "yes";
}

export function acceptDisclaimer(): void {
  if (canStore()) localStorage.setItem(K_DISCLAIMER, "yes");
}
