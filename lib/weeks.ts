/**
 * Group a month's meals into weeks, Monday to Sunday.
 *
 * A doctor reads a month of food as weeks, not as one long list: "she was fine
 * the first two weeks and then it slipped" is the sentence the record is meant
 * to make possible, and a flat list of forty lines hides it.
 *
 * Weeks are worked out in Nigerian time (WAT, GMT+1), the same as
 * lib/mealtime.ts and lib/intake.ts, so a meal eaten late on Sunday night does
 * not fall into the next week because of the device's timezone.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The date shifted into WAT. Read its UTC fields after the shift. */
function wat(ms: number): Date {
  return new Date(ms + HOUR);
}

/** The Monday that starts this date's week, as a WAT day number. */
function mondayKey(ms: number): number {
  const d = wat(ms);
  // getUTCDay: 0 is Sunday, so Sunday belongs to the Monday six days back.
  const back = (d.getUTCDay() + 6) % 7;
  return Math.floor(d.getTime() / DAY) - back;
}

export interface Week<T> {
  /** The Monday, as a day number. Sorting key. */
  key: number;
  /** "Week of 7 July" */
  label: string;
  items: T[];
}

/**
 * Newest week first, and within a week the items are left in the order they came
 * in (the callers already sort newest first).
 */
export function groupByWeek<T>(items: T[], at: (item: T) => string): Week<T>[] {
  const byKey = new Map<number, T[]>();
  for (const item of items) {
    const ms = new Date(at(item)).getTime();
    if (Number.isNaN(ms)) continue;
    const key = mondayKey(ms);
    const list = byKey.get(key);
    if (list) list.push(item);
    else byKey.set(key, [item]);
  }

  return [...byKey.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([key, list]) => {
      const monday = new Date(key * DAY);
      return {
        key,
        label: `Week of ${monday.getUTCDate()} ${MONTHS[monday.getUTCMonth()]}`,
        items: list,
      };
    });
}
