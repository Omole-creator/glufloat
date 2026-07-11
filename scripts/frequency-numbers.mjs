/**
 * Give every food a frequency you can count.
 *
 * 236 of the 327 foods stored a frequency with no number in it ("Rare.",
 * "Occasional.", "Moderate.", "Good."), and lib/frequency.ts guessed a number
 * back out of those words at render time. Guessing had bugs: "Occasional; never
 * with sugar" (pap) matched "never" and told people not to eat pap at all, and
 * "Never, except hypo rescue" (glucose) matched "never" before "except", so the
 * one food meant for a sugar crash read as forbidden.
 *
 * After this pass the field itself holds the answer, in one of five shapes:
 *   "Never."
 *   "Never, except to treat a low sugar."
 *   "About 1 time a month."
 *   "About N times a week."
 *   "You can eat this every day."
 *
 * Run after scripts/plain-words.mjs.
 *
 *   node scripts/frequency-numbers.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "foods.json");

/** The one food that exists for a sugar crash. */
const HYPO = new Set(["glucose-lucozade"]);

/**
 * A food to skip whose portion offers no amount at all ("None at all.") is a
 * never, not a once-a-month. One that does offer a fallback amount ("...if you
 * do have it, two pieces at most") is a rare treat. The portion text is the
 * honest signal, so the two answers can never drift apart.
 */
function isNever(f) {
  if (f.portionIcon !== "avoid") return false;
  if (/if you do have it|unless/i.test(f.portionGuidance)) return false;
  return true;
}

/**
 * Mirror of canBeEveryday in lib/frequency.ts. Dietician rule: a food carrying
 * any sugar or starch is not a daily food, even when it is green.
 */
function canBeEveryday(f) {
  if (f.baseVerdict !== "green") return false;
  if (f.role === "vegetable" || f.role === "soup") return true;
  if (f.role === "protein" || f.role === "fat" || f.role === "condiment") return true;
  if (f.role === "drink" && f.gi === "low") return true;
  return false;
}

/** Hand-picked counts where a food deserves more than its role default. */
const OVERRIDES = {
  "lime-lemon": 5, // barely any sugar, just a squeeze
};

/**
 * Alcohol. Not a frequency the literature sets, but the ADA warns that alcohol
 * inhibits gluconeogenesis and can cause hypoglycaemia up to 24 hours later,
 * especially on insulin or secretagogues. Held at once a month. See
 * docs/EVIDENCE.md section 5.
 */
const ALCOHOL = new Set(["beer", "pito", "palm-wine", "local-gin"]);

/**
 * Salt and the seasoning cube carry no sugar and no starch, so the sugar/starch
 * gate does not apply to them. People cook with them every day; the limit is the
 * AMOUNT (WHO: under 5g salt a day), which the portion field carries. Saying
 * "about 3 times a week" for salt was never true. This is a narrow exception
 * keyed on a sugar-free, starch-free condiment, not a loosening of the gate.
 */
const DAILY_BUT_LIMITED = new Set(["salt", "seasoning-cube"]);

/**
 * How many times a week a food that cannot be daily may be eaten.
 *
 * Derived from the food's own measured facts (`role`, `gi`, `carbLoad`), never
 * from the old prose. The old text said eba "a few times a week" (3) while
 * pounded yam said 2, even though eba's measured GI (84) is HIGHER than pounded
 * yam's (81). Reading the prose reproduced that mistake; deriving from the
 * facts cannot.
 */
function capFor(f) {
  if (OVERRIDES[f.id]) return OVERRIDES[f.id];
  switch (f.role) {
    case "legume":
      // Measured GI 17-41 across Nigerian cowpea and African yam bean.
      return f.carbLoad === "high" ? 3 : 4;
    case "dairy":
      return f.baseVerdict === "green" ? 4 : 3;
    case "drink":
      // Liquid carbohydrate is absorbed fast. Any drink that is not plain and
      // low-GI (those are daily) is held at 2.
      return 2;
    case "fruit":
      return f.gi === "high" ? 2 : 3;
    case "sugar":
      return 0; // a month, not a week
    default:
      // starch, grain, tuber, and anything else.
      return f.gi === "high" ? 2 : 3;
  }
}

/**
 * How often, as a tier plus a weekly count.
 *   tier 0 never | 1 hypo only | 2 monthly | 3 weekly (perWeek) | 4 daily
 * Only the FIRST clause of the old text is read. The clauses after a comma or
 * a semicolon are advice ("never with sugar"), not the frequency, and reading
 * them is what produced the bugs above.
 */
/** Strictest first: tier 0 never ... tier 4 daily. Lower perWeek is stricter. */
function stricter(a, b) {
  if (a.tier !== b.tier) return a.tier < b.tier ? a : b;
  return (a.perWeek ?? 0) <= (b.perWeek ?? 0) ? a : b;
}

/** The answer the rule in docs/EVIDENCE.md gives, from the food's own facts. */
function fromRule(f) {
  if (f.role === "sugar") return { tier: 2 };
  if (f.baseVerdict === "red") return { tier: 2 };
  if (ALCOHOL.has(f.id)) return { tier: 2 };
  if (canBeEveryday(f)) return { tier: 4 };
  const n = capFor(f);
  return n === 0 ? { tier: 2 } : { tier: 3, perWeek: n };
}

/**
 * The answer already stored on the food, whether canonical ("About 2 times a
 * week.") or the original prose ("Rare.", "Occasional, small."). Returns null
 * when the text carries no usable answer.
 */
function fromStored(f) {
  const clause = f.frequency.toLowerCase().split(/[;,]/)[0].trim();
  if (/^never, except|hypo|emergency/.test(clause)) return { tier: 1 };
  if (/^never\b/.test(clause)) return { tier: 0 };
  if (/a month|\brare\b|\brarely\b|\btreat\b/.test(clause)) return { tier: 2 };
  const perWeek = clause.match(/(\d+)\s*times?\s*a\s*week/);
  if (perWeek) return { tier: 3, perWeek: Number(perWeek[1]) };
  if (/once a week/.test(clause)) return { tier: 3, perWeek: 1 };
  if (/a few times a week/.test(clause)) return { tier: 3, perWeek: 3 };
  if (/occasional/.test(clause)) return { tier: 3, perWeek: 2 };
  if (/moderate/.test(clause)) return { tier: 3, perWeek: 3 };
  if (/every day|daily|always|excellent|regular|decent|drink plenty|\bgood\b|\bok\b/.test(clause)) {
    return { tier: 4 };
  }
  return null;
}

/**
 * The asymmetry rule, applied to frequency (docs/EVIDENCE.md section 1).
 *
 * For most foods the rule may make a food STRICTER, never looser, because the
 * stored number carries dietitian judgement the rule cannot see: cow leg, kidney
 * and canned sardine are all green, sugar-free proteins, so the rule alone would
 * call them daily foods, ignoring the organ meat, the saturated fat and the
 * salt. Bacon and sausage are processed meat. Taking the stricter of the two
 * keeps that judgement.
 *
 * STARCH IS THE EXCEPTION, and the exception is the point.
 *
 * On a starch there is no such hidden judgement. The only thing that decides how
 * often you may eat eba is how fast it turns to sugar, and that is exactly what
 * `gi` and `carbLoad` already say. What the stored number carried on a starch was
 * not judgement, it was LEGACY PROSE ("a few times a week"), and keeping it is
 * what produced two bugs of the same shape:
 *
 *   - eba (measured GI 84) said 3 times a week while pounded yam (GI 81) said 2.
 *   - 23 of the 28 medium-GI starches said 2 while the rule said 3, so brown rice
 *     and ofada, the better swaps, were capped HARDER than parboiled rice. The
 *     card was telling people to eat less of the healthier rice.
 *
 * So for `role: "starch"` the rule wins outright. Every other role keeps
 * `stricter(rule, stored)`. Do not widen this exception to protein or dairy: the
 * salt and organ-meat judgement lives there and the rule is blind to it.
 */
function derive(f) {
  if (HYPO.has(f.id)) return { tier: 1 };
  if (isNever(f)) return { tier: 0 };
  // The two sugar-free, starch-free condiments. Used daily; the limit is the
  // amount, which the portion field carries. This is the one deliberate
  // loosening, and it is guarded by an assertion below.
  if (DAILY_BUT_LIMITED.has(f.id)) return { tier: 4 };

  const rule = fromRule(f);
  if (f.role === "starch") return rule;

  const stored = fromStored(f);
  return stored ? stricter(rule, stored) : rule;
}

function say({ tier, perWeek }) {
  if (tier === 0) return "Never.";
  if (tier === 1) return "Never, except to treat a low sugar.";
  if (tier === 2) return "About 1 time a month.";
  if (tier === 4) return "You can eat this every day.";
  return `About ${perWeek} times a week.`;
}

const foods = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(foods.map((f) => [f.id, f]));

let changed = 0;
for (const f of foods) {
  const next = say(derive(f));
  if (f.frequency !== next) {
    f.frequency = next;
    changed += 1;
  }
}

// A food that carries sugar or starch may never read "every day". The only
// exceptions are the sugar-free, starch-free condiments in DAILY_BUT_LIMITED,
// and each must really be free of both, or the gate has been loosened.
for (const id of DAILY_BUT_LIMITED) {
  const f = byId.get(id);
  if (!f || f.gi !== "low" || f.carbLoad !== "low" || f.role !== "condiment") {
    console.error(`${id} is not a sugar-free, starch-free condiment. It may not be daily.`);
    process.exit(1);
  }
}
const loose = foods.filter(
  (f) =>
    f.frequency.includes("every day") &&
    !canBeEveryday(f) &&
    !DAILY_BUT_LIMITED.has(f.id),
);
if (loose.length) {
  console.error(`these say "every day" but carry sugar or starch: ${loose.map((f) => f.id).join(", ")}`);
  process.exit(1);
}

// The starch exception in derive() lets the rule loosen a starch. Bound what it
// is allowed to loosen TO, so the exception can never drift into saying a fast
// food is fine. A high-GI starch is capped at 2 a week and a red one at monthly,
// whatever the rule computes.
const tooOften = foods.filter((f) => {
  if (f.role !== "starch") return false;
  const n = f.frequency.match(/About (\d+) times a week/);
  if (f.baseVerdict === "red" && n) return true;
  return f.gi === "high" && n && Number(n[1]) > 2;
});
if (tooOften.length) {
  console.error(
    `these turn to sugar fast but say too often: ${tooOften.map((f) => `${f.id} (${f.gi}/${f.baseVerdict}: ${f.frequency})`).join(", ")}`,
  );
  process.exit(1);
}

// Every answer must be countable.
const vague = foods.filter(
  (f) => !/^(Never\.|Never, except to treat a low sugar\.|About 1 time a month\.|About \d+ times a week\.|You can eat this every day\.)$/.test(f.frequency),
);
if (vague.length) {
  console.error(`not countable: ${vague.map((f) => `${f.id} (${f.frequency})`).join(", ")}`);
  process.exit(1);
}

// This pass reads the field it also writes, so it must be a fixed point: a
// second run may change nothing. Check it here rather than discover it when a
// food quietly drifts from once a month to twice a week.
const drifted = foods.filter((f) => say(derive(f)) !== f.frequency);
if (drifted.length) {
  console.error(`not idempotent, a re-run would change: ${drifted.map((f) => `${f.id} (${f.frequency} -> ${say(derive(f))})`).join(", ")}`);
  process.exit(1);
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");

const counts = {};
for (const f of foods) counts[f.frequency] = (counts[f.frequency] ?? 0) + 1;
console.log(`${changed} frequency value(s) rewritten.`);
console.table(counts);
