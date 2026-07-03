/**
 * MVP access gating (client-side, localStorage).
 *
 * The 7-day free trial runs on the visitor's device: tapping "Start my
 * free trial" stamps a start date and unlocks everything for 7 days, no
 * card needed (Nestuge does not support pre-subscription trials).
 *
 * When the trial ends, the paywall points to Nestuge
 * (nestuge.com/glufloat) for the N1,500/month subscription. After a buyer
 * pays, Nestuge's post-purchase delivery sends them to
 * /unlock?code=<ACCESS_CODE>, which flips the paid-access flag on their
 * device.
 *
 * This is link-based MVP gating, not per-user auth. Real accounts and
 * server-side subscription checks arrive in Phase 2.
 */

export const NESTUGE_URL = "https://nestuge.com/glufloat";
export const FREE_LIMIT = 3;
export const TRIAL_DAYS = 7;

/** Codes accepted by /unlock. Keep in sync with the Nestuge delivery message. */
const ACCESS_CODES = ["GLU-GREEN-2026", "GLUFLOAT-MEMBER"];

const K_CHECKS = "gf_checks";
const K_ACCESS = "gf_access";
const K_TRIAL = "gf_trial_start";
const K_DISCLAIMER = "gf_disclaimer_ok";

const canStore = () => typeof window !== "undefined";
const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------- free checks ---------- */

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

export function freeChecksLeft(): number {
  return Math.max(0, FREE_LIMIT - getChecksUsed());
}

/* ---------- paid access ---------- */

export function hasAccess(): boolean {
  if (!canStore()) return false;
  return localStorage.getItem(K_ACCESS) === "yes";
}

export function tryUnlock(code: string): boolean {
  const ok = ACCESS_CODES.includes(code.trim().toUpperCase());
  if (ok && canStore()) localStorage.setItem(K_ACCESS, "yes");
  return ok;
}

/* ---------- 7-day trial (device-based, no card) ---------- */

export type TrialState =
  | { status: "none" }
  | { status: "active"; daysLeft: number }
  | { status: "expired" };

export function getTrialState(): TrialState {
  if (!canStore()) return { status: "none" };
  const raw = localStorage.getItem(K_TRIAL);
  if (!raw) return { status: "none" };
  const start = parseInt(raw, 10);
  if (!start) return { status: "none" };
  const elapsed = Date.now() - start;
  if (elapsed < TRIAL_DAYS * DAY_MS) {
    return {
      status: "active",
      daysLeft: Math.max(1, Math.ceil((TRIAL_DAYS * DAY_MS - elapsed) / DAY_MS)),
    };
  }
  return { status: "expired" };
}

export function startTrial(): TrialState {
  if (!canStore()) return { status: "none" };
  if (!localStorage.getItem(K_TRIAL)) {
    localStorage.setItem(K_TRIAL, String(Date.now()));
  }
  return getTrialState();
}

/* ---------- combined gate ---------- */

/** Paid member or on an active trial: everything is open. */
export function fullAccess(): boolean {
  return hasAccess() || getTrialState().status === "active";
}

/** Search gate: paid/trial users are never gated; others get FREE_LIMIT checks. */
export function isGated(): boolean {
  return !fullAccess() && freeChecksLeft() <= 0;
}

/* ---------- disclaimer ---------- */

export function disclaimerAccepted(): boolean {
  if (!canStore()) return false;
  return localStorage.getItem(K_DISCLAIMER) === "yes";
}

export function acceptDisclaimer(): void {
  if (canStore()) localStorage.setItem(K_DISCLAIMER, "yes");
}
