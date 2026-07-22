import type { MonthStats } from "./history";

/**
 * The moment worth marking.
 *
 * A streak number on its own is a fact. Saying "seven days in a row, well done"
 * is the thing that makes somebody want an eighth, and it is why this exists
 * separately from the plain streak line.
 *
 * Rules this file keeps:
 *  - **One line, never a wall.** At most one milestone is ever returned, the
 *    biggest one reached.
 *  - **Only what the log really holds.** Every line states a count taken
 *    straight from the person's own record. Nothing here claims anything about
 *    blood sugar or health, because we cannot back that up.
 *  - **Plain words, no em dash** (COPYWRITING-PLAYBOOK.md).
 *
 * `key` is what the caller stores so a milestone is celebrated once and not on
 * every open. `rank` is how far along the person is, so a bigger milestone can
 * always beat a smaller one that was already shown.
 */
export interface Milestone {
  key: string;
  rank: number;
  text: string;
}

/** Days in a row, and the words for each step. */
const STREAKS: { days: number; text: string }[] = [
  { days: 3, text: "Three days in a row. You have started something." },
  { days: 7, text: "A whole week in a row. Well done." },
  { days: 14, text: "Two weeks in a row. This is a habit now." },
  { days: 30, text: "Thirty days in a row. That is a full month." },
];

/** Good meals this month. */
const GREENS: { count: number; text: string }[] = [
  { count: 10, text: "10 good meals this month." },
  { count: 25, text: "25 good meals this month. Keep going." },
  { count: 50, text: "50 good meals this month. That is real work." },
];

/**
 * The biggest milestone this person has reached, or null.
 *
 * Streaks are ranked above green counts at the same level, because coming back
 * every day is the harder thing and the one the app is asking for.
 */
export function milestoneFor(s: MonthStats): Milestone | null {
  let best: Milestone | null = null;

  for (let i = 0; i < STREAKS.length; i++) {
    const m = STREAKS[i];
    if (s.streakDays >= m.days) {
      best = { key: `streak-${m.days}`, rank: 100 + i * 10, text: m.text };
    }
  }
  for (let i = 0; i < GREENS.length; i++) {
    const m = GREENS[i];
    if (s.green >= m.count) {
      const rank = 105 + i * 10;
      if (!best || rank > best.rank) {
        best = { key: `green-${m.count}`, rank, text: m.text };
      }
    }
  }
  return best;
}

/**
 * "Last month you had 8 good meals. This month you have 12."
 *
 * Only said when there IS a last month to compare with, and only as two plain
 * counts. It does not say "better" or "worse": the two numbers say it, and a
 * person who had a hard month does not need the app to name it.
 */
export function progressLine(s: MonthStats): string | null {
  if (s.prevTotal === 0) return null;
  const was = `${s.prevGreen} good ${s.prevGreen === 1 ? "meal" : "meals"}`;
  const nowN = `${s.green} good ${s.green === 1 ? "meal" : "meals"}`;
  return `Last month you had ${was}. This month you have ${nowN}.`;
}
