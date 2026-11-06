/**
 * Which meal-idea plates were shown, and which were skipped, remembered on
 * the device (localStorage). Pulled out of components/TodaysMeal.tsx so that
 * lib/useTodaysCalories.ts can compute the SAME avoid-list `TodaysMeal`
 * does — see the top-of-file note in useTodaysCalories.ts for why the two
 * must agree.
 */

const SHOWN_KEY = "gf_meal_shown";
const REMEMBER_DAYS = 3;
type Shown = { day: string; index: number };
type ShownMap = Record<string, Shown[]>;

function readShown(meal: string): Shown[] {
  try {
    const all = JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}") as ShownMap;
    const v = all[meal];
    // An older version of this stored a single object, not a list.
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") return [v as Shown];
    return [];
  } catch {
    return [];
  }
}

export function writeShown(meal: string, day: string, index: number): void {
  try {
    const all = JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}") as ShownMap;
    const list = readShown(meal).filter((s) => s.day !== day);
    list.push({ day, index });
    all[meal] = list.slice(-REMEMBER_DAYS);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/** The plate shown for this meal today (its index), or null if none was. */
export function shownToday(meal: string, today: string): number | null {
  const hit = readShown(meal).find((s) => s.day === today);
  return hit ? hit.index : null;
}

// The plates this person pressed past with "Try another meal". A skip is the
// clearest thing they ever tell us about a plate, so we stop offering it. Kept
// to the last few, per meal, on the device: a food somebody did not want in
// March should not be locked out for ever.
const SKIPPED_KEY = "gf_meal_skipped";
const REMEMBER_SKIPS = 10;
// Never avoid so many that there is nothing left to choose from. The shortest
// list (breakfast) has 20 plates.
const MAX_AVOID = 12;

function readSkipped(meal: string): number[] {
  try {
    const all = JSON.parse(localStorage.getItem(SKIPPED_KEY) || "{}") as Record<
      string,
      number[]
    >;
    return Array.isArray(all[meal]) ? all[meal] : [];
  } catch {
    return [];
  }
}

export function writeSkipped(meal: string, index: number): void {
  try {
    const all = JSON.parse(localStorage.getItem(SKIPPED_KEY) || "{}") as Record<
      string,
      number[]
    >;
    const list = readSkipped(meal).filter((i) => i !== index);
    list.push(index);
    all[meal] = list.slice(-REMEMBER_SKIPS);
    localStorage.setItem(SKIPPED_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/**
 * The plates not to land on: the ones shown on the days BEFORE this one (so the
 * meal never repeats day to day), plus the ones this person skipped.
 */
export function toAvoid(meal: string, today: string): number[] {
  const shown = readShown(meal)
    .filter((s) => s.day !== today)
    .map((s) => s.index);
  const seen = new Set<number>(shown);
  for (const i of readSkipped(meal)) seen.add(i);
  return [...seen].slice(0, MAX_AVOID);
}

// Oat swallow's one card a day (founder and co-founder dietitian, 2026-11-06).
// Once it has been on a card today it is not offered at another meal, and once
// somebody presses "Try another meal" past it, not on this meal either.
const OAT_KEY = "gf_oat_card";
type OatCard = { day: string; meal: string; skipped?: boolean };

function readOat(): OatCard | null {
  try {
    return JSON.parse(localStorage.getItem(OAT_KEY) || "null") as OatCard | null;
  } catch {
    return null;
  }
}

/** Remember that today's oat swallow card was shown at this meal (the first one stands). */
export function writeOatShown(day: string, meal: string): void {
  try {
    if (readOat()?.day === day) return;
    localStorage.setItem(OAT_KEY, JSON.stringify({ day, meal }));
  } catch {
    /* ignore */
  }
}

/** They pressed past today's oat swallow card. */
export function markOatSkipped(day: string, meal: string): void {
  try {
    const now = readOat();
    localStorage.setItem(OAT_KEY, JSON.stringify({ day, meal: now?.day === day ? now.meal : meal, skipped: true }));
  } catch {
    /* ignore */
  }
}

/** Has oat swallow had its card today, for this meal's purposes? */
export function oatSkipFor(meal: string, day: string): boolean {
  const c = readOat();
  return !!c && c.day === day && (c.meal !== meal || !!c.skipped);
}
