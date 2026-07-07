/**
 * MVP access gating (client-side, localStorage).
 *
 * The 3-day free trial runs on the visitor's device: tapping "Start my
 * free trial" stamps a start date and unlocks everything for 3 days, no
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
export const TRIAL_DAYS = 3;
export const MONTH_DAYS = 30;
/** Start reminding this many days before the paid month ends. */
export const RENEW_WARN_DAYS = 5;

/** Codes accepted by /unlock. Keep in sync with the Nestuge delivery message. */
const ACCESS_CODES = ["GLU-GREEN-2026", "GLUFLOAT-MEMBER"];

const K_CHECKS = "gf_checks";
const K_ACCESS = "gf_access";
const K_ACCESS_DATE = "gf_access_date";
const K_TRIAL = "gf_trial_start";
const K_DISCLAIMER = "gf_disclaimer_ok";

const canStore = () => typeof window !== "undefined";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days between two moments, in the user's local time.
 * The same start day is 0; the next calendar day is 1, and so on. This makes
 * "days left" drop each new day (at local midnight), which is how people read
 * a countdown, rather than only after a full 24 hours from the start moment.
 */
function calendarDaysBetween(startMs: number, nowMs: number): number {
  const s = new Date(startMs);
  s.setHours(0, 0, 0, 0);
  const n = new Date(nowMs);
  n.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((n.getTime() - s.getTime()) / DAY_MS));
}

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
  if (ok && canStore()) {
    localStorage.setItem(K_ACCESS, "yes");
    // Each unlock (including a renewal) restarts the 30-day clock.
    localStorage.setItem(K_ACCESS_DATE, String(Date.now()));
  }
  return ok;
}

export type RenewalState =
  | { status: "none" }
  | { status: "ok"; daysLeft: number }
  | { status: "due"; daysLeft: number }
  | { status: "over" };

/** Where a paid member is in their 30-day month. */
export function getRenewalState(): RenewalState {
  if (!canStore() || !hasAccess()) return { status: "none" };
  const raw = localStorage.getItem(K_ACCESS_DATE);
  if (!raw) return { status: "none" };
  const start = parseInt(raw, 10);
  if (!start) return { status: "none" };
  const daysLeft = MONTH_DAYS - calendarDaysBetween(start, Date.now());
  if (daysLeft <= 0) return { status: "over" };
  if (daysLeft <= RENEW_WARN_DAYS) return { status: "due", daysLeft };
  return { status: "ok", daysLeft };
}

/* ---------- 3-day trial (device-based, no card) ---------- */

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
  // Count by calendar day: the start day shows 3 left, the next day 6, and so
  // on. The trial covers 3 calendar days and ends at the start of the 4th.
  const daysLeft = TRIAL_DAYS - calendarDaysBetween(start, Date.now());
  if (daysLeft > 0) return { status: "active", daysLeft };
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
