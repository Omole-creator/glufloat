// The clinician safety flag (lib/safetyFlag.ts). Run: npx tsx scripts/safety-flag-test.ts
import { safetyEvents, safetyBadge, safetyLine, FLAG_DAYS, beforeMealFlag, beforeLine, validTarget, mealPatternFlags, patternLine, type PatternMeal } from "../lib/safetyFlag";
import type { Reading } from "../lib/glucose";

let fail = 0;
const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log("FAIL", m); } else console.log("ok  ", m); };

const now = new Date("2026-10-14T12:00:00Z");
const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();
let id = 1;
const r = (mgdl: number, hoursAgo: number, mealCheckId: number | null = null, context: Reading["context"] = null): Reading =>
  ({ id: id++, mealCheckId, valueRaw: mgdl, unit: "mgdl", mgdl, takenAt: at(hoursAgo), context });

ok(safetyEvents([], now).length === 0, "no readings, no flag");
ok(safetyEvents([r(130, 5, 1, "before_meal"), r(180, 3, 1, "after_meal")], now).length === 0, "130 -> 180 is not flagged");
ok(safetyEvents([r(150, 5, 1, "before_meal"), r(200, 3, 1, "after_meal")], now).length === 0, "150 -> 200 is not flagged");
ok(safetyEvents([r(110, 5, 1, "before_meal"), r(260, 3, 1, "after_meal")], now).length === 0, "a big meal rise alone is not flagged");
ok(safetyEvents([r(70, 2)], now).length === 0, "exactly 70 is not under 70");
ok(safetyEvents([r(300, 2)], now).length === 0, "exactly 300 is not over 300");
ok(safetyEvents([r(69, 2)], now)[0]?.kind === "low", "69 is low");
ok(safetyEvents([r(301, 2)], now)[0]?.kind === "high", "301 is high");
ok(safetyEvents([r(50, 2, 4, "before_meal")], now)[0]?.kind === "low", "a low before a meal still counts");

const drop = safetyEvents([r(140, 5, 2, "before_meal"), r(95, 3, 2, "after_meal")], now);
ok(drop.length === 1 && drop[0].kind === "drop" && drop[0].beforeMgdl === 140, "140 -> 95 is a drop");
ok(safetyEvents([r(140, 5, 2, "before_meal"), r(110, 3, 2, "after_meal")], now).length === 0, "140 -> 110 ends over 100: no drop");
ok(safetyEvents([r(120, 5, 2, "before_meal"), r(95, 3, 2, "after_meal")], now).length === 0, "120 -> 95 falls only 25: no drop");
ok(safetyEvents([r(140, 5, 2, "before_meal"), r(95, 3, 3, "after_meal")], now).length === 0, "different meals are never compared");
ok(safetyEvents([r(95, 5, 2, "after_meal"), r(140, 3, 2, "before_meal")], now).length === 0, "a before test taken later is not 'before'");
ok(safetyEvents([r(140, 5, 2, "before_meal"), r(95, 3, null)], now).length === 0, "a loose test is not a drop");
const both = safetyEvents([r(140, 5, 2, "before_meal"), r(60, 3, 2, "after_meal")], now);
ok(both.length === 1 && both[0].kind === "low", "a drop under 70 counts once, as low");

ok(safetyEvents([r(40, FLAG_DAYS * 24 + 1)], now).length === 0, "older than the window is not flagged");
ok(safetyEvents([r(40, FLAG_DAYS * 24 - 1)], now).length === 1, "inside the window is flagged");

const many = safetyEvents([r(320, 30), r(60, 2), r(55, 50)], now);
ok(many[0].mgdl === 60, "newest first");
ok(safetyBadge(many) === "Under 70 + 2 more", "badge counts the rest");
ok(safetyBadge([]) === null, "no badge when nothing to flag");
const lines = many.map(safetyLine).join(" ") + safetyLine(drop[0]);
ok(!/caus|because|danger|bad|should|must/i.test(lines), "lines name no cause and give no order");
ok(/mg\/dL/.test(lines) && /mmol\/L/.test(lines), "lines carry both units");

// --- Mark as seen ---
const evs = [r(62, 10), r(320, 3)];
ok(safetyEvents(evs, now, at(5)).length === 1, "seen hides tests up to then, keeps a newer one");
ok(safetyEvents(evs, now, at(1)).length === 0, "seen after both hides both");
ok(safetyEvents([...evs, r(55, 0.5)], now, at(1)).length === 1, "a NEW low after seen flags again");
ok(safetyEvents(evs, now, null).length === 2, "never seen: all show");

// --- Before-meal flag ---
const bm = (v: number, h: number) => r(v, h, null, "before_meal");
ok(beforeMealFlag([bm(160, 1), bm(170, 30), bm(155, 60)], null, now) === null, "3 tests is not enough");
ok(beforeMealFlag([bm(160, 1), bm(170, 30), bm(155, 60), bm(120, 90)], null, now)?.above === 3, "3 of 4 above 150 flags");
ok(beforeMealFlag([bm(160, 1), bm(170, 30), bm(120, 60), bm(120, 90)], null, now) === null, "exactly half does not flag");
ok(beforeMealFlag([bm(160, 1), bm(170, 30), bm(155, 60), bm(120, 90)], 180, now) === null, "a clinician target of 180 is respected");
ok(beforeMealFlag([bm(140, 1), bm(140, 30), bm(140, 60), bm(140, 90)], 130, now)?.target === 130, "a target of 130 is respected");
ok(beforeMealFlag([bm(150, 1), bm(150, 30), bm(150, 60), bm(150, 90)], null, now) === null, "exactly the target is not above it");
ok(beforeMealFlag([bm(200, 1), bm(200, 2), bm(200, 3), bm(200, 31 * 24)], null, now) === null, "older than 30 days does not count");
ok(beforeMealFlag([r(200, 1), r(200, 2), r(200, 3), r(200, 4)], null, now) === null, "after-meal tests are not before-meal tests");
ok(validTarget(70) === null && validTarget(251) === null && validTarget(150) === 150 && validTarget(null) === null, "target bounds");
ok(beforeMealFlag([bm(160, 1), bm(170, 30), bm(155, 60), bm(120, 90)], 999, now)?.target === 150, "a bad target falls back to 150");
const bl = beforeLine({ total: 4, above: 3, target: 150 }, "Ada");
ok(/150 mg\/dL \(8\.3 mmol\/L\)/.test(bl) && !/caus|because|should|must/i.test(bl), "before line: both units, no cause or order");

// --- Meal pattern flag ---
let mid = 100;
const meal = (h: number, foodIds: string[] | null, label = "Eba, Egusi"): PatternMeal =>
  ({ id: mid++, kind: "meal", label, checkedAt: at(h), startedAt: at(h), foodIds });
function test(m: PatternMeal, b: number, a: number, minsAfter = 120): Reading[] {
  const start = new Date(m.startedAt as string).getTime();
  return [
    { id: id++, mealCheckId: m.id, valueRaw: b, unit: "mgdl", mgdl: b, takenAt: new Date(start - 5 * 60000).toISOString(), context: "before_meal" },
    { id: id++, mealCheckId: m.id, valueRaw: a, unit: "mgdl", mgdl: a, takenAt: new Date(start + minsAfter * 60000).toISOString(), context: "after_meal" },
  ];
}
const ms3 = [meal(200, ["eba", "egusi-soup"]), meal(100, ["egusi-soup", "eba"]), meal(10, ["eba", "egusi-soup"])];
const hi = [...test(ms3[0], 110, 235), ...test(ms3[1], 98, 210), ...test(ms3[2], 120, 260)];
const pf = mealPatternFlags(ms3, hi, now);
ok(pf.length === 1 && pf[0].tests.length === 3, "same plate (any food order) high 3 of 3 flags");
ok(mealPatternFlags(ms3.slice(0, 2), hi, now).length === 0, "2 tests is not enough");
const mixed = [meal(200, ["eba"]), meal(100, ["rice"]), meal(10, ["yam"])];
ok(mealPatternFlags(mixed, [...test(mixed[0], 110, 235), ...test(mixed[1], 98, 210), ...test(mixed[2], 120, 260)], now).length === 0, "three DIFFERENT meals never flag");
ok(mealPatternFlags(ms3, [...test(ms3[0], 110, 235), ...test(ms3[1], 130, 180), ...test(ms3[2], 120, 260)], now).length === 0, "130 to 180 (rise 50) breaks the pattern");
ok(mealPatternFlags(ms3, [...test(ms3[0], 160, 200), ...test(ms3[1], 160, 200), ...test(ms3[2], 160, 200)], now).length === 0, "high end but small rise does not flag");
ok(mealPatternFlags(ms3, [...test(ms3[0], 110, 235), ...test(ms3[1], 98, 210), ...test(ms3[2], 120, 260, 230)], now).length === 0, "a test near 4 hours is not complete");
const old = [meal(61 * 24, ["eba", "egusi-soup"]), ms3[1], ms3[2]];
ok(mealPatternFlags(old, [...test(old[0], 110, 235), ...test(ms3[1], 98, 210), ...test(ms3[2], 120, 260)], now).length === 0, "older than 60 days does not count");
const four = [meal(300, ["eba", "egusi-soup"]), ...ms3];
ok(mealPatternFlags(four, [...test(four[0], 100, 120), ...hi], now).length === 1, "an old good test does not cancel the latest 3");
ok(mealPatternFlags(ms3, [...test(ms3[0], 100, 120), ...hi.slice(2)], now).length === 0, "a good test among the latest 3 stops the flag");
const pl = patternLine(pf[0]);
ok(/110 to 235, 98 to 210, 120 to 260/.test(pl), "pattern line lists numbers oldest first");
ok(!/caus|because|should|must/i.test(pl), "pattern line names no cause");


console.log(fail ? `\n${fail} FAILED` : "\nAll passed");
process.exit(fail ? 1 : 0);
