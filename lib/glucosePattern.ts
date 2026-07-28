/**
 * "The last few times you ate this, here is what your meter said."
 *
 * This is the part of the readings feature that speaks up on its own, so it is
 * the part with the most rules on it. Pure, like `lib/glucose.ts`, so
 * `scripts/glucose-test.ts` can prove every one of them.
 *
 * THE FOUR RULES. Each one is here because the obvious version of this feature
 * gets it wrong.
 *
 *   1. A person is only ever compared with THEMSELVES. The line says a food's
 *      readings sit above that person's own usual number. It never compares them
 *      against a medical cut-off, because that is a clinical judgement and not
 *      ours to make. It is also the more useful sentence: "higher than your
 *      usual" is about them, and a textbook range is about nobody.
 *
 *   2. The food is never blamed. Portion, sleep, worry, and whatever they ate
 *      before all push a reading around, and the app cannot separate them. So it
 *      states the numbers and hands the question to a doctor. Saying "eba pushes
 *      your sugar up" when the real cause was a mountain of eba would quietly
 *      give somebody permission to keep eating half a mountain of it.
 *
 *   3. It stays silent until it has something. Two readings for the food, and
 *      five in total so a usual number exists at all. One bad reading is a bad
 *      day, not a pattern, and a wrong warning is how a person stops believing
 *      the next one.
 *
 *   4. It does not tell anybody what to do. No "avoid", no "stop", no colour.
 *      The food's own green, yellow or red is already on the card, reviewed by a
 *      dietitian. This line adds the person's numbers and nothing else.
 */

import {
  type GlucoseUnit,
  type Reading,
  formatIn,
  unitLabel,
  valueIn,
} from "./glucose";

/** Readings for this one food before it may be spoken about at all. */
export const MIN_FOOD_READINGS = 2;
/** Readings in total before a "usual" number means anything. */
export const MIN_ALL_READINGS = 5;
/** How far above their usual a food has to sit before the app says so. */
export const ABOVE_USUAL_MGDL = 30;
/** Longest list of numbers to read out. More than this and nobody reads it. */
const MAX_SHOWN = 3;

/** One logged meal with whatever readings hang off it. */
export interface CheckWithReadings {
  kind: "single" | "meal";
  label: string;
  readings: Reading[];
}

/**
 * The foods inside one logged entry, by raw stored name.
 *
 * A single food name holds commas of its own ("Seeds (pumpkin, sunflower, flax,
 * chia)"), so only a saved plate is ever split. Same rule as foodCounts in
 * lib/history.ts. Exported so the admin readiness count uses this exact rule
 * rather than keeping its own copy of it.
 */
export function foodsIn(kind: "single" | "meal", label: string): string[] {
  if (kind === "single") return label ? [label] : [];
  return String(label)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Every reading grouped under each food it followed, keyed by the food's RAW
 * stored name so a caller can look the food up. Newest first.
 *
 * A saved plate is one comma-joined label, so a reading after rice and stew
 * counts for both foods. That is honest: the app does not know which of them did
 * it, which is rule 2 above in another form.
 *
 * Only the split is done here. A reading the person attached to a meal is
 * counted, full stop, with no second-guessing of how long after the food they
 * tested. They said it belonged to that meal, and explicit intent is what the
 * whole eaten-log is built on.
 */
export function readingsByFood(
  checks: CheckWithReadings[],
): Map<string, number[]> {
  const collected = new Map<string, Reading[]>();
  for (const c of checks) {
    if (c.readings.length === 0) continue;
    for (const name of foodsIn(c.kind, c.label)) {
      const list = collected.get(name) ?? [];
      list.push(...c.readings);
      collected.set(name, list);
    }
  }
  // Newest first, so "last time you ate this" really is the last time.
  const byFood = new Map<string, number[]>();
  for (const [name, list] of collected) {
    byFood.set(
      name,
      [...list]
        .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
        .map((r) => r.mgdl),
    );
  }
  return byFood;
}

/**
 * This person's usual reading, or null while there are too few to have one.
 *
 * Every reading counts towards it, including the ones with no meal attached: a
 * fasting number is still part of what usual looks like for them.
 */
export function personalUsual(all: Reading[]): number | null {
  if (all.length < MIN_ALL_READINGS) return null;
  const sum = all.reduce((t, r) => t + r.mgdl, 0);
  return Math.round(sum / all.length);
}

export interface FoodPattern {
  /** The readings after this food, newest first, in mg/dL. */
  values: number[];
  /** Their average after this food, mg/dL. */
  mean: number;
  /** Their usual across everything, mg/dL. */
  usual: number;
  /** The whole line, ready to render. */
  text: string;
}

/**
 * The line for one food, or null when there is nothing honest to say yet.
 *
 * `displayName` must already have been through `cleanFoodName`, because the
 * stored name is not what a person should read.
 */
export function foodPattern(
  displayName: string,
  values: number[],
  usual: number | null,
  unit: GlucoseUnit = "mgdl",
): FoodPattern | null {
  if (usual === null) return null; // rule 3: no usual, nothing to compare with
  if (values.length < MIN_FOOD_READINGS) return null; // rule 3: one is a bad day
  const mean = Math.round(values.reduce((t, v) => t + v, 0) / values.length);
  if (mean - usual < ABOVE_USUAL_MGDL) return null; // nothing to report

  const shown = values.slice(0, MAX_SHOWN);
  const list = `${shown.map((v) => valueIn(v, unit)).join(", ")} ${unitLabel(unit)}`;
  // Rule 1 (their own usual, not a cut-off) and rule 2 (the meal is worth asking
  // about, the food is not accused of anything) both live in this sentence.
  const text = `Your sugar tests after ${displayName} (${list}) are higher than your usual, which is ${formatIn(usual, unit)}. Show this to your doctor and ask about this meal.`;
  return { values: shown, mean, usual, text };
}

/** One reading as the admin dashboard reads it, across every account. */
export interface ReadingRow {
  userId: string;
  mealCheckId: number | null;
  /** The meal it followed, when it followed one. */
  kind: "single" | "meal" | null;
  label: string | null;
}

export interface ReadingHealth {
  /** Readings logged, all accounts. */
  total: number;
  /** People who have logged at least one. Breadth, which is what matters. */
  people: number;
  /** People who came back and logged a second. One is curiosity, two is a habit. */
  repeat: number;
  /**
   * People who have enough for the app to be ABLE to warn them: the same
   * thresholds the pattern line itself uses, read from the same constants so the
   * dashboard can never promise what the app will not do.
   */
  ready: number;
  /** Readings tied to a meal, and readings on their own. */
  attached: number;
  loose: number;
  /** The middle person's count, which one keen user cannot inflate. */
  median: number;
}

/**
 * Is the readings feature actually working?
 *
 * The count of readings alone cannot answer that. One keen user logging forty of
 * them makes the total look healthy while nobody else has touched it, and the
 * pattern line still has nothing to say to anyone. `ready` is the number that
 * answers it: until at least one person crosses those thresholds, the half of the
 * feature that speaks up on its own has never spoken to a single user.
 */
export function readingHealth(rows: ReadingRow[]): ReadingHealth {
  const perPerson = new Map<string, ReadingRow[]>();
  let attached = 0;
  for (const r of rows) {
    if (r.mealCheckId !== null) attached += 1;
    const list = perPerson.get(r.userId) ?? [];
    list.push(r);
    perPerson.set(r.userId, list);
  }

  let repeat = 0;
  let ready = 0;
  const counts: number[] = [];
  for (const list of perPerson.values()) {
    counts.push(list.length);
    if (list.length >= 2) repeat += 1;
    if (list.length < MIN_ALL_READINGS) continue;
    // Enough in total. Now: is there a single food they have measured twice?
    const perFood = new Map<string, number>();
    for (const r of list) {
      if (r.kind === null || r.label === null) continue;
      for (const name of foodsIn(r.kind, r.label)) {
        perFood.set(name, (perFood.get(name) ?? 0) + 1);
      }
    }
    for (const n of perFood.values()) {
      if (n >= MIN_FOOD_READINGS) {
        ready += 1;
        break;
      }
    }
  }

  counts.sort((a, b) => a - b);
  const median = counts.length
    ? counts.length % 2
      ? counts[(counts.length - 1) / 2]
      : Math.round((counts[counts.length / 2 - 1] + counts[counts.length / 2]) / 2)
    : 0;

  return {
    total: rows.length,
    people: perPerson.size,
    repeat,
    ready,
    attached,
    loose: rows.length - attached,
    median,
  };
}

/**
 * One plain sentence saying where the feature stands, for the top of the admin
 * section. Names the next thing that has to happen rather than a score.
 */
export function readingVerdict(h: ReadingHealth): string {
  if (h.people === 0) {
    return "Nobody has saved a sugar test yet. Until somebody does, the app can only say what a food does to people in general, never what it does to them.";
  }
  if (h.ready === 0) {
    const who = h.people === 1 ? "1 person is" : `${h.people} people are`;
    return `${who} saving sugar tests. Nobody has enough yet, so the app cannot show anyone how their own sugar behaved after a meal. That takes ${MIN_FOOD_READINGS} tests after the same food and ${MIN_ALL_READINGS} tests in all.`;
  }
  const n = h.ready === 1 ? "1 person now has" : `${h.ready} people now have`;
  return `${n} enough sugar tests for the app to show them how their own sugar behaved after a meal. This is the number to watch.`;
}

/**
 * "Last time you ate this, your reading was 240 mg/dL." Works from a single
 * reading, which is the point: a person who tests twice a week gets something
 * back straight away, long before any pattern can exist.
 *
 * Pass `name` when the reading belongs to one food on a whole plate, so the line
 * says which one. Without it the line says "this", which is only true when there
 * is one food on the screen.
 *
 * Numbers only. No colour, no grade, no adjective.
 */
export function recallLine(
  values: number[],
  unit: GlucoseUnit = "mgdl",
  name?: string,
): string | null {
  if (values.length === 0) return null;
  if (values.length === 1) {
    return name
      ? `Last time you ate ${name}, your sugar test was ${formatIn(values[0], unit)}.`
      : `Last time you ate this, your sugar test was ${formatIn(values[0], unit)}.`;
  }
  const shown = values.slice(0, MAX_SHOWN);
  const list = `${shown.map((v) => valueIn(v, unit)).join(", ")} ${unitLabel(unit)}`;
  return `Your last ${shown.length} sugar tests after ${name ?? "this food"}: ${list}.`;
}
