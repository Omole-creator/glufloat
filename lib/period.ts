/**
 * A period you can actually point at.
 *
 * The dashboards used to say "this month" and mean "the last 30 days from right
 * now". That is fine on the day you look at it and useless afterwards: you could
 * never open June of last year, or compare Q2 to Q3, or check what a week in
 * August actually did. Every number was anchored to today.
 *
 * A period here is a real window with a start and an end, chosen by the person
 * looking. "June 2027" means 1 June to 30 June 2027, whether you open it in June
 * 2027 or in 2031.
 *
 * It lives in the URL, so a view can be bookmarked and sent to somebody:
 *   /admin?grain=month&y=2027&m=6      June 2027
 *   /admin?grain=quarter&y=2026&q=3    Q3 2026
 *   /admin?grain=week&d=2026-08-03     the week of Monday 3 August 2026
 *   /admin?grain=all                   everything
 */

export type Grain = "day" | "week" | "month" | "quarter" | "year" | "all";

export const GRAINS: { key: Grain; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
];

/** Glufloat launched in July 2026. There is nothing to see before that. */
export const FIRST_YEAR = 2026;

export type Period = {
  grain: Grain;
  /** Inclusive. `null` for all time. */
  from: Date | null;
  /** EXCLUSIVE, so a month ends cleanly at midnight on the 1st of the next. */
  to: Date | null;
  /** "June 2027", "Q3 2026", "Week of 3 Aug 2026", "2027", "All time". */
  label: string;
  /** The raw params, so links can be rebuilt. */
  y: number;
  m: number; // 1-12
  q: number; // 1-4
  d: string; // yyyy-mm-dd
};

export type PeriodParams = {
  grain?: string;
  y?: string;
  m?: string;
  q?: string;
  d?: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Monday of the week containing `d`. Weeks start Monday: payouts run weekly. */
function mondayOf(d: Date): Date {
  const x = new Date(d);
  const back = (x.getDay() + 6) % 7; // Sunday(0) -> 6, Monday(1) -> 0
  x.setDate(x.getDate() - back);
  x.setHours(0, 0, 0, 0);
  return x;
}

const shortDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Read a period out of the URL. Falls back to the current month. */
export function parsePeriod(sp: PeriodParams): Period {
  const now = new Date();
  const grain: Grain = (GRAINS.find((g) => g.key === sp.grain)?.key ??
    "month") as Grain;

  const y = clamp(Number(sp.y) || now.getFullYear(), FIRST_YEAR, now.getFullYear() + 5);
  const m = clamp(Number(sp.m) || now.getMonth() + 1, 1, 12);
  const q = clamp(Number(sp.q) || Math.floor(now.getMonth() / 3) + 1, 1, 4);

  // A date, for the day and week grains. Defaults to today.
  const parsed = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? new Date(sp.d + "T00:00:00") : now;
  const d = toISO(parsed);

  const base = { grain, y, m, q, d };

  switch (grain) {
    case "day": {
      const from = new Date(parsed);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      return { ...base, from, to, label: shortDate(from) };
    }
    case "week": {
      const from = mondayOf(parsed);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      const last = new Date(to);
      last.setDate(last.getDate() - 1);
      return {
        ...base,
        from,
        to,
        label: `${shortDate(from)} to ${shortDate(last)}`,
      };
    }
    case "month": {
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 1);
      return { ...base, from, to, label: `${MONTHS[m - 1]} ${y}` };
    }
    case "quarter": {
      const from = new Date(y, (q - 1) * 3, 1);
      const to = new Date(y, q * 3, 1);
      return { ...base, from, to, label: `Q${q} ${y}` };
    }
    case "year": {
      const from = new Date(y, 0, 1);
      const to = new Date(y + 1, 0, 1);
      return { ...base, from, to, label: String(y) };
    }
    case "all":
      return { ...base, from: null, to: null, label: "All time" };
  }
}

/**
 * The params for the period one step before or after this one. This is what the
 * back and forward arrows do: from June 2027, back is May 2027, and back again
 * from January 2027 is December 2026. Stepping across a year boundary has to
 * work, or the arrows are a toy.
 */
export function step(p: Period, by: -1 | 1): PeriodParams {
  switch (p.grain) {
    case "day": {
      const d = new Date(p.d + "T00:00:00");
      d.setDate(d.getDate() + by);
      return { grain: "day", d: toISO(d) };
    }
    case "week": {
      const d = mondayOf(new Date(p.d + "T00:00:00"));
      d.setDate(d.getDate() + by * 7);
      return { grain: "week", d: toISO(d) };
    }
    case "month": {
      const d = new Date(p.y, p.m - 1 + by, 1);
      return { grain: "month", y: String(d.getFullYear()), m: String(d.getMonth() + 1) };
    }
    case "quarter": {
      let q = p.q + by;
      let y = p.y;
      if (q < 1) { q = 4; y -= 1; }
      if (q > 4) { q = 1; y += 1; }
      return { grain: "quarter", y: String(y), q: String(q) };
    }
    case "year":
      return { grain: "year", y: String(p.y + by) };
    case "all":
      return { grain: "all" };
  }
}

/** Is this timestamp inside the period? `to` is exclusive. */
export function inPeriod(iso: string | null | undefined, p: Period): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (p.from && t < p.from.getTime()) return false;
  if (p.to && t >= p.to.getTime()) return false;
  return true;
}

/** Every year worth offering: from launch to a little past today. */
export function selectableYears(): number[] {
  const end = new Date().getFullYear() + 1;
  const years: number[] = [];
  for (let y = FIRST_YEAR; y <= end; y++) years.push(y);
  return years;
}

export const MONTH_NAMES = MONTHS;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
