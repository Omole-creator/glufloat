/**
 * Blood sugar readings: the numbers, the units, and the words.
 *
 * This file is deliberately PURE. No Supabase, no window, no "use client", so
 * `scripts/glucose-test.ts` can run every rule below with no server and no
 * browser. The reading and writing lives next door in `lib/glucoseLog.ts`, the
 * same way `lib/frequency.ts` holds the rules and `lib/history.ts` holds the
 * database calls.
 *
 * Two rules govern everything here, and neither is a style choice:
 *
 *   1. A number is never graded. There is no green, yellow or red on a reading,
 *      no "normal", no "high", no adjective at all. The traffic light belongs to
 *      food, where a dietitian stands behind it. Grading somebody's blood sugar
 *      is a clinical judgement, which is both a claim we cannot back up and the
 *      exact thing that would make Glufloat a regulated medical device instead of
 *      a food app. We show the person their own number back. The doctor reads it.
 *
 *   2. When a reading is far out, the app refers and says nothing else. It names
 *      no condition, prints no cut-off, and gives no treatment or dose. Handing
 *      somebody to their doctor is the opposite of diagnosing them.
 */

export type GlucoseUnit = "mmol" | "mgdl";

/** One reading as the app holds it. */
export interface Reading {
  id: number;
  /** Null is normal and expected: a fasting or random reading has no meal. */
  mealCheckId: number | null;
  /** Exactly what the person typed, in the unit we read it as. */
  valueRaw: number;
  unit: GlucoseUnit;
  /** The canonical number. Every comparison in the app uses this one. */
  mgdl: number;
  takenAt: string; // ISO
}

/**
 * The conversion factor, derived rather than remembered.
 *
 * Glucose is C6H12O6, which weighs 180.156 g/mol, so one millimole is 180.156 mg
 * and 1 mmol/L is 18.0156 mg/dL. Clinical references also print 18 and 18.0182;
 * 18.0182 agrees with this to 0.014% and either is fine, but the derived figure
 * is the one that can be checked.
 *
 * What is NOT fine is a bare 18. It loses about a point at the top of the range,
 * turning 33.3 mmol/L into 599 instead of 600, and this number ends up on a
 * document a doctor reads.
 */
export const MMOL_TO_MGDL = 18.0156;

/**
 * Why one threshold is enough to tell the two units apart, with nothing to ask.
 *
 * A consumer glucometer stops giving a number at 33.3 mmol/L (600 mg/dL) and
 * shows "HI" instead, so 34 or more can never be an mmol reading. Coming the
 * other way, an mg/dL value below 34 belongs to somebody far too unwell to be
 * typing into a phone. The two real ranges therefore do not overlap, and the app
 * can read the unit off the size of the number.
 *
 * This matters more than it looks. The obvious alternative, guessing mg/dL when
 * unsure, would read a typed 25 as 25 instead of 450 and file a person's worst
 * reading of the month as their best.
 */
export const MMOL_CEILING = 33.3;
const UNIT_THRESHOLD = 34;

/** What a person could sensibly type, in either unit. */
const MIN_TYPED = 1;
const MAX_TYPED = 999;

/** Said when the box does not hold a number we can use. */
export const BAD_NUMBER = "Type the number your meter showed, like 6.5 or 140.";

/**
 * Out here, the app stops talking about food and points at a person. The two
 * numbers are house cut-offs used to decide whether to speak at all. They are
 * never shown, never named, and never printed in any sentence the user reads.
 */
const LOW_MGDL = 70;
const HIGH_MGDL = 300;

/** Which unit a typed number must be. See MMOL_CEILING above for why. */
export function detectUnit(value: number): GlucoseUnit {
  return value < UNIT_THRESHOLD ? "mmol" : "mgdl";
}

/** The canonical mg/dL for a typed value, whole numbers only. */
export function toMgdl(value: number, unit: GlucoseUnit): number {
  return Math.round(unit === "mmol" ? value * MMOL_TO_MGDL : value);
}

/** The same reading said in mmol/L, to one decimal place. */
export function toMmol(mgdl: number): number {
  return Math.round((mgdl / MMOL_TO_MGDL) * 10) / 10;
}

export interface ParsedReading {
  valueRaw: number;
  unit: GlucoseUnit;
  mgdl: number;
}

/**
 * Read what somebody typed. Returns null for anything we will not store, so a
 * slip of the thumb never becomes a row in their health record.
 *
 * Up to three digits and up to two decimal places. That accepts 6, 6.5, 117.5
 * and 140, and refuses empty, text, a negative, and a four-digit number.
 */
export function parseReading(input: string): ParsedReading | null {
  const cleaned = String(input ?? "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null;
  const valueRaw = Number(cleaned);
  if (!Number.isFinite(valueRaw)) return null;
  if (valueRaw < MIN_TYPED || valueRaw > MAX_TYPED) return null;
  const unit = detectUnit(valueRaw);
  return { valueRaw, unit, mgdl: toMgdl(valueRaw, unit) };
}

/** "240 mg/dL" */
export function formatMgdl(mgdl: number): string {
  return `${Math.round(mgdl)} mg/dL`;
}

/** "13.3 mmol/L" */
export function formatMmol(mgdl: number): string {
  return `${toMmol(mgdl)} mmol/L`;
}

/**
 * "240 mg/dL (13.3 mmol/L)". Both units, everywhere a reading is shown.
 *
 * Meters in Nigeria come in both kinds and most people have never been told
 * there are two, so the app never makes anybody pick. It reads the unit itself
 * and then says the number both ways, which also means a doctor trained on
 * either one can read the report without converting anything.
 */
export function formatBoth(mgdl: number): string {
  return `${formatMgdl(mgdl)} (${formatMmol(mgdl)})`;
}

/** "mg/dL" or "mmol/L". */
export function unitLabel(unit: GlucoseUnit): string {
  return unit === "mmol" ? "mmol/L" : "mg/dL";
}

/** The bare number in one unit, for a list where the unit is said once. */
export function valueIn(mgdl: number, unit: GlucoseUnit): number {
  return unit === "mmol" ? toMmol(mgdl) : Math.round(mgdl);
}

/** "13.3 mmol/L" or "240 mg/dL", whichever unit was asked for. */
export function formatIn(mgdl: number, unit: GlucoseUnit): string {
  return `${valueIn(mgdl, unit)} ${unitLabel(unit)}`;
}

/**
 * The unit this person's own meter speaks, worked out from what they have
 * already typed. Nobody is asked to set it.
 *
 * The report shows both units, because a doctor may be trained on either. But a
 * line spoken back to the PERSON should use the numbers they recognise: somebody
 * whose meter says 6.5 has never seen 117 in their life, and telling them 117
 * teaches them nothing. Ties and an empty list fall to mg/dL, which is the
 * canonical one.
 */
export function preferredUnit(readings: Reading[]): GlucoseUnit {
  let mmol = 0;
  for (const r of readings) if (r.unit === "mmol") mmol += 1;
  return mmol > readings.length - mmol ? "mmol" : "mgdl";
}

/**
 * The line straight after somebody types, so a wrong guess at the unit is
 * visible to them at the moment they could still fix it.
 *
 * "Got it. 6.5 mmol/L, the same as 117 mg/dL."
 */
export function echoLine(parsed: ParsedReading): string {
  const typed =
    parsed.unit === "mmol"
      ? `${parsed.valueRaw} mmol/L`
      : `${parsed.valueRaw} mg/dL`;
  const other =
    parsed.unit === "mmol" ? formatMgdl(parsed.mgdl) : formatMmol(parsed.mgdl);
  return `Got it. ${typed}, the same as ${other}.`;
}

/**
 * What to say above a reading that is far out, or null for the great majority
 * that are not. The reading is saved either way.
 *
 * Read rule 2 at the top of this file before touching these two sentences. They
 * refer the person on and stop. No condition is named, no number from this file
 * appears in them, and nothing is prescribed.
 */
export function dangerLine(mgdl: number): string | null {
  if (mgdl < LOW_MGDL) {
    return "Please get help now. Call your doctor or nurse. Glufloat only helps with food.";
  }
  if (mgdl > HIGH_MGDL) {
    return "Please tell your doctor or nurse about this test today. Glufloat only helps with food.";
  }
  return null;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * "28 Jul, 9:15am" in Nigerian time, for a reading with no meal beside it to
 * date it. The doctor report covers a whole month, so the day is always said.
 *
 * WAT is a fixed hour ahead of UTC and the whole app reads it that way rather
 * than trusting the phone's own timezone.
 */
export function readingWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const wat = new Date(d.getTime() + 60 * 60 * 1000);
  const h24 = wat.getUTCHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const m = String(wat.getUTCMinutes()).padStart(2, "0");
  return `${wat.getUTCDate()} ${MONTHS[wat.getUTCMonth()]}, ${h}:${m}${h24 < 12 ? "am" : "pm"}`;
}

/** Longest gap between eating and testing that is still worth printing. */
const MAX_GAP_MS = 6 * 60 * 60 * 1000;
/** Below this, the two were logged in one sitting and the gap means nothing. */
const MIN_GAP_MS = 5 * 60 * 1000;

/**
 * "2h 10m later", for the doctor report. How long after the food the reading was
 * taken is half of what makes the number readable to a doctor, and the app knows
 * it for free from the two timestamps.
 *
 * Null when the gap is too small to mean anything, when the reading came first,
 * or when it is so long after that it says nothing about that meal.
 */
export function gapLabel(checkedAt: string, takenAt: string): string | null {
  const from = new Date(checkedAt).getTime();
  const to = new Date(takenAt).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  const ms = to - from;
  if (ms < MIN_GAP_MS || ms > MAX_GAP_MS) return null;
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m later`;
  if (m === 0) return `${h}h later`;
  return `${h}h ${m}m later`;
}
