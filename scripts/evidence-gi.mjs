/**
 * Correct `gi` and `baseVerdict` where a measured glycaemic index contradicts
 * what the data says. Sources and reasoning live in docs/EVIDENCE.md; nothing
 * here is ever shown to a user.
 *
 * Asymmetry rule (see EVIDENCE.md §1): a food may be marked WORSE on a single
 * credible in-vivo measurement, but may only be marked BETTER on two
 * independent sources. Under-calling risk harms someone; over-calling it only
 * inconveniences them. Every change below is a tightening.
 *
 * GI bands are ISO 26642-2010: low <=55, medium 56-69, high >=70.
 *
 * Run FIRST, before frequency-numbers.mjs, which derives the weekly count from
 * `gi` and `baseVerdict`.
 *
 *   node scripts/evidence-gi.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "foods.json");

/**
 * id -> { gi, baseVerdict, logicNote, why }
 * `why` is the measurement, kept here so the next reader does not have to trust
 * the diff. It is a code comment, not user copy.
 */
const CORRECTIONS = {
  "boiled-plantain-unripe": {
    gi: "high",
    baseVerdict: "yellow",
    logicNote:
      "Many people think unripe plantain is safe because it is not sweet. It still pushes your sugar up fast. Keep to the size shown below, and always eat it with vegetables and fish, meat, or egg.",
    // The matching portion tightening (three slices / 100g, down from four or
    // five / 120g) does NOT live here. `portionGuidance` has exactly one owner,
    // scripts/clear-instructions.mjs, which runs LAST and would silently stomp
    // anything this script wrote. One field, one owner.
    why: "boiled unripe plantain measured GI 89 (SW Nigeria, n=80, paper read in full). 'low GI / green' was not defensible. Secondary summaries putting unripe plantain at 45-52 are measuring plantain FLOUR (amala), a different food: drying changes the starch. Do not loosen this on such a summary.",
  },
  "unripe-plantain-porridge": {
    gi: "high",
    baseVerdict: "yellow",
    logicNote:
      "Unripe plantain with plenty of vegetables is a good Nigerian meal, but the plantain is still a starch. Keep to the size shown below.",
    why: "same plantain base as above.",
  },
  "boiled-plantain-ripe": {
    gi: "high",
    why: "boiled plantain measured GI 96.5. Ripe is not gentler than unripe.",
  },
  boli: {
    gi: "high",
    logicNote:
      "Roasted plantain turns to sugar fast. Unripe boli with groundnut is the friendlier version, but keep to the size shown below.",
    why: "roasted plantain measured GI 92.0.",
  },
  "wheat-swallow": {
    gi: "high",
    logicNote:
      "Wheat swallow has more of the rough part of food than semo or eba, but it still turns to sugar fast. Keep to one fist-size ball.",
    why: "wheat flour dough measured GI 97.4 (Nigerian J. Nutritional Sciences).",
  },
  "whole-wheat-bread": {
    gi: "high",
    why: "commercial finely-milled wholemeal bread measures GI 70-80, and Nigerian 'whole wheat' bread is finely milled. Lower values (61-65) exist for coarse stone-ground loaves we do not sell here. Conservative reading; see EVIDENCE.md.",
  },
  "tuwo-masara": {
    gi: "high",
    // The old line, "Corn-based. A touch friendlier than rice tuwo", cannot
    // stand next to a high band. Tuwo shinkafa measures 95.8 and this measures
    // 86.8, so it is lower, but 86.8 is not friendly to anyone.
    logicNote:
      "A corn swallow. It still pushes your sugar up fast, so keep to one fist-size ball (100g) and eat it with a green vegetable soup.",
    why: "tuwo masara measured GI 86.8. Was medium, which sat below tuwo shinkafa (95.8) and tuwo dawa (85.3) for no reason.",
  },
  "tuwo-dawa": {
    gi: "high",
    why: "tuwo dawa (sorghum swallow) measured GI 85.3. Whole grain, but still high. Drops to 2 times a week under the high-GI rule.",
  },
};

const foods = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(foods.map((f) => [f.id, f]));

const RANK = { low: 0, medium: 1, high: 2 };
const VERDICT_RANK = { green: 2, yellow: 1, red: 0 };

const changed = [];
for (const [id, c] of Object.entries(CORRECTIONS)) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  // Guard the asymmetry rule in code, not just in prose.
  if (c.gi && RANK[c.gi] < RANK[f.gi]) {
    console.error(`${id}: would loosen gi ${f.gi} -> ${c.gi}. Needs two sources; see EVIDENCE.md.`);
    process.exit(1);
  }
  if (c.baseVerdict && VERDICT_RANK[c.baseVerdict] > VERDICT_RANK[f.baseVerdict]) {
    console.error(`${id}: would loosen verdict ${f.baseVerdict} -> ${c.baseVerdict}.`);
    process.exit(1);
  }

  // Not `portionGuidance`: clear-instructions.mjs owns that field and runs last.
  for (const key of ["gi", "baseVerdict", "logicNote"]) {
    if (c[key] && f[key] !== c[key]) {
      changed.push(`${id}.${key}: ${f[key]} -> ${c[key]}`);
      f[key] = c[key];
    }
  }
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`${changed.length} evidence correction(s):`);
changed.forEach((c) => console.log("  " + c));
