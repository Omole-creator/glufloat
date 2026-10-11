/**
 * A flag for a clinician, never a change to anyone's food (founder agreed,
 * 2026-10-11, instead of nudging the calorie target automatically).
 *
 * Weight moves for many reasons the app cannot see: insulin and some tablets
 * add weight, water comes and goes, illness takes it off, and a pharmacy scale
 * can disagree with a home one by a kilo or two. So the app does not act on it.
 * It only notices when weight has gone the wrong way for two months running,
 * by a clear amount, and puts that in front of a person who can judge it: the
 * doctor's report and the Premium dietitian chat.
 *
 * Pure (no I/O) so scripts/weight-trend-test.ts proves every rule. Like a
 * sugar test, it states the numbers and never grades them.
 */
import type { Goal } from "./personalization";

export interface WeightPoint {
  kg: number;
  at: string; // ISO time
}

export interface WeightFlag {
  /** The three weigh-ins compared, oldest first, about a month apart. */
  points: [WeightPoint, WeightPoint, WeightPoint];
  /** Which way the weight actually went. */
  moved: "up" | "down";
  /** What the person's goal asks for. */
  goal: "lose" | "gain" | "steady";
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Two weigh-ins count as "a month apart" from this many days. */
const MONTH_GAP_DAYS = 25;
/** Each month must move at least this much, so one wobble is not a trend. */
const STEP_KG = 0.5;
/** And the two months together at least this much, past scale noise. */
const TOTAL_KG = 2;

/** What the goal asks of weight. Gain only counts when it adds food (underweight). */
export function weightGoal(goals: Goal[], bmi: number | null): WeightFlag["goal"] {
  if (goals.includes("lose_weight")) return "lose";
  if (goals.includes("gain_weight") && bmi !== null && bmi < 18.5) return "gain";
  return "steady";
}

/** The latest point at or before `before` (ms), or null. Points sorted oldest first. */
function lastBefore(points: WeightPoint[], before: number): WeightPoint | null {
  let found: WeightPoint | null = null;
  for (const p of points) if (new Date(p.at).getTime() <= before) found = p;
  return found;
}

/**
 * The flag, or null. Needs three weigh-ins: the newest, one a month or more
 * before it, and one a month or more before that. Both months must move the
 * wrong way by at least STEP_KG, and the two together by at least TOTAL_KG.
 * "Wrong way": up when losing, down when gaining, either way (the same way
 * both months) when keeping weight steady.
 */
export function weightFlag(history: WeightPoint[], goal: WeightFlag["goal"]): WeightFlag | null {
  const pts = [...history]
    .filter((p) => Number.isFinite(p.kg) && !Number.isNaN(new Date(p.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  if (pts.length < 3) return null;
  const last = pts[pts.length - 1];
  const mid = lastBefore(pts, new Date(last.at).getTime() - MONTH_GAP_DAYS * DAY_MS);
  if (!mid) return null;
  const first = lastBefore(pts, new Date(mid.at).getTime() - MONTH_GAP_DAYS * DAY_MS);
  if (!first) return null;

  const step1 = mid.kg - first.kg;
  const step2 = last.kg - mid.kg;
  const total = last.kg - first.kg;
  const rose = step1 >= STEP_KG && step2 >= STEP_KG && total >= TOTAL_KG;
  const fell = step1 <= -STEP_KG && step2 <= -STEP_KG && total <= -TOTAL_KG;

  const wrong =
    goal === "lose" ? rose : goal === "gain" ? fell : rose || fell;
  if (!wrong) return null;
  return { points: [first, mid, last], moved: rose ? "up" : "down", goal };
}

const GOAL_WORDS: Record<WeightFlag["goal"], string> = {
  lose: "lose weight",
  gain: "gain weight",
  steady: "keep weight steady",
};

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * One plain line for the doctor's report, the PDF and the WhatsApp text (the
 * same words in all three, house rule). Numbers and dates only, no verdict.
 */
export function weightFlagLine(f: WeightFlag): string {
  const [a, b, c] = f.points;
  return (
    `Weight: ${a.kg} kg on ${day(a.at)}, ${b.kg} kg on ${day(b.at)}, ${c.kg} kg on ${day(c.at)}. ` +
    `It went ${f.moved} 2 months in a row. Goal in GluFloat: ${GOAL_WORDS[f.goal]}.`
  );
}
