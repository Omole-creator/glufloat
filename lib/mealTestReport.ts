import type { Reading } from "./glucose";
import type { CheckedMeal } from "./history";
import { FOODS } from "./search";
import { displayLabel } from "./foodName";
import { sizedFoods } from "./mealSize";
import {
  ateMore,
  dayLabel,
  hasAnyTest,
  mealTestFor,
  mealTestStats,
  mostLogged,
  observations,
  portionWords,
  timeLabel,
  type MealTest,
  type MealTestStats,
} from "./mealResponse";

/**
 * The Meal–Glucose Report: the month's meals turned into the dietitian's rows
 * (date, meal, how much, before, 2 hours after, change), the counts, the
 * observations and the meal pattern.
 *
 * ONE builder for all three surfaces. The house rule is that the screen, the PDF
 * and the WhatsApp text tell the doctor one story; building the rows once is how
 * they cannot drift apart.
 */

export interface MealTestRow {
  id: number;
  mealTime: string;
  date: string;
  time: string;
  /** The meal as the person reads it ("Jollof Rice, Chicken"). */
  shown: string;
  /** How much of each food, in words ("Jollof Rice: more than the GluFloat size"). */
  portion: string;
  before: number | null;
  after: number | null;
  minutesAfter: number | null;
  change: number | null;
  complete: boolean;
}

export interface MealTestReport {
  stats: MealTestStats;
  /** Meals with at least one test, oldest first (a report reads forwards). */
  rows: MealTestRow[];
  observations: string[];
  /** The meals logged most often this month. */
  pattern: { shown: string; count: number }[];
}

function testOf(m: CheckedMeal): MealTest {
  return mealTestFor({
    id: m.id,
    kind: m.kind,
    label: m.label,
    checkedAt: m.checkedAt,
    startedAt: m.startedAt,
    before: m.beforeReadings,
    after: m.readings,
  });
}

function portionOf(m: CheckedMeal): string {
  const foods = sizedFoods(m.label, m.kind);
  const parts = foods.map((f, i) => {
    const words = portionWords(m.sizes?.[i], f.size);
    const w = words.replace(/\.$/, "");
    return m.kind === "single" ? w : `${f.name}: ${w}`;
  });
  return parts.join("; ");
}

/** Starch on the plate at the GluFloat size, from each food's own carbG. */
function carbsOf(m: CheckedMeal): number | null {
  const names = m.kind === "single" ? [m.label] : m.label.split(",").map((s) => s.trim());
  let total = 0;
  for (const n of names) {
    const f = FOODS.find((x) => x.name === n);
    if (!f || f.carbG === undefined || f.carbG === null) return null;
    total += f.carbG;
  }
  return total;
}

export function mealTestReport(list: CheckedMeal[]): MealTestReport {
  const tests = list.map((m) => ({ m, t: testOf(m) }));
  const rows = tests
    .filter(({ t }) => hasAnyTest(t))
    .sort((a, b) => a.t.mealTime.localeCompare(b.t.mealTime))
    .map(({ m, t }) => ({
      id: m.id,
      mealTime: t.mealTime,
      date: dayLabel(t.mealTime),
      time: timeLabel(t.mealTime),
      shown: displayLabel(m.label),
      portion: portionOf(m),
      before: t.before?.mgdl ?? null,
      after: t.after?.mgdl ?? null,
      minutesAfter: t.minutesAfter,
      change: t.change,
      complete: t.complete,
    }));

  const obs = observations(
    tests
      .filter(({ t }) => t.complete && t.change !== null)
      .map(({ m, t }) => ({
        label: m.label,
        shown: displayLabel(m.label),
        mealTime: t.mealTime,
        change: t.change as number,
        carbG: carbsOf(m),
        more: ateMore(m.sizes),
      })),
  );

  return {
    stats: mealTestStats(tests.map(({ t }) => t)),
    rows,
    observations: obs,
    pattern: mostLogged(list.map((m) => m.label)).map((p) => ({
      shown: displayLabel(p.label),
      count: p.count,
    })),
  };
}

/**
 * Every sugar test this month for the trend graph, oldest first: the ones on a
 * meal (before and after) and the ones on no meal.
 */
export function trendPoints(list: CheckedMeal[], loose: Reading[]): Reading[] {
  const all = [...loose];
  for (const m of list) all.push(...m.readings, ...m.beforeReadings);
  const seen = new Set<number>();
  return all
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

/** "1 to 7 October 2026": the month so far, in Nigerian time. */
export function periodLabel(now: Date = new Date()): string {
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const month = wat.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const day = wat.getUTCDate();
  return day === 1
    ? `1 ${month} ${wat.getUTCFullYear()}`
    : `1 to ${day} ${month} ${wat.getUTCFullYear()}`;
}
