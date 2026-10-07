import type { Reading } from "./glucose";

/**
 * A MEAL TEST: one meal, the sugar test before it, the sugar test 2 hours after,
 * and the change between them. This record is the unit a doctor or dietitian
 * reads (the co-founder dietitian's design, 2026-10-07), and the unit a future
 * model would learn from.
 *
 * Pure on purpose, like lib/glucose.ts, so scripts/meal-response-test.ts runs
 * every rule with no server. Run it after any edit here.
 *
 * Four rules, all inherited from the sugar-test feature and none of them up for
 * grabs:
 *
 * 1. THE CHANGE IS A NUMBER, NEVER A GRADE. "+24 mg/dL" and nothing else. No
 *    colour, no "good", no "high". The doctor reads it. Grading a blood sugar
 *    response is a clinical judgement (see lib/glucose.ts).
 * 2. THE TEST BEFORE THE MEAL IS ASKED FOR, NEVER DEMANDED. Strips cost money.
 *    A meal with no before-test is still a meal; it is simply not "complete".
 * 3. "COMPLETE" MEANS BOTH TESTS, WITH THE SECOND ONE NEAR 2 HOURS. A test at
 *    5 hours is kept and shown with its real time, but it is not passed off as a
 *    2-hour result, to the doctor or to a model.
 * 4. OBSERVATIONS STATE NUMBERS FROM THE PERSON'S OWN RECORDS. They never say a
 *    food caused anything: portion, sleep, illness, activity and medicine timing
 *    all move a reading too, and the app cannot separate them.
 */

/** The 2-hour mark the whole test is built around. */
export const TEST_AFTER_MIN = 120;
/** From here the second test is "due" (15 minutes early is fine to start). */
export const DUE_FROM_MIN = 105;
/** After this the test is no longer asked for: it says little about the meal. */
export const DUE_UNTIL_MIN = 240;
/** A second test inside this window counts as the 2-hour result. */
export const COMPLETE_FROM_MIN = 90;
export const COMPLETE_UNTIL_MIN = 180;
/** A before-meal test taken this long before the meal starts still belongs to it. */
export const BEFORE_LINK_MIN = 60;
/** An after-test sooner than this is the same sitting, not a result. */
const MIN_AFTER_MIN = 30;
/** Longer than this after the meal and a test is about something else. */
const MAX_AFTER_MIN = 360;

const MINUTE = 60 * 1000;

export interface MealTestInput {
  id: number;
  kind: "single" | "meal";
  label: string;
  /** When the meal was logged. */
  checkedAt: string;
  /** When the person tapped "Start my meal". Null for a meal logged after eating. */
  startedAt: string | null;
  /** Tests taken BEFORE this meal (context "before_meal"). */
  before: Reading[];
  /** Every other test the person attached to this meal. */
  after: Reading[];
}

export interface MealTest {
  id: number;
  kind: "single" | "meal";
  label: string;
  /** What the 2-hour clock runs from: the start, or the log time if there is none. */
  mealTime: string;
  started: boolean;
  before: Reading | null;
  after: Reading | null;
  /** Minutes from the meal to the after-test. */
  minutesAfter: number | null;
  /** after minus before, in mg/dL, rounded. Null unless both exist. */
  change: number | null;
  /** Both tests, and the second one within COMPLETE_FROM_MIN..COMPLETE_UNTIL_MIN. */
  complete: boolean;
}

function ms(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Turn a logged meal and its tests into one meal test.
 *
 * The before-test is the latest one marked "before". The after-test is the one
 * closest to 2 hours, among tests at least 30 minutes and at most 6 hours after
 * the meal, so somebody who tested at 1 hour and again at 2 hours gets the 2-hour
 * number on the record, and the 1-hour one stays on the report as an ordinary
 * test.
 */
export function mealTestFor(m: MealTestInput): MealTest {
  const mealTime = m.startedAt ?? m.checkedAt;
  const start = ms(mealTime);

  const before =
    [...m.before].sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0] ?? null;

  let after: Reading | null = null;
  let best = Infinity;
  for (const r of m.after) {
    const mins = (ms(r.takenAt) - start) / MINUTE;
    if (!Number.isFinite(mins) || mins < MIN_AFTER_MIN || mins > MAX_AFTER_MIN) continue;
    const off = Math.abs(mins - TEST_AFTER_MIN);
    if (off < best) {
      best = off;
      after = r;
    }
  }

  const minutesAfter = after ? Math.round((ms(after.takenAt) - start) / MINUTE) : null;
  const change = before && after ? Math.round(after.mgdl - before.mgdl) : null;
  const complete =
    change !== null &&
    minutesAfter !== null &&
    minutesAfter >= COMPLETE_FROM_MIN &&
    minutesAfter <= COMPLETE_UNTIL_MIN;

  return {
    id: m.id,
    kind: m.kind,
    label: m.label,
    mealTime,
    started: m.startedAt !== null,
    before,
    after,
    minutesAfter,
    change,
    complete,
  };
}

/** Did this meal get any test at all, before or after? */
export function hasAnyTest(t: MealTest): boolean {
  return t.before !== null || t.after !== null;
}

/** "000124", the record number the dietitian's design asks for. */
export function mealTestNumber(id: number): string {
  return String(Math.max(0, Math.round(id))).padStart(6, "0");
}

/**
 * "+24 mg/dL", "-6 mg/dL", "0 mg/dL". A plain hyphen for minus, not a dash
 * character, so it reads the same in a PDF, a WhatsApp message and on screen.
 */
export function formatChange(change: number): string {
  const n = Math.round(change);
  return `${n > 0 ? "+" : ""}${n} mg/dL`;
}

/** "2h 10m". How long after the meal the second test was. */
export function minutesLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** When the 2-hour test is due. */
export function dueAt(mealTime: string): Date {
  return new Date(ms(mealTime) + TEST_AFTER_MIN * MINUTE);
}

export type DueState = "waiting" | "due" | "over";

/**
 * Where a started meal is on its clock: too soon for the second test, due now,
 * or too late to ask for it.
 */
export function dueState(mealTime: string, now: Date = new Date()): DueState {
  const mins = (now.getTime() - ms(mealTime)) / MINUTE;
  if (!Number.isFinite(mins) || mins > DUE_UNTIL_MIN) return "over";
  if (mins < DUE_FROM_MIN) return "waiting";
  return "due";
}

/** Minutes left until the 2-hour mark, never below 0. */
export function minutesToDue(mealTime: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((dueAt(mealTime).getTime() - now.getTime()) / MINUTE));
}

/**
 * The one before-meal test, taken in the hour before a meal started and not yet
 * tied to any meal, that should be tied to it. Somebody who saved "I have not
 * eaten yet" in the sugar test box and then started their meal has already done
 * the first half of a meal test; this is what stops them being asked again.
 */
export function beforeToLink(loose: Reading[], mealTime: string): Reading | null {
  const start = ms(mealTime);
  let pick: Reading | null = null;
  for (const r of loose) {
    if (r.context !== "before_meal" || r.mealCheckId !== null) continue;
    const mins = (start - ms(r.takenAt)) / MINUTE;
    if (mins < -5 || mins > BEFORE_LINK_MIN) continue;
    if (!pick || r.takenAt > pick.takenAt) pick = r;
  }
  return pick;
}

/* ---- How much was eaten --------------------------------------------------- */

/**
 * What one saved size means, in words a doctor and a patient both follow.
 *
 * The app gives ONE size per food (the dietitian's). A person records what they
 * really ate as that size, less, or more; the blue card's bigger serving is
 * stored as grams. "half" and "large" are the meal builder's own words for less
 * and more (lib/types.ts PortionSize).
 */
export function portionWords(size: string | null | undefined, guidance: string): string {
  const s = (size ?? "normal").trim();
  if (s === "half") return "less than the GluFloat size";
  if (s === "large") return "more than the GluFloat size";
  if (/^\d+(\.\d+)?g$/.test(s)) return s;
  return firstSentence(guidance) || "the GluFloat size";
}

/** The first sentence of a size, which is the amount; the rest is how to cook it. */
export function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const i = t.search(/\.(\s|$)/);
  return i === -1 ? t : t.slice(0, i + 1);
}

/** Did the person eat more than the GluFloat size of anything on this plate? */
export function ateMore(sizes: string[] | null | undefined): boolean {
  return (sizes ?? []).some((s) => s === "large");
}

/* ---- The month, for the doctor -------------------------------------------- */

export interface MealTestStats {
  /** Meals logged in the period. */
  meals: number;
  /** Meals with at least one test, before or after. */
  tested: number;
  /** Meals with both tests and the second near 2 hours. */
  complete: number;
}

export function mealTestStats(tests: MealTest[]): MealTestStats {
  return {
    meals: tests.length,
    tested: tests.filter(hasAnyTest).length,
    complete: tests.filter((t) => t.complete).length,
  };
}

/** One complete meal test, with what the report needs to say about it. */
export interface ObservedTest {
  label: string;
  /** The cleaned name to print. */
  shown: string;
  mealTime: string;
  change: number;
  /** Starch on the plate, in grams of carbohydrate at the GluFloat size. */
  carbG: number | null;
  /** Ate more than the GluFloat size of something on the plate. */
  more: boolean;
}

/**
 * The line every observation block ends with. It is what keeps a page of numbers
 * from being read as a diagnosis, by the doctor or by the patient.
 */
export const OBSERVATION_NOTE =
  "These are numbers from the patient's own records, not a clinical conclusion. How much was eaten, activity, sleep, illness and the timing of medicine also change blood sugar.";

const WAT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "6 Oct" in Nigerian time. */
export function dayLabel(iso: string): string {
  const d = new Date(ms(iso) + 60 * MINUTE);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${WAT_MONTHS[d.getUTCMonth()]}`;
}

/** "1:00pm" in Nigerian time. */
export function timeLabel(iso: string): string {
  const d = new Date(ms(iso) + 60 * MINUTE);
  if (Number.isNaN(d.getTime())) return "";
  const h24 = d.getUTCHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(d.getUTCMinutes()).padStart(2, "0")}${h24 < 12 ? "am" : "pm"}`;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const signed = (n: number) => formatChange(Math.round(n));

/**
 * Plain observations for the clinician, from complete meal tests only.
 *
 * Each one states two numbers side by side, or one fact, and never says which is
 * better or what caused it. Each needs at least two meal tests on each side
 * before it is said at all: one meal against one meal is a coincidence, not an
 * observation. Returns nothing (not even the note) when there is nothing to say.
 */
export function observations(tests: ObservedTest[]): string[] {
  if (tests.length === 0) return [];
  const out: string[] = [];

  // 1. The largest change on the record.
  const top = [...tests].sort((a, b) => b.change - a.change)[0];
  out.push(
    `The largest recorded change was ${signed(top.change)}, after ${top.shown} on ${dayLabel(top.mealTime)}.`,
  );

  // 2. Bigger than the GluFloat size against at or under it.
  const more = tests.filter((t) => t.more);
  const usual = tests.filter((t) => !t.more);
  if (more.length >= 2 && usual.length >= 2) {
    out.push(
      `After meals eaten bigger than the GluFloat size, the average recorded change was ${signed(mean(more.map((t) => t.change)))} (${more.length} meals). At the GluFloat size or less, it was ${signed(mean(usual.map((t) => t.change)))} (${usual.length} meals).`,
    );
  }

  // 3. The plates with the most starch against the rest, split at the middle.
  const withCarbs = tests.filter((t) => t.carbG !== null) as (ObservedTest & { carbG: number })[];
  if (withCarbs.length >= 4) {
    const sorted = [...withCarbs].sort((a, b) => a.carbG - b.carbG);
    const half = Math.floor(sorted.length / 2);
    const less = sorted.slice(0, half);
    const most = sorted.slice(half);
    const cut = Math.round(most[0].carbG);
    if (less.length >= 2 && most.length >= 2 && most[0].carbG > less[less.length - 1].carbG) {
      out.push(
        `After the meals with the most starch (${cut}g of carbohydrate or more), the average recorded change was ${signed(mean(most.map((t) => t.change)))}. After the others, it was ${signed(mean(less.map((t) => t.change)))}.`,
      );
    }
  }

  // 4. A meal tested more than once, so the doctor can see it repeat (or not).
  const byMeal = new Map<string, ObservedTest[]>();
  for (const t of tests) byMeal.set(t.label, [...(byMeal.get(t.label) ?? []), t]);
  const repeated = [...byMeal.values()]
    .filter((xs) => xs.length >= 2)
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
  for (const xs of repeated) {
    const ordered = [...xs].sort((a, b) => a.mealTime.localeCompare(b.mealTime));
    out.push(
      `${xs[0].shown} was tested ${xs.length} times. The recorded changes were ${ordered.map((t) => signed(t.change).replace(" mg/dL", "")).join(", ")} mg/dL.`,
    );
  }

  out.push(OBSERVATION_NOTE);
  return out;
}

/** The meals logged most often, for the "meal pattern" block. Newest wins a tie. */
export function mostLogged(labels: string[], limit = 5): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
