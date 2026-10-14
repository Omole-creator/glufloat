import { HIGH_MGDL, LOW_MGDL, formatBoth, readingWhen, type Reading } from "@/lib/glucose";

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

export function safetyEvents(readings: Reading[], now = new Date()): SafetyEvent[] {
  const since = now.getTime() - FLAG_DAYS * DAY_MS;
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
