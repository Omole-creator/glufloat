/**
 * Make every instruction a sentence someone can act on without guessing.
 *
 * Founder feedback, in four parts:
 *  1. "The swallow you pick matters as much as the soup" says nothing. Which
 *     swallow? Name them, and say which raise sugar most.
 *  2. "Half a cup" is ambiguous: half a cup of raw rice, or of cooked rice?
 *     (The gram anchors already in the data are cooked weights: half a cup of
 *     cooked rice is 90g, of cooked beans 130g. Oats say 40g dry. So this pass
 *     only makes explicit what the numbers already assume.)
 *  3. "One small cup made up (about 200ml), no sugar." is not a sentence.
 *  4. A comma cannot join two instructions. Use a full stop and a plain verb.
 *
 * Run LAST, after portion-icons -> plain-words -> frequency-numbers.
 *
 *   node scripts/clear-instructions.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "foods.json");

/**
 * 1. The swallow reminder. Every soup eaten with swallow carried a vague line.
 * Ranked from the app's own `gi` field: oat swallow is the only low-GI one;
 * eba, fufu, pounded yam, semovita, tuwo shinkafa, lafun and delta starch are
 * high-GI; the rest sit in the middle.
 */
const OLD_REMINDER = "Remember, the swallow you pick matters as much as the soup.";
const NEW_REMINDER =
  "The swallow matters too. Oat swallow raises sugar the least, and eba, fufu, pounded yam and semovita raise it the most.";

/**
 * Meat is not cut palm-shaped. Nobody serves a palm-shaped slab of goat meat;
 * it comes in chunks. The palm is the right AMOUNT but the wrong SHAPE, so for
 * chunky meat the palm now measures the total ("put together, they fill your
 * palm") and only genuinely flat foods (a fish fillet, liver, tofu) are still
 * described as one palm-shaped piece.
 */
const MEAT = {
  beef: "Two or three medium chunks (90g). Put together, they fill your palm.",
  "beef-regular": "Two or three medium chunks (90g). Put together, they fill your palm.",
  "goat-meat": "Two or three medium chunks (90g). Put together, they fill your palm.",
  "ram-meat": "Two or three medium chunks (90g). Put together, they fill your palm.",
  asun: "Two or three medium chunks (90g). Put together, they fill your palm.",
  grasscutter: "Two or three medium chunks (90g). Put together, they fill your palm.",
  turkey: "One turkey piece, or two smaller ones (90g). Put together, they fill your palm.",
  chicken: "One chicken lap, or two medium pieces (90g). Put together, they fill your palm.",
  gizzard: "About five pieces (90g). Put together, they fill your palm.",
  kidney: "Enough pieces to fill your palm (90g).",
  "dambu-nama": "Enough of the shredded meat to fill your palm (about 60g).",
  // Flat foods, where one palm-shaped piece is a real thing.
  fish: "One fillet as wide as your palm (100g). That is about the size of a deck of cards.",
  "smoked-fish": "One piece as wide as your palm (about 90g).",
  liver: "One slice as wide as your palm (90g).",
  tofu: "One block as wide as your palm (about 90g).",
  "fried-chicken-fish": "One piece as wide as your palm (90g). Do not eat it often.",
};

/** 2. Portions that must say whether you measure the food raw or cooked. */
const COOKED = {
  // Swallow: the ball you eat, not the flour you start with.
  "garri-eba": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "pounded-yam": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "amala-yam": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "amala-plantain": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "fufu-akpu": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  semovita: "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "wheat-swallow": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "oat-swallow": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "tuwo-shinkafa": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "tuwo-masara": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "starch-delta": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  lafun: "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "cocoyam-fufu": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  "tuwo-dawa": "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",

  // Beans and other legumes: measure them on the plate, not in the bag.
  "cooked-beans": "Half a cup of cooked beans. Fill a tea cup halfway (130g).",
  "ewa-agoyin": "Half a cup of cooked beans. Fill a tea cup halfway. Go easy on the oil (130g).",
  "fio-fio": "Half a cup of the cooked pottage. Fill a tea cup halfway (130g).",
  "beans-and-plantain": "Half a cup of cooked beans. Add two or three slices of plantain.",
  "african-yam-bean": "Half a cup, cooked (about 130g).",
  "baked-beans": "Half a cup of the tinned beans (about 130g).",
  chickpeas: "Half a cup, cooked (about 130g).",
  lentils: "Half a cup, cooked (about 130g).",
  "green-peas": "Half a cup of cooked peas (about 80g).",
  "rice-and-beans": "Three-quarters of a cup, cooked. Use more beans than rice (about 130g).",

  // Cooked dishes served in a bowl or on a plate.
  "yam-porridge": "One small bowl. That is about three-quarters of a cup of the cooked porridge (150g).",
  "sweet-potato-porridge": "One small bowl. That is about three-quarters of a cup of the cooked porridge (150g).",
  "beans-porridge": "One small bowl. That is about three-quarters of a cup of the cooked porridge (150g).",
  ikokore: "One small bowl. That is about three-quarters of a cup of the cooked dish (150g).",
  ukwa: "One small bowl. That is about three-quarters of a cup of the cooked dish (150g).",
  achicha: "One small bowl. That is about three-quarters of a cup of the cooked dish (150g).",
  "ekpang-nkukwo": "One small bowl. That is about three-quarters of a cup of the cooked dish (150g).",
  adalu: "One small bowl. That is about three-quarters of a cup of the cooked dish (150g).",
  "unripe-plantain-porridge": "One bowl. That is about one cup of the cooked porridge (200g). Serve it with plenty of vegetables.",
  "dan-wake": "One small plate. That is about one cup of the cooked dumplings (150g).",
  abacha: "One small plate. That is about one cup, as it is served (150g).",
  gizdodo: "One small plate. That is about one cup, as it is served (150g). It is plantain with gizzard.",
  "potato-salad": "Half a cup of the made salad (about 130g).",

  // Corn and plantain.
  "boiled-plantain-unripe": "About four to five slices of boiled plantain. That is roughly one cup (120g).",
  "sweet-corn": "Half a cup of cooked corn (about 80g).",
  "popcorn-plain": "One cup of popped corn (about 8g). Add no sugar.",

  // Measured dry, before you cook them. Said plainly, because it is the
  // opposite of every rule above.
  oats: "Half a cup of dry oats (40g). Measure it before cooking. Make it with water.",
  "golden-morn": "Four tablespoons of the dry cereal (about 40g). Add no sugar.",

  // 3. "made up" is not a sentence.
  pap: "One small cup (about 200ml). Make it with water. Add no sugar.",
  custard: "One small cup (about 200ml). Make it with water. Add no sugar.",
  tapioca: "One small cup (about 200ml). Make it with water. Add no sugar.",

  // Other sentences the founder flagged.
  water: "Six to eight cups a day. Drink more if you are thirsty.",

  // "How much" says the size. "How often" says the frequency. Saying the
  // frequency in both places is noise.
  beer: "One small bottle at most.",
  "palm-wine": "One small glass (100ml).",
  pito: "One small cup (200ml).",

  // "for the fibre" doubled the article; these read as plain sentences now.
  orange: "One medium whole orange. Eat it whole. Do not drink it as juice.",
  tangerine: "One medium tangerine. Eat it whole. Do not drink it as juice.",
  "scotch-egg": "One scotch egg. Eat it as a snack. Do not eat it as a meal.",
  cornflakes: "Best to skip this. If you do have it, four tablespoons of the dry flakes (30g).",
  "egg-sauce": "Two eggs. Cook them with tomato, pepper, and onion.",
  "glucose-lucozade": "None, unless you are treating a low sugar. Then take half a glass (100ml).",
};

/**
 * 4. A comma cannot join two instructions. Each of these becomes a full stop
 * and a plain verb, so the second half reads as its own thing to do.
 */
const RULES = [
  [/, no added sugar\.$/, ". Add no sugar."],
  [/, with no sugar\.$/, ". Add no sugar."],
  [/, no sugar\.$/, ". Add no sugar."],
  [/, no syrup\.$/, ". Add no syrup."],
  [/, not juice\.$/, ". Eat it whole. Do not drink it as juice."],
  [/, not often\.$/, ". Do not eat it often."],
  [/, rarely\.$/, ". Have it no more than once a month."],
  [/, never on its own\.$/, ". Never eat it on its own."],
  [/, not more\.$/, ". Do not use more than that."],
  [/, fried in one teaspoon of oil\.$/, ". Fry them in one teaspoon of oil."],
  [/, scrambled with pepper and onion\.$/, ". Scramble them with pepper and onion."],
  [/, with vegetables mixed in\.$/, ". Mix vegetables into them."],
  [/, with plenty vegetables\.$/, ". Serve it with plenty of vegetables."],
  [/, with one teaspoon of salad cream\.$/, ". Add one teaspoon of salad cream."],
  [/, fresh and plain\.$/, ". Drink it fresh and plain."],
  [/, made from whole fruit with no added sugar\.$/, ". Make it from whole fruit. Add no sugar."],
  [/, or a pinch of the seed\.$/, ". Or use a pinch of the seed."],
  [/, or a spoon of pulp\.$/, ". Or take one spoon of the pulp."],
  [/, cooked or raw\.$/, ". Eat it cooked or raw."],
  [/, with milk that has no sugar\.$/, ". Add milk that has no sugar."],
  [/, in place of sugar in tea or coffee\.$/, ". Use it in place of sugar in tea or coffee."],
  [/, for taste in cooking\.$/, ". Add it to your cooking for taste."],
  [/, easy on the oil\. That is about half a cup\.$/, ". That is about half a cup. Go easy on the oil."],
  [/^One big spoon, easy on the oil\./, "One big spoon. Go easy on the oil."],
  [/^One thin slice at most \(30g\), never on its own\.$/, "One thin slice at most (30g). Never eat it on its own."],
  [/^One round, about two thin slices of bread \(60g\), never on its own\.$/, "One round. That is about two thin slices of bread (60g). Never eat it on its own."],
  [/only one short piece \(about 30g\), never on its own\.$/, "only one short piece (about 30g). Never eat it on its own."],
  [/only one small waffle, no syrup\.$/, "only one small waffle. Add no syrup."],
  [/only one, with extra vegetables\.$/, "only one. Add extra vegetables."],
  [/only half a pack, about half a cup cooked\.$/, "only half a pack. That is about half a cup, cooked."],
  [/only one thin slice, about a finger wide\.$/, "only one thin slice, about as wide as a finger."],
  [/^A pinch, or one tablet, in place of sugar/, "A pinch, or one tablet. Use it in place of sugar"],
  [/^One tablespoon in tea or pap, with no sugar\.$/, "One tablespoon in tea or pap. Add no sugar."],
  [/^Two biscuits\. Add milk that has no sugar\.$/, "Two biscuits. Add milk that has no sugar."],
];

const foods = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(foods.map((f) => [f.id, f]));

for (const [id, text] of Object.entries({ ...MEAT, ...COOKED })) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  f.portionGuidance = text;
}

let changed = 0;
for (const f of foods) {
  const before = f.portionGuidance;
  let v = before;
  for (const [re, to] of RULES) v = v.replace(re, to);
  if (v !== before) {
    f.portionGuidance = v;
    changed += 1;
  }
  if (f.pairingAdvice?.includes(OLD_REMINDER)) {
    f.pairingAdvice = f.pairingAdvice.replace(OLD_REMINDER, NEW_REMINDER);
    changed += 1;
  }
}

// ---- audits ---------------------------------------------------------------
const problems = [];

// Every cookable food measured in cups or spoons must say whether you measure
// it before or after cooking. Ready-to-eat forms (tinned, popped, dry flakes)
// count as answering the question.
const cookable = new Set(["starch", "legume"]);
for (const f of foods) {
  if (!cookable.has(f.role)) continue;
  if (!/\b(cup|cups|tablespoon|tablespoons)\b/i.test(f.portionGuidance)) continue;
  if (/cooked|dry|raw|popped|boiled|tinned|as it is served|made salad|make it with water/i.test(f.portionGuidance)) continue;
  problems.push(`${f.id}: cup measure, but does not say raw or cooked -> ${f.portionGuidance}`);
}

// A comma may not carry a second instruction. An introductory phrase ("Put
// together, they fill your palm") or a subordinate clause ("If you do have it,
// only two") is fine; a tacked-on order is not.
const TACKED_ON =
  /,\s*(no |not |never |with no |rarely|fried in|scrambled with|made from|easy on|in place of|for taste|cooked or raw|with one teaspoon|with vegetables|with plenty|fresh and plain|or a pinch|or a spoon|with milk|as an occasional|made up)/i;
for (const f of foods) {
  if (TACKED_ON.test(f.portionGuidance)) {
    problems.push(`${f.id}: comma carries a second instruction -> ${f.portionGuidance}`);
  }
}

// The vague reminder must be gone everywhere.
for (const f of foods) {
  if (f.pairingAdvice?.includes("matters as much as the soup")) {
    problems.push(`${f.id}: still has the vague swallow reminder`);
  }
}

// No chunky meat may be described as one palm-shaped piece.
const CHUNKY = new Set(Object.keys(MEAT).filter((id) => MEAT[id].includes("Put together")));
for (const f of foods) {
  if (CHUNKY.has(f.id) && /a piece as (big|wide) as your palm/i.test(f.portionGuidance)) {
    problems.push(`${f.id}: chunky meat still described as one palm-shaped piece`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`${changed} field(s) rewritten. Instructions are whole sentences.`);
