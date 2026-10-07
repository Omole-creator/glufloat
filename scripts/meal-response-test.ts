/**
 * Meal tests (lib/mealResponse.ts): the meal + sugar before + sugar 2 hours
 * after record. Pure, so no server is needed.
 *
 *   npx tsx scripts/meal-response-test.ts
 *
 * Run it after ANY edit to lib/mealResponse.ts.
 */
import type { Reading } from "../lib/glucose";
import {
  OBSERVATION_NOTE,
  ateMore,
  beforeToLink,
  dueState,
  firstSentence,
  formatChange,
  mealTestFor,
  mealTestNumber,
  mealTestStats,
  minutesLabel,
  minutesToDue,
  mostLogged,
  observations,
  portionWords,
  type ObservedTest,
} from "../lib/mealResponse";

let failed = 0;
let passed = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

const T0 = Date.parse("2026-10-07T12:00:00Z"); // 1:00pm in Nigeria
const at = (min: number) => new Date(T0 + min * 60000).toISOString();
let nextId = 1;
const reading = (mgdl: number, min: number, extra: Partial<Reading> = {}): Reading => ({
  id: nextId++,
  mealCheckId: 124,
  valueRaw: mgdl,
  unit: "mgdl",
  mgdl,
  takenAt: at(min),
  ...extra,
});
const meal = (before: Reading[], after: Reading[], startedAt: string | null = at(0)) =>
  mealTestFor({ id: 124, kind: "meal", label: "Jollof Rice, Chicken", checkedAt: at(0), startedAt, before, after });

// ---- pairing --------------------------------------------------------------
{
  const t = meal([reading(108, -5)], [reading(132, 120)]);
  ok("her own example: 108 then 132 is +24", t.change === 24, String(t.change));
  ok("her own example is complete", t.complete);
  ok("minutes after is 120", t.minutesAfter === 120);
}
{
  const t = meal([], [reading(150, 120)]);
  ok("no before-test: no change", t.change === null);
  ok("no before-test: not complete", !t.complete);
  ok("no before-test: after is still kept", t.after?.mgdl === 150);
}
{
  const t = meal([reading(100, -2)], []);
  ok("before only: not complete", !t.complete && t.change === null && t.before?.mgdl === 100);
}
{
  const t = meal([reading(100, -2)], [reading(170, 300)]);
  ok("5-hour test is kept with its time", t.after?.mgdl === 170 && t.minutesAfter === 300);
  ok("5-hour test is NOT called a 2-hour result", !t.complete);
  ok("5-hour test still shows its change", t.change === 70);
}
{
  const t = meal([reading(100, -2)], [reading(160, 60), reading(140, 125)]);
  ok("the test nearest 2 hours wins", t.after?.mgdl === 140, String(t.after?.mgdl));
  ok("...and makes it complete", t.complete);
}
{
  const t = meal([reading(100, -2)], [reading(110, 10)]);
  ok("a test 10 minutes after is the same sitting, not a result", t.after === null);
}
{
  const t = meal([reading(100, -40), reading(104, -3)], [reading(130, 118)]);
  ok("the latest before-test is used", t.before?.mgdl === 104 && t.change === 26);
}
{
  // A meal logged the old way, after eating: the clock runs from the log time.
  const t = meal([], [reading(140, 100)], null);
  ok("no start time: clock runs from the log", t.minutesAfter === 100 && !t.started);
}
{
  const t = meal([reading(120, -1)], [reading(110, 120)]);
  ok("a fall is a negative change", t.change === -10);
}

// ---- formatting -----------------------------------------------------------
ok("format +24", formatChange(24) === "+24 mg/dL");
ok("format -6 uses a plain hyphen", formatChange(-6) === "-6 mg/dL");
ok("format 0", formatChange(0) === "0 mg/dL");
ok("record number is 6 digits", mealTestNumber(124) === "000124");
ok("minutes label", minutesLabel(130) === "2h 10m" && minutesLabel(120) === "2h" && minutesLabel(45) === "45m");

// Rule 1: a change is never graded. No verdict word may ever appear in it.
for (const n of [-80, -5, 0, 5, 24, 90, 250]) {
  const s = formatChange(n).toLowerCase();
  ok(`no grade word in ${n}`, !/(good|bad|high|low|normal|danger|safe|great)/.test(s), s);
}

// ---- the 2-hour clock ----------------------------------------------------
const start = at(0);
ok("at 30 minutes it is waiting", dueState(start, new Date(T0 + 30 * 60000)) === "waiting");
ok("at 1h50 it is due", dueState(start, new Date(T0 + 110 * 60000)) === "due");
ok("at 2h it is due", dueState(start, new Date(T0 + 120 * 60000)) === "due");
ok("at 3h59 it is still due", dueState(start, new Date(T0 + 239 * 60000)) === "due");
ok("at 4h01 it is over", dueState(start, new Date(T0 + 241 * 60000)) === "over");
ok("minutes to due at 30 minutes is 90", minutesToDue(start, new Date(T0 + 30 * 60000)) === 90);
ok("minutes to due never goes below 0", minutesToDue(start, new Date(T0 + 200 * 60000)) === 0);
ok("a broken time is over, not due", dueState("not a date") === "over");

// ---- linking a before-test saved in the sugar test box ---------------------
{
  const loose = [
    reading(99, -90, { mealCheckId: null, context: "before_meal" }), // too old
    reading(101, -20, { mealCheckId: null, context: "before_meal" }), // this one
    reading(140, -10, { mealCheckId: null, context: "other" }), // not a before-test
    reading(103, -5, { mealCheckId: 7, context: "before_meal" }), // already on a meal
  ];
  ok("links the loose before-test from the last hour", beforeToLink(loose, start)?.mgdl === 101);
  ok("links nothing when there is nothing", beforeToLink([], start) === null);
}

// ---- how much was eaten ----------------------------------------------------
const guide = "Half a cup of cooked rice (90g). Cook it with one teaspoon of oil.";
ok("first sentence is the amount", firstSentence(guide) === "Half a cup of cooked rice (90g).");
ok("normal size prints the GluFloat amount", portionWords("normal", guide) === "Half a cup of cooked rice (90g).");
ok("missing size is the GluFloat amount", portionWords(undefined, guide) === "Half a cup of cooked rice (90g).");
ok("half reads as less", portionWords("half", guide) === "less than the GluFloat size");
ok("large reads as more", portionWords("large", guide) === "more than the GluFloat size");
ok("grams stay grams", portionWords("163g", guide) === "163g");
ok("no guidance falls back", portionWords("normal", "") === "the GluFloat size");
ok("ate more is spotted", ateMore(["normal", "large"]) && !ateMore(["normal", "half"]) && !ateMore(null));

// ---- stats --------------------------------------------------------------------
{
  const tests = [
    meal([reading(108, -5)], [reading(132, 120)]),
    meal([], [reading(150, 120)]),
    meal([], []),
  ];
  const s = mealTestStats(tests);
  ok("stats count meals, tested and complete", s.meals === 3 && s.tested === 2 && s.complete === 1, JSON.stringify(s));
}

// ---- observations -------------------------------------------------------------
const obs = (shown: string, change: number, carbG: number | null, more = false, day = 0): ObservedTest => ({
  label: shown,
  shown,
  mealTime: at(day * 24 * 60),
  change,
  carbG,
  more,
});
ok("no meal tests, no observations (and no lonely note)", observations([]).length === 0);
{
  const lines = observations([obs("Eba, Okra Soup", 35, 60)]);
  ok("one test: only the largest line and the note", lines.length === 2 && lines[1] === OBSERVATION_NOTE);
  ok("largest line names the meal and the date", lines[0] === "The largest recorded change was +35 mg/dL, after Eba, Okra Soup on 7 Oct.", lines[0]);
}
{
  const lines = observations([
    obs("A", 40, 80, true, 1),
    obs("B", 44, 90, true, 2),
    obs("C", 10, 20, false, 3),
    obs("D", 14, 30, false, 4),
  ]);
  ok("portion line appears with 2 on each side", lines.some((l) => l.startsWith("After meals eaten bigger than the GluFloat size, the average recorded change was +42 mg/dL (2 meals). At the GluFloat size or less, it was +12 mg/dL (2 meals).")), lines.join(" | "));
  ok("starch line splits at the middle", lines.some((l) => l.startsWith("After the meals with the most starch (80g of carbohydrate or more), the average recorded change was +42 mg/dL. After the others, it was +12 mg/dL.")), lines.join(" | "));
  ok("the note is always last", lines[lines.length - 1] === OBSERVATION_NOTE);
}
{
  const lines = observations([obs("A", 40, 80, true), obs("C", 10, 20, false), obs("D", 14, 30, false)]);
  ok("portion line needs 2 on each side", !lines.some((l) => l.includes("bigger than the GluFloat size")));
  ok("starch line needs 4 meal tests", !lines.some((l) => l.includes("most starch")));
}
{
  const lines = observations([obs("Eba", 30, 60, false, 1), obs("Eba", 35, 60, false, 3), obs("Eba", 28, 60, false, 5)]);
  ok("a repeated meal lists its changes in date order", lines.includes("Eba was tested 3 times. The recorded changes were +30, +35, +28 mg/dL."), lines.join(" | "));
  ok("all-equal starch does not invent a split", !lines.some((l) => l.includes("most starch")));
}
// Rule 4: no observation ever blames a food or grades a number.
{
  const all = observations([
    obs("A", 40, 80, true, 1), obs("A", 44, 90, true, 2), obs("C", -10, 20, false, 3), obs("D", 14, 30, false, 4),
  ]).join(" ").toLowerCase();
  ok("no observation says caused / because / bad / good / high", !/\b(caus|because|bad|good|high|dangerous|unsafe|spike)/.test(all), all);
  ok("no em dash in observations", !all.includes("—"));
}

// ---- meal pattern -------------------------------------------------------------
{
  const top = mostLogged(["B", "A", "B", "C", "B", "A"], 2);
  ok("most logged first", top[0].label === "B" && top[0].count === 3 && top[1].label === "A" && top.length === 2);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
