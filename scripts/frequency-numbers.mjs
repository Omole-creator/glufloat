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
  "moi-moi": 4,
  ekuru: 4,
  "cooked-beans": 4,
  "ewa-agoyin": 4,
  okpa: 4,
  "dan-wake": 4,
  ukwa: 4,
  "fio-fio": 4,
  oats: 4,
  "lime-lemon": 5,
};

/** How many times a week a food that cannot be daily may be eaten. */
function capFor(f) {
  if (OVERRIDES[f.id]) return OVERRIDES[f.id];
  switch (f.role) {
    case "legume":
      return f.carbLoad === "high" ? 3 : 4;
    case "dairy":
      return 4;
    case "fruit":
      return f.gi === "high" ? 2 : 3;
    case "sugar":
      return 0; // a month, not a week
    default:
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
function derive(f) {
  if (HYPO.has(f.id)) return { tier: 1 };
  if (isNever(f)) return { tier: 0 };

  const clause = f.frequency.toLowerCase().split(/[;,]/)[0].trim();
  const dailyOrCap = () => {
    if (canBeEveryday(f)) return { tier: 4 };
    const n = capFor(f);
    return n === 0 ? { tier: 2 } : { tier: 3, perWeek: n };
  };

  if (/^never\b/.test(clause)) return { tier: 0 };
  // Recognise this pass's own output first, or a re-run silently loosens a
  // monthly food: "About 1 time a month." matches no other rule, falls through
  // to the colour fallback, and beer/palm wine/pito jump to 2 times a week.
  if (/a month/.test(clause)) return { tier: 2 };
  if (/\brare\b|\brarely\b|\btreat\b/.test(clause)) return { tier: 2 };

  const perWeek = clause.match(/(\d+)\s*times?\s*a\s*week/);
  if (perWeek) return { tier: 3, perWeek: Number(perWeek[1]) };
  if (/once a week/.test(clause)) return { tier: 3, perWeek: 1 };
  if (/a few times a week/.test(clause)) return { tier: 3, perWeek: 3 };
  if (/occasional/.test(clause)) return { tier: 3, perWeek: 2 };
  if (/moderate/.test(clause)) return { tier: 3, perWeek: 3 };
  if (/every day|daily|always|excellent|regular|decent|drink plenty|\bgood\b|\bok\b/.test(clause)) {
    return dailyOrCap();
  }

  // No usable words. Fall back on the colour.
  if (f.baseVerdict === "green") return dailyOrCap();
  if (f.baseVerdict === "yellow") return { tier: 3, perWeek: 2 };
  return { tier: 2 };
}

function say({ tier, perWeek }) {
  if (tier === 0) return "Never.";
  if (tier === 1) return "Never, except to treat a low sugar.";
  if (tier === 2) return "About 1 time a month.";
  if (tier === 4) return "You can eat this every day.";
  return `About ${perWeek} times a week.`;
}

const foods = JSON.parse(readFileSync(FILE, "utf8"));

let changed = 0;
for (const f of foods) {
  const next = say(derive(f));
  if (f.frequency !== next) {
    f.frequency = next;
    changed += 1;
  }
}

// A green food that carries sugar or starch may never read "every day".
const loose = foods.filter(
  (f) => f.frequency.includes("every day") && !canBeEveryday(f),
);
if (loose.length) {
  console.error(`these say "every day" but carry sugar or starch: ${loose.map((f) => f.id).join(", ")}`);
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
