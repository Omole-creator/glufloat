/**
 * Tests for blood sugar readings: the unit rule, the referral wording, and the
 * pattern line.
 *
 *   npx tsx scripts/glucose-test.ts
 *
 * Run this after ANY edit to lib/glucose.ts or lib/glucosePattern.ts.
 *
 * The unit half is the dangerous half. The app reads mmol or mg/dL off the size
 * of the number and never asks, so a wrong threshold silently files somebody's
 * 450 as a 25 and their worst reading of the month reads like their best. The
 * wording half is the other risk: these sentences are what keep Glufloat a food
 * app rather than something that diagnoses people.
 */
import {
  MMOL_CEILING,
  type Reading,
  dangerLine,
  detectUnit,
  echoLine,
  formatBoth,
  formatIn,
  gapLabel,
  parseReading,
  preferredUnit,
  toMgdl,
  toMmol,
} from "../lib/glucose";
import {
  ABOVE_USUAL_MGDL,
  HIGH_AVERAGE_MGDL,
  averageLine,
  foodPattern,
  personalUsual,
  readingHealth,
  readingVerdict,
  readingsByFood,
  recallLine,
} from "../lib/glucosePattern";
import { monthReportMessage } from "../lib/shareMessage";

let fail = 0;
const t = (name: string, ok: boolean, got?: string) => {
  console.log((ok ? "PASS  " : "FAIL  ") + name);
  if (!ok) {
    fail++;
    if (got !== undefined) console.log("        got: " + got);
  }
};

const r = (mgdl: number, over: Partial<Reading> = {}): Reading => ({
  id: 1,
  mealCheckId: 10,
  valueRaw: mgdl,
  unit: "mgdl",
  mgdl,
  takenAt: "2026-07-28T10:00:00.000Z",
  ...over,
});

// ---------------------------------------------------------------------------
// The unit rule. A glucometer stops giving a number at 33.3 mmol/L, so 34 and
// over cannot be mmol, and under 34 cannot be a reading somebody typed in mg/dL.
// ---------------------------------------------------------------------------

console.log("\n-- which unit --");
t("6.5 is mmol", detectUnit(6.5) === "mmol", detectUnit(6.5));
t("140 is mg/dL", detectUnit(140) === "mgdl", detectUnit(140));
t("33.3, the meter ceiling, is mmol", detectUnit(MMOL_CEILING) === "mmol");
t("33.9 is still mmol", detectUnit(33.9) === "mmol", detectUnit(33.9));
t("34 is mg/dL", detectUnit(34) === "mgdl", detectUnit(34));
t("450 is mg/dL", detectUnit(450) === "mgdl");
t(
  "the threshold sits above the meter ceiling",
  detectUnit(MMOL_CEILING) === "mmol" && detectUnit(34) === "mgdl",
);

console.log("\n-- converting --");
t("6.5 mmol is 117 mg/dL", toMgdl(6.5, "mmol") === 117, String(toMgdl(6.5, "mmol")));
t("140 mg/dL is left alone", toMgdl(140, "mgdl") === 140);
t("25 mmol is 450 mg/dL, not 25", toMgdl(25, "mmol") === 450, String(toMgdl(25, "mmol")));
t("117 mg/dL reads back as 6.5 mmol", toMmol(117) === 6.5, String(toMmol(117)));
// Rounding the factor to 18 loses a point at the top of the range, which is
// exactly where a reading matters most: 33.3 would come out as 599, not 600.
t("the real factor is used, not 18", toMgdl(33.3, "mmol") === 600, String(toMgdl(33.3, "mmol")));
{
  // Every value a meter can show, typed and read back, must land on itself.
  let worst = 0;
  for (let v = 1; v <= 333; v++) {
    const mmol = v / 10;
    const back = toMmol(toMgdl(mmol, "mmol"));
    worst = Math.max(worst, Math.abs(back - mmol));
  }
  t("every mmol value round trips to itself", worst < 0.06, `worst drift ${worst.toFixed(3)}`);
}

console.log("\n-- what the box will not take --");
for (const bad of ["", " ", "abc", "-5", "0", "0.5", "1000", "6.555", "6,5", "12e3", "NaN", "6 5"]) {
  t(`refuses ${JSON.stringify(bad)}`, parseReading(bad) === null, JSON.stringify(parseReading(bad)));
}
for (const good of ["6", "6.5", "117.5", "140", "999", "1"]) {
  t(`takes ${JSON.stringify(good)}`, parseReading(good) !== null);
}
t("a typed value is kept exactly as typed", parseReading("6.5")?.valueRaw === 6.5);
t("and stored as mg/dL beside it", parseReading("6.5")?.mgdl === 117);

console.log("\n-- saying it back --");
t(
  "both units, every time",
  formatBoth(240) === "240 mg/dL (13.3 mmol/L)",
  formatBoth(240),
);
t(
  "the echo names what they typed first",
  echoLine(parseReading("6.5")!) === "Got it. 6.5 mmol/L, the same as 117 mg/dL.",
  echoLine(parseReading("6.5")!),
);
t(
  "and the other way round for a mg/dL meter",
  echoLine(parseReading("140")!) === "Got it. 140 mg/dL, the same as 7.8 mmol/L.",
  echoLine(parseReading("140")!),
);
t("no em dash in the echo", !echoLine(parseReading("6.5")!).includes("—"));
t(
  "their own unit is read off their own rows",
  preferredUnit([r(117, { unit: "mmol" }), r(130, { unit: "mmol" }), r(200)]) === "mmol",
);
t("and falls to mg/dL when there is nothing to go on", preferredUnit([]) === "mgdl");

// ---------------------------------------------------------------------------
// The referral. It must fire when a reading is far out, stay quiet otherwise,
// and never name a condition, print a cut-off, or tell anybody what to take.
// ---------------------------------------------------------------------------

console.log("\n-- the referral line --");
t("speaks up on a low reading", dangerLine(50) !== null);
t("speaks up on a very high one", dangerLine(400) !== null);
t("says nothing about an ordinary one", dangerLine(140) === null);
t("says nothing at 100", dangerLine(100) === null);
t("says nothing at 250", dangerLine(250) === null);
t("a low reading is sent for help now", (dangerLine(50) ?? "").includes("get help now"));
t("a high one is sent today", (dangerLine(400) ?? "").includes("today"));
{
  const lines = [dangerLine(50)!, dangerLine(400)!];
  // The cut-offs are house numbers for deciding whether to speak. Printing one
  // turns the sentence into a verdict on the person.
  t("no cut-off number is printed", lines.every((l) => !/\d/.test(l)), lines.join(" | "));
  // Naming a condition, or grading the number, is the diagnosis line.
  const banned = [
    "hypo",
    "hyper",
    "normal",
    "abnormal",
    "high blood sugar",
    "low blood sugar",
    "diabetic",
    "emergency",
    "dangerous",
    "insulin",
    "dose",
    "tablet",
    "eat sugar",
    "glucose",
  ];
  for (const w of banned) {
    t(
      `never says "${w}"`,
      lines.every((l) => !l.toLowerCase().includes(w)),
      lines.join(" | "),
    );
  }
  t("both hand the person to a doctor or nurse", lines.every((l) => /doctor or nurse/.test(l)));
  t("both say what Glufloat is for", lines.every((l) => l.includes("only helps with food")));
  t("no em dash", lines.every((l) => !l.includes("—")));
}

// ---------------------------------------------------------------------------
// The gap, for the doctor report.
// ---------------------------------------------------------------------------

console.log("\n-- how long after the food --");
const at = (h: number, m = 0) =>
  new Date(Date.UTC(2026, 6, 28, h, m)).toISOString();
t("2h 10m", gapLabel(at(8), at(10, 10)) === "2h 10m later", String(gapLabel(at(8), at(10, 10))));
t("a round hour drops the minutes", gapLabel(at(8), at(10)) === "2h later");
t("under an hour", gapLabel(at(8), at(8, 45)) === "45m later");
t("logged in one sitting says nothing", gapLabel(at(8), at(8, 1)) === null);
t("a reading before the food says nothing", gapLabel(at(10), at(8)) === null);
t("a day later says nothing about that meal", gapLabel(at(8), at(20)) === null);
t("nonsense dates say nothing", gapLabel("not a date", at(8)) === null);

// ---------------------------------------------------------------------------
// The pattern. Silence is the default and has to be earned out of.
// ---------------------------------------------------------------------------

console.log("\n-- grouping readings under foods --");
{
  const byFood = readingsByFood([
    { kind: "single", label: "Garri / Eba (cassava swallow)", readings: [r(240)] },
    { kind: "meal", label: "White Rice, Efo Riro, Fish (Titus / Mackerel)", readings: [r(200)] },
    { kind: "single", label: "Garri / Eba (cassava swallow)", readings: [r(255)] },
    { kind: "single", label: "Apple", readings: [] },
  ]);
  t("two readings found for eba", byFood.get("Garri / Eba (cassava swallow)")?.length === 2);
  t("a plate credits every food on it", byFood.get("Efo Riro")?.length === 1);
  t("a food with no reading is absent", !byFood.has("Apple"));
  t(
    "a single food name is never split on its own commas",
    readingsByFood([
      { kind: "single", label: "Seeds (pumpkin, sunflower, flax, chia)", readings: [r(120)] },
    ]).has("Seeds (pumpkin, sunflower, flax, chia)"),
  );
}

console.log("\n-- the usual number --");
t("four readings are not enough for a usual", personalUsual([r(100), r(110), r(120), r(130)]) === null);
t("five are", personalUsual([r(100), r(110), r(120), r(130), r(140)]) === 120);
t(
  "a reading with no meal still counts towards it",
  personalUsual([
    r(100, { mealCheckId: null }),
    r(110),
    r(120),
    r(130),
    r(140),
  ]) === 120,
);

console.log("\n-- when the pattern may speak --");
const usual = 180;
const high = [240, 255, 231];
t("silent on one reading for the food", foodPattern("Eba", [240], usual) === null);
t("silent with no usual to compare against", foodPattern("Eba", high, null) === null);
t("silent when the food sits at their usual", foodPattern("Eba", [185, 190], usual) === null);
t(
  `silent just under the ${ABOVE_USUAL_MGDL} gap`,
  foodPattern("Eba", [usual + ABOVE_USUAL_MGDL - 2, usual + ABOVE_USUAL_MGDL - 2], usual) === null,
);
t(
  "speaks at the gap",
  foodPattern("Eba", [usual + ABOVE_USUAL_MGDL, usual + ABOVE_USUAL_MGDL], usual) !== null,
);
t("speaks on two clearly higher readings", foodPattern("Eba", high, usual) !== null);
t("reads out at most three numbers", foodPattern("Eba", [240, 255, 231, 260, 249], usual)!.values.length === 3);

console.log("\n-- what the pattern is allowed to say --");
{
  const p = foodPattern("Eba", high, usual)!;
  t("it names the food", p.text.includes("Eba"), p.text);
  t("it reads their numbers out", p.text.includes("240, 255, 231"), p.text);
  t("it compares them with their own usual", p.text.includes("your usual"), p.text);
  t("it sends the question to a doctor", p.text.includes("doctor"), p.text);
  // Rule 2: the food is never accused, and rule 4: nobody is told what to do.
  const banned = [
    "avoid",
    "spike",
    "stop eating",
    "do not eat",
    "bad for you",
    "normal",
    "high blood sugar",
    "dangerous",
    "unhealthy",
    "you should",
  ];
  for (const w of banned) {
    t(`never says "${w}"`, !p.text.toLowerCase().includes(w), p.text);
  }
  t("no em dash", !p.text.includes("—"), p.text);
  t("no semicolon joining two ideas", !p.text.includes(";"), p.text);
  t(
    "it speaks in the person's own unit when that is mmol",
    foodPattern("Eba", high, usual, "mmol")!.text.includes("mmol/L"),
    foodPattern("Eba", high, usual, "mmol")!.text,
  );
  t(
    "and never mixes the two units in one line",
    !foodPattern("Eba", high, usual, "mmol")!.text.includes("mg/dL"),
  );
}

console.log("\n-- the recall line, which works from one reading --");
t("nothing to recall", recallLine([]) === null);
t(
  "one reading",
  recallLine([240]) === "Last time you ate this, your sugar test was 240 mg/dL.",
  String(recallLine([240])),
);
t(
  "three readings",
  recallLine([240, 255, 231]) ===
    "Your last 3 sugar tests after this food: 240, 255, 231 mg/dL.",
  String(recallLine([240, 255, 231])),
);
t("said in their own unit", (recallLine([240], "mmol") ?? "").includes("13.3 mmol/L"));
// On a whole plate, "this" would be ambiguous, so the food is named.
t(
  "one reading on a plate names the food",
  recallLine([240], "mgdl", "White Rice") ===
    "Last time you ate White Rice, your sugar test was 240 mg/dL.",
  String(recallLine([240], "mgdl", "White Rice")),
);
t(
  "several readings on a plate name the food",
  recallLine([240, 255], "mgdl", "White Rice") ===
    "Your last 2 sugar tests after White Rice: 240, 255 mg/dL.",
  String(recallLine([240, 255], "mgdl", "White Rice")),
);
{
  // No colour and no grade on a number, ever. That is the rule that keeps this
  // out of medical device territory.
  const lines = [recallLine([240])!, recallLine([240, 255, 231])!];
  for (const w of ["green", "yellow", "red", "high", "low", "normal", "good", "bad"]) {
    t(`recall never says "${w}"`, lines.every((l) => !l.toLowerCase().includes(w)), lines.join(" | "));
  }
  t("no em dash", lines.every((l) => !l.includes("—")));
}

console.log("\n-- a reading with no meal survives every path --");
{
  const loose = r(150, { mealCheckId: null });
  t("it groups under no food", readingsByFood([]).size === 0);
  t("it still formats", formatBoth(loose.mgdl) === "150 mg/dL (8.3 mmol/L)", formatBoth(loose.mgdl));
  t("it still counts towards the usual", personalUsual([loose, r(150), r(150), r(150), r(150)]) === 150);
  t("it has no gap to print", loose.mealCheckId === null);
  t("it reads in either unit", formatIn(loose.mgdl, "mmol") === "8.3 mmol/L", formatIn(loose.mgdl, "mmol"));
}

// ---------------------------------------------------------------------------
// The doctor report's WhatsApp text, which is one of the THREE surfaces that
// must tell one story (the screen, the PDF, and this). Cheap to check, and the
// only one of the three a test can reach.
// ---------------------------------------------------------------------------

console.log("\n-- readings reach the doctor --");
{
  const text = monthReportMessage(
    { total: 1, green: 0, yellow: 1, red: 0 },
    [
      {
        label: "Garri / Eba (cassava swallow)",
        verdict: "yellow",
        kind: "single",
        checkedAt: at(8),
        readings: [r(240, { takenAt: at(10, 10) })],
      },
    ],
    [r(150, { mealCheckId: null, takenAt: at(6, 30) })],
  );
  t("the meal's reading is in the text", text.includes("Sugar test: 240 mg/dL (13.3 mmol/L)"), text);
  t("with how long after the food", text.includes("2h 10m later"), text);
  t("a reading with no meal has its own block", text.includes("not after a meal"), text);
  t("and is dated", text.includes("150 mg/dL (8.3 mmol/L), 28 Jul"), text);
  t("the food still reads as a person says it", text.includes("Garri or Eba"), text);
  t("no em dash anywhere", !text.includes("—"), text);
  // Nothing may grade the number here either.
  for (const w of ["normal", "too high", "dangerous", "avoid"]) {
    t(`the text never says "${w}"`, !text.toLowerCase().includes(w));
  }
}
{
  // A month with no readings at all must read exactly as it did before.
  const text = monthReportMessage(
    { total: 1, green: 1, yellow: 0, red: 0 },
    [
      {
        label: "Apple",
        verdict: "green",
        kind: "single",
        checkedAt: at(8),
        readings: [],
      },
    ],
  );
  t("no readings means no reading lines", !text.includes("Sugar test"), text);
  t("and no empty block", !text.includes("not after a meal"), text);
}

// ---------------------------------------------------------------------------
// Their own average, which catches the person both other mechanisms miss: the
// one who is consistently high. dangerLine only fires above 300 and they may
// never cross it; foodPattern compares them with their own usual, and their
// usual IS high, so it stays silent too.
// ---------------------------------------------------------------------------

console.log("\n-- their own average --");
const NOW = Date.UTC(2026, 6, 28, 12, 0);
const ago = (days: number) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const many = (n: number, mgdl: number, days = 1) =>
  Array.from({ length: n }, (_, i) => r(mgdl, { id: i + 1, takenAt: ago(days) }));

t("nine tests are too few", averageLine(many(9, 260), "mgdl", NOW) === null);
t("ten are enough", averageLine(many(10, 260), "mgdl", NOW) !== null);
t(
  `an average under ${HIGH_AVERAGE_MGDL} says nothing`,
  averageLine(many(12, HIGH_AVERAGE_MGDL - 1), "mgdl", NOW) === null,
);
t(
  "at the line it speaks",
  averageLine(many(12, HIGH_AVERAGE_MGDL), "mgdl", NOW) !== null,
);
t(
  "tests older than a month do not count",
  averageLine(many(12, 260, 40), "mgdl", NOW) === null,
);
{
  // The exact person this exists for: never above 300, so dangerLine is silent,
  // and their usual is 260, so foodPattern is silent.
  const rows = many(12, 260);
  t("none of these would trip the referral", rows.every((x) => dangerLine(x.mgdl) === null));
  const usual = personalUsual(rows)!;
  t("and their usual is high, so the pattern stays quiet", foodPattern("Eba", [260, 260], usual) === null);
  const line = averageLine(rows, "mgdl", NOW)!;
  t("but the average line speaks", line !== null);
  t("it gives their own number", line.text.includes("260 mg/dL"), line.text);
  t("and how many tests it is from", line.text.includes("12 sugar tests"), line.text);
  t("and sends them to a doctor", line.text.includes("doctor"), line.text);
  for (const w of ["high", "too", "normal", "danger", "bad", "control", "avoid", "should"]) {
    t(`never says "${w}"`, !line.text.toLowerCase().includes(w), line.text);
  }
  t("no em dash", !line.text.includes("—"));
  t(
    "said in their own unit",
    averageLine(rows, "mmol", NOW)!.text.includes("mmol/L"),
    averageLine(rows, "mmol", NOW)!.text,
  );
}

// ---------------------------------------------------------------------------
// The admin readiness maths. This is what tells the founder whether the feature
// is working, so it must use the SAME thresholds the app uses and must never
// report somebody as warnable when the app would stay silent for them.
// ---------------------------------------------------------------------------

console.log("\n-- is the feature working (admin) --");
const row = (userId: string, label: string | null, kind: "single" | "meal" | null = "single") => ({
  userId,
  mealCheckId: label === null ? null : 1,
  kind,
  label,
});
{
  const h = readingHealth([]);
  t("nothing yet", h.people === 0 && h.ready === 0 && h.median === 0);
  t("and it says so plainly", readingVerdict(h).includes("Nobody has saved a sugar test yet"), readingVerdict(h));
}
{
  // Five tests, but every one after a different food, so no food reaches two and
  // the app would say nothing. The dashboard must agree.
  const h = readingHealth([
    row("a", "Eba"),
    row("a", "White Rice"),
    row("a", "Jollof Rice"),
    row("a", "Bread"),
    row("a", "Yam"),
  ]);
  t("five tests, all different foods, is not ready", h.ready === 0, String(h.ready));
  t("but the person is counted", h.people === 1 && h.repeat === 1);
  t("and the verdict names what is still missing", readingVerdict(h).includes("2 tests after the same food"), readingVerdict(h));
}
{
  // Two after the same food, but only four in all: no usual number yet.
  const h = readingHealth([row("a", "Eba"), row("a", "Eba"), row("a", "Yam"), row("a", "Bread")]);
  t("same food twice but too few overall is not ready", h.ready === 0, String(h.ready));
}
{
  const h = readingHealth([
    row("a", "Eba"),
    row("a", "Eba"),
    row("a", "Yam"),
    row("a", "Bread"),
    row("a", "White Rice"),
  ]);
  t("two after one food plus five in all IS ready", h.ready === 1, String(h.ready));
  t(
    "and the verdict says the app can now show them",
    readingVerdict(h).includes("show them how their own sugar behaved"),
    readingVerdict(h),
  );
  t("one person reads as has, not have", readingVerdict(h).startsWith("1 person now has"), readingVerdict(h));
}
{
  // A plate credits every food on it, the same rule the app uses.
  const h = readingHealth([
    row("a", "White Rice, Efo Riro, Fish", "meal"),
    row("a", "White Rice, Moi Moi", "meal"),
    row("a", "Yam"),
    row("a", "Bread"),
    row("a", "Apple"),
  ]);
  t("a food repeated across two plates counts", h.ready === 1, String(h.ready));
}
{
  // Readings with no meal count towards the total but can never make a food
  // reach two, because they belong to no food.
  const h = readingHealth([
    row("a", null, null),
    row("a", null, null),
    row("a", null, null),
    row("a", null, null),
    row("a", null, null),
  ]);
  t("five loose tests are not ready", h.ready === 0, String(h.ready));
  t("all five are counted as loose", h.loose === 5 && h.attached === 0);
}
{
  // One keen person must not make the middle look busy.
  const h = readingHealth([
    ...Array.from({ length: 40 }, () => row("keen", "Eba")),
    row("b", "Yam"),
    row("c", "Yam"),
  ]);
  t("three people", h.people === 3);
  t("the average would flatter, the median does not", h.median === 1, String(h.median));
  t("only the keen one is ready", h.ready === 1, String(h.ready));
  t("came back for a second counts only the keen one", h.repeat === 1, String(h.repeat));
}

console.log(fail === 0 ? "\nAll good.\n" : `\n${fail} FAILED\n`);
process.exit(fail === 0 ? 0 : 1);
