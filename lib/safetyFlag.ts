import { HIGH_MGDL, LOW_MGDL, formatBoth, readingWhen, type Reading } from "@/lib/glucose";
import { mealTestFor } from "@/lib/mealResponse";

/**
 * The red flag a patient's doctor or dietitian sees on the hospital list and
 * on the patient's page (founder, 2026-10-14). CLINICIANS ONLY: the patient's
 * own app never grades a number, and still only gives its referral line
 * (dangerLine in lib/glucose.ts, the same 70 and 300).
 *
 * Only readings that need a person to look soon, never an ordinary meal rise:
 *   1. any test under 70 mg/dL (3.9 mmol/L),
 *   2. any test over 300 mg/dL (16.7 mmol/L),
 *   3. a test after a meal that is 30 or more BELOW that meal's before-meal
 *      test and under 100 (a drop, often from sulfonylureas like
 *      glibenclamide).
 * In the last FLAG_DAYS days, so it clears on its own once readings settle.
 * "Mark as seen" (hospital_patients.safety_seen_at) hides every test taken
 * up to that moment, for the whole hospital; any NEWER one flags again.
 *
 * Each line states the number, the time, and which rule it crossed. It never
 * names a cause, and never says what to do: the clinician decides.
 *
 * Pure, so scripts/safety-flag-test.ts runs it with no server.
 */

export const FLAG_DAYS = 14;
/** A drop at least this big after a meal, ending under DROP_END_MGDL. */
export const DROP_MGDL = 30;
export const DROP_END_MGDL = 100;

const DAY_MS = 86400000;

export type SafetyKind = "low" | "high" | "drop";

export type SafetyEvent = {
  kind: SafetyKind;
  mgdl: number;
  takenAt: string;
  /** For a drop: the before-meal test it is compared with. */
  beforeMgdl?: number;
};

export function safetyEvents(readings: Reading[], now = new Date(), seenAt: string | null = null): SafetyEvent[] {
  const seen = seenAt ? new Date(seenAt).getTime() : NaN;
  const since = Math.max(now.getTime() - FLAG_DAYS * DAY_MS, Number.isFinite(seen) ? seen + 1 : -Infinity);
  const recent = readings.filter((r) => {
    const t = new Date(r.takenAt).getTime();
    return Number.isFinite(t) && t >= since && t <= now.getTime() + 60000 && Number.isFinite(r.mgdl);
  });

  // Before-meal tests by meal, so an after-meal test can be compared with its own.
  const before = new Map<number, Reading[]>();
  for (const r of recent) {
    if (r.context === "before_meal" && r.mealCheckId != null) {
      before.set(r.mealCheckId, [...(before.get(r.mealCheckId) ?? []), r]);
    }
  }

  const out: SafetyEvent[] = [];
  for (const r of recent) {
    if (r.mgdl < LOW_MGDL) {
      out.push({ kind: "low", mgdl: r.mgdl, takenAt: r.takenAt });
      continue;
    }
    if (r.mgdl > HIGH_MGDL) {
      out.push({ kind: "high", mgdl: r.mgdl, takenAt: r.takenAt });
      continue;
    }
    if (r.context === "before_meal" || r.mealCheckId == null) continue;
    // The latest before-meal test taken before this one, for the same meal.
    const prior = (before.get(r.mealCheckId) ?? [])
      .filter((b) => b.takenAt < r.takenAt)
      .sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
    if (prior && r.mgdl < DROP_END_MGDL && prior.mgdl - r.mgdl >= DROP_MGDL) {
      out.push({ kind: "drop", mgdl: r.mgdl, takenAt: r.takenAt, beforeMgdl: prior.mgdl });
    }
  }
  // Newest first: the one to look at.
  return out.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

/** One plain line per event, for the patient page. Numbers and time, no verdict. */
export function safetyLine(e: SafetyEvent): string {
  const when = readingWhen(e.takenAt);
  if (e.kind === "low") return `${when}: ${formatBoth(e.mgdl)}. Under 70.`;
  if (e.kind === "high") return `${when}: ${formatBoth(e.mgdl)}. Over 300.`;
  return `${when}: ${formatBoth(e.mgdl)} after a meal, down from ${formatBoth(e.beforeMgdl as number)} before it.`;
}

/** The short badge on the patient list: the newest event. */
export function safetyBadge(events: SafetyEvent[]): string | null {
  if (events.length === 0) return null;
  const e = events[0];
  const label = e.kind === "low" ? "Under 70" : e.kind === "high" ? "Over 300" : "Dropped after a meal";
  return events.length > 1 ? `${label} + ${events.length - 1} more` : label;
}

/* ------------------------------------------------------------------------ */
/* The two amber flags ("worth a look", never blinking). Founder, 2026-10-14. */
/* ------------------------------------------------------------------------ */

/** Before-meal target when the clinician has not set one (ADA, older adults). */
export const DEFAULT_BEFORE_TARGET = 150;
/** The clinician may set a target between these. */
export const TARGET_MIN = 80;
export const TARGET_MAX = 250;
/** Before-meal flag: at least this many before-meal tests in BEFORE_DAYS. */
export const BEFORE_MIN_TESTS = 4;
export const BEFORE_DAYS = 30;

export type BeforeFlag = { total: number; above: number; target: number };

export function validTarget(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= TARGET_MIN && n <= TARGET_MAX ? n : null;
}

/**
 * Most of the patient's before-meal tests sit above THEIR target (set by
 * their clinician, DEFAULT_BEFORE_TARGET until then). Any meal. When sugar
 * starts high, every meal ends high, so this points the clinician at the
 * starting sugar (often the medicine) rather than at the food.
 * More than half of at least BEFORE_MIN_TESTS, in the last BEFORE_DAYS days.
 */
export function beforeMealFlag(readings: Reading[], target: number | null | undefined, now = new Date()): BeforeFlag | null {
  const t = validTarget(target) ?? DEFAULT_BEFORE_TARGET;
  const since = now.getTime() - BEFORE_DAYS * DAY_MS;
  const before = readings.filter((r) => r.context === "before_meal" && new Date(r.takenAt).getTime() >= since);
  if (before.length < BEFORE_MIN_TESTS) return null;
  const above = before.filter((r) => r.mgdl > t).length;
  return above * 2 > before.length ? { total: before.length, above, target: t } : null;
}

export function beforeLine(f: BeforeFlag, firstName: string): string {
  return `${f.above} of ${f.total} before-meal tests in the last ${BEFORE_DAYS} days were above ${formatBoth(f.target)}, the before-meal target for ${firstName}. When sugar starts high, the after-meal number starts high too.`;
}

/** Meal pattern flag: the same plate, PATTERN_TESTS complete meal tests, all high. */
export const PATTERN_TESTS = 3;
export const PATTERN_DAYS = 60;
export const PATTERN_AFTER_MGDL = 180;
export const PATTERN_RISE_MGDL = 60;

export type PatternMeal = {
  id: number;
  kind: "single" | "meal";
  label: string;
  checkedAt: string;
  startedAt: string | null;
  foodIds: string[] | null;
};

export type PatternFlag = {
  label: string;
  /** Oldest first. */
  tests: { before: number; after: number; at: string }[];
};

/**
 * The same food or plate (same food ids in any order; the label when a meal
 * has none), whose latest PATTERN_TESTS complete meal tests in the last
 * PATTERN_DAYS days are ALL at PATTERN_AFTER_MGDL or more 2 hours after AND up
 * by PATTERN_RISE_MGDL or more. "Complete" is the app's own rule
 * (mealTestFor: both tests, the second 90 to 180 minutes after).
 * Shows the numbers; never says the food caused them.
 */
export function mealPatternFlags(meals: PatternMeal[], readings: Reading[], now = new Date()): PatternFlag[] {
  const since = now.getTime() - PATTERN_DAYS * DAY_MS;
  const byMeal = new Map<number, Reading[]>();
  for (const r of readings) {
    if (r.mealCheckId != null) byMeal.set(r.mealCheckId, [...(byMeal.get(r.mealCheckId) ?? []), r]);
  }
  const groups = new Map<string, { label: string; tests: { before: number; after: number; at: string }[] }>();
  for (const m of meals) {
    if (new Date(m.startedAt ?? m.checkedAt).getTime() < since) continue;
    const rs = byMeal.get(m.id) ?? [];
    const t = mealTestFor({
      id: m.id,
      kind: m.kind,
      label: m.label,
      checkedAt: m.checkedAt,
      startedAt: m.startedAt,
      before: rs.filter((r) => r.context === "before_meal"),
      after: rs.filter((r) => r.context !== "before_meal"),
    });
    if (!t.complete || !t.before || !t.after) continue;
    const key = m.foodIds && m.foodIds.length ? [...m.foodIds].sort().join("+") : m.label.trim().toLowerCase();
    const g = groups.get(key) ?? { label: m.label, tests: [] };
    g.tests.push({ before: t.before.mgdl, after: t.after.mgdl, at: t.mealTime });
    groups.set(key, g);
  }
  const out: PatternFlag[] = [];
  for (const g of groups.values()) {
    const latest = g.tests.sort((a, b) => b.at.localeCompare(a.at)).slice(0, PATTERN_TESTS);
    if (latest.length < PATTERN_TESTS) continue;
    if (latest.every((x) => x.after >= PATTERN_AFTER_MGDL && x.after - x.before >= PATTERN_RISE_MGDL)) {
      out.push({ label: g.label, tests: latest.reverse() });
    }
  }
  return out;
}

export function patternLine(f: PatternFlag, label = f.label): string {
  const nums = f.tests.map((x) => `${Math.round(x.before)} to ${Math.round(x.after)}`).join(", ");
  return `${label}: the last ${f.tests.length} meal tests were each ${PATTERN_AFTER_MGDL} mg/dL (10.0 mmol/L) or more 2 hours after, and up ${PATTERN_RISE_MGDL} (3.3) or more. Before to after: ${nums} mg/dL. Portion size, missed medicine and stress also move these numbers.`;
}
