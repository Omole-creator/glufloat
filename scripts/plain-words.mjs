/**
 * Rewrite the food copy into words a primary-school reader follows, and give a
 * real count everywhere a vague amount used to stand.
 *
 * Run this AFTER scripts/portion-icons.mjs. The pictures and the "Best to skip"
 * fix used to be parsed out of this very wording (the word "Avoid", the phrase
 * "one small"), so the wording could not be touched safely until the icon was
 * stored as data. It now is.
 *
 * Order: exact per-food rewrites, then the general phrase rules, then an audit
 * that fails on any hard word left behind.
 *
 *   node scripts/plain-words.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "foods.json");
const FIELDS = ["portionGuidance", "pairingAdvice", "logicNote", "healthNote"];

/**
 * Amounts that used to be a "handful" or "a few". A handful is a different
 * amount in every hand, so each of these now names a number you can count.
 */
const PORTIONS = {
  groundnut: "About 20 groundnuts (30g).",
  almond: "About 20 almonds (30g).",
  "cashew-nut": "About 15 cashew nuts (30g).",
  "tiger-nut": "About 20 tiger nuts (30g).",
  walnut: "About seven whole walnuts (30g).",
  "mixed-nuts": "About 10 nuts (30g).",
  "kuli-kuli": "Two sticks (about 30g).",
  "egusi-seed": "In soup. Or about two tablespoons, roasted (30g).",
  "prawns-crayfish": "About 10 prawns (90g).",
  periwinkle: "About 15 periwinkles (60g).",
  crab: "One medium crab. That is about half a cup of the meat (90g).",
  ugba: "Half a cup. Fill a tea cup halfway.",
  "velvet-tamarind": "About 10 pods.",
  "spring-onion": "One handful, chopped (about 30g).",
  parsley: "One handful, chopped (about 20g).",
  radish: "One handful, sliced (about 100g).",
  uziza: "One handful of leaves (about 30g), or a pinch of the seed.",
  utazi: "One handful, sliced thin (about 30g).",
  "scent-leaf": "Eat as much as you like.",
  donkwa: "Two small pieces (about 30g).",
  robo: "Three pieces (about 40g).",
  "corned-beef": "Three tablespoons. That is about a quarter of a tin.",
  coleslaw: "One cup (about 100g), with one teaspoon of salad cream.",

  // The cupped handfuls.
  "cooked-beans": "Half a cup, cooked. Fill a tea cup halfway (130g).",
  "ewa-agoyin": "Half a cup. Fill a tea cup halfway, and go easy on the oil (130g).",
  "fio-fio": "Half a cup. Fill a tea cup halfway (130g).",
  "beans-and-plantain": "Half a cup of beans, with two or three slices of plantain.",
  ugu: "Eat as much as you like.",
  waterleaf: "Eat as much as you like.",
  spinach: "Eat as much as you like.",
  soko: "Eat as much as you like.",
  "bitterleaf-veg": "Eat as much as you like.",

  // Foods to skip, where the leftover amount was a handful.
  "plantain-chips": "Best to skip this. If you do have it, about 15 chips (30g).",
  "chin-chin": "Best to skip this. If you do have it, about 10 pieces (30g).",
  kokoro: "Best to skip this. If you do have it, about four sticks (30g).",
  "cassava-chips": "Best to skip this. If you do have it, about 15 chips (30g).",
  "french-fries": "Best to skip this. If you do have it, about 10 chips.",
  "potato-crisps": "Best to skip this. If you do have it, about 10 crisps (25g).",

  // Oils: "sparingly" is not an amount.
  "palm-oil": "One to two teaspoons. No more than that.",
  "vegetable-oil": "One to two teaspoons. No more than that.",
  "coconut-oil": "One to two teaspoons. No more than that.",

  // "One small apple, the size of a tennis ball" drew a cup. The size stays,
  // but an egg is a thing every kitchen has.
  apple: "One small apple. That is about the size of a big egg (120g).",
};

/** Logic notes that a word swap alone cannot make read well. */
const LOGIC = {
  "garri-eba":
    "Turns to sugar fast. The size you eat, and the soup you eat it with, are everything.",
  "white-rice":
    "This one pushes your sugar up fast. Eat less of it, and add vegetables and fish, meat, or egg to slow it down.",
  "rice-and-beans":
    "The beans slow the rice down, because beans have the rough part of food and are body-building food.",
  "soft-drink":
    "Liquid sugar. It pushes your sugar up faster than anything else. The number one thing to drop.",
  "isi-ewu":
    "Spiced goat head, with very little starch. It is rich, so keep to the size shown below.",
  carrot:
    "Carrot has its own natural sugar. The size shown below is fine, but a lot of it, or carrot juice with the rough part taken out, can raise your sugar.",
  beetroot:
    "Beetroot has more natural sugar than green vegetables, so keep to the size shown below. Juicing it takes out the rough part and raises sugar faster.",
  "sweet-potato":
    "More of the rough part of food than white yam. A good swap when boiled.",
  avocado: "Good fat and the rough part of food. Slow to raise sugar. A smart snack.",
  "club-sandwich":
    "White bread pushes your sugar up fast, so the filling matters. Choose fish, meat, or egg with vegetables, and skip sweet spreads.",
  "hot-dog":
    "The white bun pushes your sugar up fast, and the sausage is factory-made and salty. The vegetables are the friendly part.",
  fig: "Fresh figs are sweet, so keep to the size shown below. Dried figs carry far more sugar, so do not eat those.",
  "sausage-roll": "White flour pastry around factory-made meat.",
  cornflakes: "White corn flakes, and they usually come with sugar and sweet milk.",
  "roasted-corn": "Roasting raises your sugar a little more than boiling does.",
  "milk-full-cream":
    "Has the natural sugar of milk. Do not use sweet condensed milk, which is red.",
  "evaporated-milk":
    "Plain evaporated milk has the natural sugar of milk, so use one tablespoon. Do not use the sweet condensed kind.",
  "french-fries":
    "Deep-fried white potato raises sugar fast and adds a lot of oil. Boiled or roasted potato is better.",
  macaroni:
    "White wheat flour, like other pasta. Keep to the size shown below and eat it with fish, meat, or egg, and vegetables.",
  couscous:
    "Made from white wheat flour, so it behaves like white rice. Keep to the size shown below and load the vegetables.",
  "soy-milk":
    "Plant milk with body-building food and little sugar, when it has no sugar added. Check the label and do not buy the sweet kind.",
  "dried-fruit":
    "Drying takes out the water and packs the sugar tight, so even one handful pushes your sugar up fast. Fresh fruit is better.",
  "cooked-beans":
    "Full of the rough part of food, and body-building. Your sugar rises slowly. One of the best foods for your sugar.",
  groundnut: "Body-building food and good fat. Your sugar rises slowly. A smart snack swap.",
  "moi-moi": "Steamed beans, full of body-building food. Your sugar rises slowly. A top pick.",
  stockfish: "Dried fish. Very little starch, and full of body-building food.",
  biscuits: "White flour and sugar.",
  "plain-yogurt": "Choose the plain kind only. Flavoured yogurts are full of sugar.",
  beer: "Alcohol can drop or raise your sugar, and beer carries starch. If you drink, keep to the size shown below and eat first.",
  gizdodo:
    "Gizzard is body-building food with very little starch. The fried ripe plantain is the sugar to watch.",
  "cow-tail":
    "A fatty meat with very little starch, so it does not raise sugar. Trim the heavy fat if you can.",
};

/** The card title is read before anything else, so it gets plain words too. */
const NAMES = {
  "plain-yogurt": "Plain Yogurt (no sugar)",
  "evaporated-milk": "Evaporated Milk (no sugar)",
  "soy-milk": "Soy Milk (no sugar)",
  "zobo-sweetened": "Zobo (with sugar)",
  kunu: "Kunu (with sugar)",
  "condensed-milk": "Condensed Milk (with sugar)",
  "yoghurt-drink": "Yoghurt Drink (with sugar)",
  "sweetened-yogurt": "Sweet / Flavoured Yogurt",
};

/** Pairings that pointed at "a small portion" instead of naming the amount. */
const PAIRING = {
  "tea-coffee": "Drink it with no sugar at all.",
  weetabix: "Milk with no sugar, and about 10 nuts.",
  "tomato-stew":
    "It already has fish, chicken, or meat. Eat with half a cup of rice (130g), or a fist-size ball of swallow (100g). Remember, the swallow you pick matters as much as the soup.",
  ayamase: "It already has assorted meat. Eat with half a cup of ofada rice (130g).",
  "pepper-sauce":
    "Use with half a cup of rice, or two pieces of yam or plantain, plus fish or meat.",
};

/**
 * The general rules, in order. The long, specific phrases must come before the
 * short ones, or a short rule eats the phrase a longer rule was waiting for.
 */
const RULES = [
  // ---- repair damage an earlier ordering of these rules left behind ----
  [/\bfor the the rough part of food\b/gi, "for the rough part of the fruit"],
  [/\bWhite white flour\b/g, "White flour"],

  // ---- foods to skip -------------------------------------------------
  [/^Avoid\. If you do have it, only /, "Best to skip this. If you do have it, only "],
  [/^Avoid\. If you do have it, /, "Best to skip this. If you do have it, "],
  [/^Avoid\. If at all, only /, "Best to skip this. If you do have it, only "],
  [/^Avoid\. If at all, /, "Best to skip this. If you do have it, "],
  [/^Avoid\. If eaten, /, "Best to skip this. If you do have it, "],
  [/^Avoid\. A rare treat, /, "Best to skip this. If you do have it, "],
  [/^None\. Avoid completely\.$/, "None at all."],
  [/^None\. Avoid\.$/, "None at all."],
  [/^None of the sugary mix\. Avoid\.$/, "None of the sweet mix at all."],
  [/^Avoid\. It is a sweet cocktail\.$/, "Best to skip this. It is a sweet drink."],
  [/^Avoid\. Choose fresh fruit instead\.$/, "Best to skip this. Choose fresh fruit instead."],
  [
    /^Avoid\. Choose plain unsweetened milk instead\.$/,
    "Best to skip this. Choose plain milk with no sugar instead.",
  ],
  [/^Best avoided\.$/, "Best to skip this."],
  [/\bavoid those\b/gi, "do not eat those"],
  [/\bBest avoided\b/g, "Best to skip"],

  // ---- "spike" -------------------------------------------------------
  [/one of the fastest spikes/gi, "it pushes your sugar up faster than most foods"],
  [/the fastest spike of all/gi, "it pushes your sugar up faster than anything else"],
  [/The classic spike\./g, "This one pushes your sugar up fast."],
  [/a big rice portion still spikes/gi, "a big plate of rice still pushes your sugar up fast"],
  [/a common hidden spike/gi, "a hidden way for sugar to rise fast"],
  [/the sugar version spikes/gi, "the sweet kind pushes your sugar up fast"],
  [/the sweet type spikes/gi, "the sweet kind pushes your sugar up fast"],
  [/It spikes very fast\./g, "It pushes your sugar up very fast."],
  [/\bspikes very fast\b/gi, "pushes your sugar up very fast"],
  [/\bspikes hard\b/gi, "pushes your sugar up very fast"],
  [/\bspikes fast\b/gi, "pushes your sugar up fast"],
  [/\bspikes quickly\b/gi, "pushes your sugar up fast"],
  [/\bwhich spikes\b/gi, "which pushes your sugar up fast"],
  [/\ba fast spike\b/gi, "a fast sugar rise"],
  [/\bthe rice spike\b/gi, "the sugar rise from rice"],

  // ---- "fibre" and "protein" ----------------------------------------
  // "for the fibre" must be caught before the bare word, or the article is
  // doubled: "for the the rough part of food".
  [/\bfor the fibre\b/gi, "for the rough part of the fruit"],
  [/\bhigh in fibre and protein\b/gi, "full of the rough part of food, and body-building"],
  [/\bhigh fibre and protein\b/gi, "full of the rough part of food, and body-building"],
  [/\bfibre and protein\b/gi, "the rough part of food and body-building food"],
  [/\bhigh in fibre\b/gi, "full of the rough part of food"],
  [/\bhigh fibre\b/gi, "full of the rough part of food"],
  [/\bmore fibre\b/gi, "more of the rough part of food"],
  [/\bthe fibre is gone\b/gi, "the rough part is gone"],
  [/\bthe fibre removed\b/gi, "the rough part taken out"],
  [/\bwithout the fibre\b/gi, "without the rough part"],
  [/\badds fibre\b/gi, "adds the rough part of food"],
  [/\bwith fibre\b/gi, "with the rough part of food"],
  [/\band fibre\b/gi, "and the rough part of food"],
  [/\bno fibre\b/gi, "none of the rough part"],
  [/\bfibre\b/gi, "the rough part of food"],

  [/\bone of the best proteins\b/gi, "one of the best body-building foods"],
  [/\bprotein-rich\b/gi, "full of body-building food"],
  [/\bprotein and vegetables\b/gi, "fish, meat, or egg, and vegetables"],
  [/\badd protein\b/gi, "add fish, meat, or egg"],
  [/\bwith protein\b/gi, "with fish, meat, or egg"],
  [/\band protein\b/gi, "and body-building food"],
  [/\bprotein\b/gi, "body-building food"],

  // ---- "portion" -----------------------------------------------------
  [/Portion and soup pairing are everything\./g, "The size you eat, and the soup you eat it with, are everything."],
  [/portion and soup pairing matter most/gi, "the size you eat, and the soup you eat it with, matter most"],
  [/\bpair and shrink the portion\b/gi, "eat less of it and eat it with soup"],
  [/\bkeep the portion small for calories\b/gi, "keep to the size shown below"],
  [/\bkeep the portion modest\b/gi, "keep to the size shown below"],
  [/\bkeep the portion to a cup\b/gi, "keep it to one cup"],
  [/\bkeep the portion small\b/gi, "keep to the size shown below"],
  [/\bkeep portion small\b/gi, "keep to the size shown below"],
  [/\bkeep portion sensible\b/gi, "keep to the size shown below"],
  [/\bkeep to a small portion\b/gi, "keep to the size shown below"],
  [/\bA small portion is fine\b/g, "The size shown below is fine"],
  [/\bA small portion only\b/g, "Keep to the size shown below"],
  [/\bsmall portions only\b/gi, "keep to the size shown below"],
  [/\bkeep portions tiny\b/gi, "keep to the size shown below"],
  [/\bsmall portions\b/gi, "keep to the size shown below"],
  [/\bCut portion\b/g, "Eat less of it"],
  [/\bCut the portion\b/g, "Eat less of it"],
  [/\ba normal portion is fine\b/gi, "the size shown below is fine"],
  [/\bA normal portion is fine\b/g, "The size shown below is fine"],
  [/\ba normal portion is friendly\b/gi, "the size shown below is fine"],
  [/\bin normal amounts\b/gi, "in the size shown below"],
  [/\bportion matters\b/gi, "the size matters"],
  [/\bmind portion\b/gi, "watch the size"],
  [/\bmind the portion\b/gi, "watch the size"],
  [/\bthe portion is what matters most\b/gi, "the size is what matters most"],
  [/\bkeep the portion\b/gi, "keep to the size shown below"],

  // ---- other hard words ----------------------------------------------
  [/\bA low-GI legume\b/g, "A beans food that raises sugar slowly"],
  [/\bA legume\b/g, "A beans food"],
  [/\blegume\b/gi, "beans food"],
  [/\blow-GI\b/gi, "slow to raise sugar"],
  [/\bLower GI fruit\b/g, "A fruit that raises sugar slowly"],
  [/\bHigher GI than\b/g, "Raises sugar faster than"],
  [/\blower GI\b/gi, "raises sugar more slowly"],
  [/\bhigh GI\b/gi, "raises sugar fast"],
  [/\bcarbs\b/gi, "starch"],
  [/\bslow rise\b/gi, "your sugar rises slowly"],
  // The longer phrase first, or "White refined flour" becomes "White White flour".
  [/\bWhite refined flour\b/g, "White flour"],
  [/\bRefined flour\b/g, "White flour"],
  [/\bRefined wheat\b/g, "White wheat flour"],
  [/\brefined flour\b/gi, "white flour"],
  [/\bWhite refined flour\b/g, "White flour"],
  [/\brefined and oily\b/gi, "white flour and oily"],
  [/\bFried sweet flour\b/g, "Fried sweet flour"],
  [/\ba reasonable swap\b/gi, "a good swap"],
  [/\bin moderation\b/gi, "in the size shown below"],
  [/\bdiabetic-friendly staples\b/gi, "foods that are kind to your sugar"],
  [/\bLow carb\b/g, "Very little starch"],
  [/\blow carb\b/gi, "very little starch"],
  [/\bconcentrated sugar\b/gi, "packed sugar"],
  [/\bfar more concentrated\b/gi, "packed with far more sugar"],
  [/\bis processed and salty\b/gi, "is factory-made and salty"],
  // "Unsweetened" reads badly in the middle of a sentence, so each shape of it
  // is turned into "with no sugar" where that shape actually sits.
  [/\bwith unsweetened milk\b/gi, "with milk that has no sugar"],
  [/\bunsalted, unsweetened kind\b/gi, "kind with no salt and no sugar"],
  [/\bplain unsweetened yogurt\b/gi, "plain yogurt with no sugar"],
  [/\bunsweetened yogurt\b/gi, "yogurt with no sugar"],
  [/\bunsweetened milk\b/gi, "milk with no sugar"],
  [/\bunsweetened zobo\b/gi, "zobo with no sugar"],
  [/\bUnsweetened millet kunu\b/g, "Millet kunu with no sugar"],
  [/^Unsweetened\.$/, "With no sugar."],
  [/, unsweetened\./g, ", with no sugar."],
  [/, unsweetened \(/g, ", with no sugar ("],
  [/\bavoid the sweetened kind\b/gi, "do not buy the sweet kind"],

  // ---- "palm-size" is a compound word; say it as a sentence ------------
  [/^One palm-size piece\. That is the size of a deck of cards \(/, "A piece as big as your palm. That is about the size of a deck of cards ("],
  [/^One palm-size fillet\. That is the size of a deck of cards \(/, "A piece as big as your palm. That is about the size of a deck of cards ("],
  [/^One palm-size piece \(/, "A piece as big as your palm ("],
  [/^One palm-size fillet \(/, "A piece as big as your palm ("],
  [/^One palm-size serving \(/, "An amount as big as your palm ("],
  [/^A palm-size amount \(/, "An amount as big as your palm ("],
  [/\ba palm-size serving\b/g, "an amount as big as your palm"],
  [/^A palm-size piece of (.+?) \(/, "A piece of $1 as big as your palm ("],

  // ---- vague amounts --------------------------------------------------
  [/\bEat freely, one to two cupped handfuls\./g, "Eat as much as you like."],
  [/\bcupped handful\b/gi, "handful"],
  [/^Eat freely\. /, "Eat as much as you like. "],
  [/^Eat freely, /, "Eat as much as you like. "],
  [/^Use freely /, "Use as much as you like "],
  [/\buse sparingly\b/gi, "and no more"],
  [/\bserving spoons\b/gi, "big spoons"],
  [/\bserving spoon\b/gi, "big spoon"],
  [/\bkeep it small and use less oil\b/gi, "keep to the size shown below and use less oil"],
  [/\buse only a little at a time\b/gi, "use only one teaspoon at a time"],
  [/\buse only a little\b/gi, "use only a pinch"],
  [/\bwith little salad cream\b/gi, "with one teaspoon of salad cream"],
];

/** Sentence-case the letters a swap left lowercase, and squash double spaces. */
function tidy(s) {
  return s
    .replace(/\.\s+([a-z])/g, (m, c, i, str) =>
      // Do not capitalise after a decimal, e.g. "(1.5 cups)".
      /\d\.$/.test(str.slice(0, i + 1)) ? m : `. ${c.toUpperCase()}`,
    )
    .replace(/\s{2,}/g, " ")
    .replace(/^([a-z])/, (c) => c.toUpperCase())
    .trim();
}

const foods = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(foods.map((f) => [f.id, f]));

for (const [id, text] of Object.entries(PORTIONS)) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  f.portionGuidance = text;
}
for (const [id, text] of Object.entries(LOGIC)) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  f.logicNote = text;
}
for (const [id, text] of Object.entries(PAIRING)) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  f.pairingAdvice = text;
}
for (const [id, text] of Object.entries(NAMES)) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  f.name = text;
}

let changed = 0;
for (const f of foods) {
  for (const field of FIELDS) {
    if (!f[field]) continue;
    const before = f[field];
    let v = before;
    for (const [re, to] of RULES) v = v.replace(re, to);
    v = tidy(v);
    if (v !== before) {
      f[field] = v;
      changed += 1;
    }
  }
}

// The audit. Anything that survives needs a rule or a per-food rewrite.
const BANNED = [
  /\bavoid/i,
  /\bfibre\b/i,
  /\bspike/i,
  /\bsparingly\b/i,
  /\blegume\b/i,
  /\bmoderation\b/i,
  /\bsensible\b/i,
  /\breasonable\b/i,
  /\bmodest\b/i,
  /cupped handful/i,
  /\bprotein\b/i,
  /\bportion\b/i,
  /\bGI\b/,
  /\brefined\b/i,
  /small handful/i,
  /\ba few\b/i,
  /keep it small/i,
  /\bfreely\b/i,
  /\bunsweetened\b/i,
  /\bcarbs?\b/i,
  // Mangling a word swap can leave behind, rather than a hard word.
  /-rich\b/i,
  /^[a-z]/,
  /\bfood food\b/i,
  /,\s*,/,
  /palm-size/i,
];
// Real Nigerian foods whose names repeat a word. Everything else that doubles
// a word is a rule that fired twice ("the the", "White white").
const REAL_DOUBLES = /\b(moi moi|puff puff|kuli kuli|chin chin|dan dan)\b/i;

const leftovers = [];
for (const f of foods) {
  for (const field of FIELDS) {
    if (!f[field]) continue;
    for (const re of BANNED) {
      if (re.test(f[field])) leftovers.push(`${f.id}.${field}: ${f[field]}`);
    }
    for (const m of f[field].matchAll(/\b(\w+)\s+\1\b/gi)) {
      if (!REAL_DOUBLES.test(m[0])) {
        leftovers.push(`${f.id}.${field}: doubled word "${m[0]}" -> ${f[field]}`);
      }
    }
  }
  // The title is read first of all, so it may not carry a hard word either.
  if (/unsweetened|sweetened/i.test(f.name)) {
    leftovers.push(`${f.id}.name: ${f.name}`);
  }
}
if (leftovers.length) {
  console.error(`\n${leftovers.length} hard word(s) left:\n`);
  leftovers.forEach((l) => console.error("  " + l));
  process.exit(1);
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`${changed} field(s) rewritten. No hard words left.`);
