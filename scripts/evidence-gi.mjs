/**
 * Correct `gi` and `baseVerdict` where a measured glycaemic index contradicts
 * what the data says. Sources and reasoning live in docs/EVIDENCE.md; nothing
 * here is ever shown to a user.
 *
 * Asymmetry rule (see EVIDENCE.md §1): a food may be marked WORSE on a single
 * credible in-vivo measurement, but may only be marked BETTER on two
 * independent sources. Under-calling risk harms someone; over-calling it only
 * inconveniences them. Every change below is a tightening, except the few
 * marked LOOSENINGS, which each name two independent `sources`.
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
  "unripe-plantain-porridge": {
    gi: "high",
    baseVerdict: "yellow",
    logicNote:
      "Unripe plantain with plenty of vegetables is a good Nigerian meal, but the plantain is still a starch. Keep to the size shown below.",
    why: "never measured in any study. Founder, 2026-11-07: kept high and yellow when boiled unripe plantain moved to low. Long cooking and mashing usually make a starch faster, so the boiled result is not carried over.",
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
  // LOOSENINGS. Each carries `sources`, two independent measurements, which is
  // the only thing that lets the guard below mark a food better.
  "parboiled-rice": {
    gi: "medium",
    logicNote:
      "Most rice sold in bags in Nigeria is parboiled. Look at the bag. If it says parboiled, this is your rice. It pushes your sugar up a little more slowly than white rice. Keep to the size shown below, and add vegetables and fish, meat, or egg.",
    sources: [
      "pilot trial in healthy and T2D adults, GI 50-60 (PMC12155248, EVIDENCE.md section 2)",
      "international GI tables, parboiled/converted rice GI 38-55 (founder, 2026-10-24)",
    ],
    why: "founder, 2026-10-24: moved high -> medium on two sources, overriding the 2026-10-09 call to treat it like white rice. Half a cup kept; 3 times a week like the other medium rices. Caveat on record: the low figures are mostly for Western 'converted' rice, not measured on Nigerian bagged rice.",
  },
  acha: {
    gi: "medium",
    sources: [
      "Alegbejo et al. 2011, Zaria (J Pure Appl Microbiol 5(1):117-122): acha meal GI 49 in T2D, 35 in healthy subjects",
      "University of Nigeria, Nsukka study (dspace.unn.edu.ng): GI 50-66 (founder, 2026-10-24)",
    ],
    why: "two independent Nigerian measurements, both below the high band. Medium, not low: the top of the Nsukka range is 66, tuwo acha is cooked soft, and the Zaria authors warn the home serving gives a high load. Still in the 4-a-week swallow group.",
  },
  "boiled-plantain-unripe": {
    gi: "low",
    baseVerdict: "green",
    logicNote:
      "Boiled unripe plantain raises your sugar more slowly than most starches. Keep to the size shown below, and always eat it with vegetables and fish, meat, or egg. Choose the green one: ripe plantain raises your sugar faster.",
    // portionGuidance (three slices, 100g) is owned by clear-instructions.mjs, unchanged.
    sources: [
      "Bahado-Singh et al. 2006, Br J Nutr 96:476 (Jamaica): green plantain boiled, GI 39, n=10 healthy, glucose reference; the only boiled green plantain row in the 2021 International Tables that meets ISO 26642",
      "Oladele & Williamson 2016, Eur J Nutr 55:75-81: unripe plantain boiled 20 min, GI 44.9, n=10 healthy",
    ],
    why: "founder, 2026-11-07: moved high/yellow -> low/green after a fuller search (reports/Boiled unripe plantain glycaemic index.md). Contrary data on record: Ogundele & Sanusi 2022 (SW Nigeria) GI 89, cooking method and group size not confirmed; Alegbejo & Ameh 2012 (Zaria, the only study in people with type 2 diabetes) GI 68-69 with stew and meat. Green only at the card's size and with vegetables and fish, meat or egg; 4 times a week. The old note here (low figures are all flour) was wrong: 39 and 44.9 are whole boiled plantain.",
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
  const twoSources = Array.isArray(c.sources) && c.sources.length >= 2;
  if (c.gi && RANK[c.gi] < RANK[f.gi] && !twoSources) {
    console.error(`${id}: would loosen gi ${f.gi} -> ${c.gi}. Needs two sources; see EVIDENCE.md.`);
    process.exit(1);
  }
  if (c.baseVerdict && VERDICT_RANK[c.baseVerdict] > VERDICT_RANK[f.baseVerdict] && !twoSources) {
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
