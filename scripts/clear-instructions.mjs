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
  fish: "One piece of fish as wide as your palm (100g). That is about the size of a deck of cards.",
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
  "african-yam-bean": "Half a cup of cooked beans (about 130g).",
  "baked-beans": "Half a cup of the tinned beans (about 130g).",
  chickpeas: "Half a cup of cooked chickpeas (about 130g).",
  lentils: "Half a cup of cooked lentils (about 130g).",
  "green-peas": "Half a cup of cooked peas (about 80g).",
  "rice-and-beans": "Three-quarters of a cup of the cooked rice and beans (about 130g). Use more beans than rice.",
  // Parboiled read "Half a cup, cooked (about 130g)", but 130g is the cooked-BEANS
  // anchor. Half a cup of cooked rice is 90g on every other rice card, so the same
  // words were promising a size 40g bigger than white rice. Parboiled is medium GI,
  // the same band as brown, ofada and basmati, so it takes the same size they do.
  "parboiled-rice": "Three-quarters of a cup of cooked rice (about 120g).",

  // Cooked dishes served in a bowl or on a plate.
  "yam-porridge": "One and a half big spoons of the cooked porridge (150g).",
  "sweet-potato-porridge": "One and a half big spoons of the cooked porridge (150g).",
  "beans-porridge": "One and a half big spoons of the cooked porridge (150g).",
  ikokore: "One and a half big spoons of the cooked dish (150g).",
  ukwa: "One and a half big spoons of the cooked dish (150g).",
  achicha: "One and a half big spoons of the cooked dish (150g).",
  "ekpang-nkukwo": "One and a half big spoons of the cooked dish (150g).",
  adalu: "One and a half big spoons of the cooked dish (150g).",
  "unripe-plantain-porridge": "Two big spoons of the cooked porridge (200g). Serve it with plenty of vegetables.",
  "dan-wake": "One small plate. That is about one cup of the cooked dumplings (150g).",
  abacha: "One small plate. That is about one cup of the dish as it is served (150g).",
  gizdodo: "One small plate. That is about one cup of the dish as it is served (150g). It is plantain with gizzard.",
  "potato-salad": "Half a cup of the made salad (about 130g).",

  // Pasta, couscous and noodles. Name the food after "of", never "a cup, cooked".
  spaghetti: "Half a cup of cooked pasta (about 130g).",
  macaroni: "Half a cup of cooked pasta (about 130g).",
  couscous: "Half a cup of cooked couscous (about 120g).",
  indomie:
    "Best to skip this. If you do have it, only half a pack. That is about half a cup of the cooked noodles.",

  // Vegetables measured in cups. Same rule: say what the cup is full of.
  pumpkin: "Half a cup of cooked pumpkin (about 100g).",
  mushroom: "One cup of cooked mushroom (about 100g).",
  zucchini: "One cup of cooked zucchini (about 120g).",
  turnip: "Half a cup of cooked turnip (about 80g).",

  // Corn and plantain.
  // Tightened from four or five slices (120g). Boiled unripe plantain measures
  // GI 89 and boiled ripe measures 96.5, only 7 points apart, so the old size
  // let people eat half again as much of the unripe one just because it tastes
  // less sweet. See docs/EVIDENCE.md section 3.
  "boiled-plantain-unripe": "About three slices of boiled plantain. That is roughly three-quarters of a cup (100g).",
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
  water: "Eight cups a day. Drink more if you are thirsty.",

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
 * 5. One number, never a range (co-founder dietitian, 2026-10-08).
 *
 * "Two or three chunks" lets a person pick the bigger number every time. The
 * rule: where the card already gives a weight, the count is the one that
 * matches that weight, so the number and the grams agree. Where it gives no
 * weight, it is the LOWER number, because the lower number is always safe.
 * Water is the one exception: more water is never the risk.
 *
 * "Big spoon" stays (founder, 2026-10-08), but it is ONE size now: 125ml, a
 * soup ladle, half a GluFloat cup. Soups used to say "one to two big spoons,
 * about one cup" (a 125ml spoon) while stews said "two to three big spoons,
 * about half a cup" (a 50ml spoon). Every big spoon now carries its ml, and the
 * app shows a photo of it.
 *
 * The audit at the bottom of this file fails on any range left, and on any
 * "big spoon" that does not say its ml.
 */
const SOUP_CUP = "One big spoon of soup (125ml).";
const LEAFY_SOUP = "Eat as much as you like. Two big spoons of soup (250ml) is a good start.";
// The ONE cup. "Small cup", "small glass" and "tea cup" were three more
// cups, each a different size in each home. Everything is now said against
// the GluFloat cup (250ml), which the app shows in a picture.
const ALMOST_FULL = "One cup, almost full (200ml).";
const EXACT = {
  pap: `${ALMOST_FULL} Make it with water. Add no sugar.`,
  custard: `${ALMOST_FULL} Make it with water. Add no sugar.`,
  tapioca: `${ALMOST_FULL} Make it with water. Add no sugar.`,
  kunu: `${ALMOST_FULL} Add no sugar.`,
  "kunu-aya": `${ALMOST_FULL} Add no sugar.`,
  "fura-da-nono": `${ALMOST_FULL} Add no sugar.`,
  nono: `${ALMOST_FULL} Add no sugar.`,
  pito: ALMOST_FULL,
  smoothie: `${ALMOST_FULL} Make it from whole fruit. Add no sugar.`,
  "coconut-water": `${ALMOST_FULL} Drink it fresh and plain.`,
  "soaked-garri": "Best to skip this. If you do have it, one cup, almost full (200ml). Add no sugar.",
  "palm-wine": "Less than half a cup (100ml).",
  "glucose-lucozade": "None, unless you are treating a low sugar. Then take less than half a cup (100ml).",
  "yoghurt-drink": "Best to skip this. If you do have it, only half a cup (125ml).",
  "plain-yogurt": "A little over half a cup (150g). Add no sugar.",
  "cooked-beans": "Half a cup of cooked beans. Fill the cup halfway (130g).",
  "ewa-agoyin": "Half a cup of cooked beans. Fill the cup halfway (130g). Go easy on the oil.",
  "fio-fio": "Half a cup of the cooked pottage. Fill the cup halfway (130g).",
  ugba: "Half a cup. Fill the cup halfway.",

  "boiled-plantain-ripe": "Two slices (80g).",
  dodo: "Best to skip this. If you do have it, three small slices at most (60g).",
  suya: "One stick. That is about six pieces of meat (90g).",
  kilishi: "Three pieces (about 30g).",
  "whole-wheat-bread": "One slice (about 30g).",
  beef: "Two medium chunks (90g). Put together, they fill your palm.",
  "beef-regular": "Two medium chunks (90g). Put together, they fill your palm.",
  "goat-meat": "Two medium chunks (90g). Put together, they fill your palm.",
  grasscutter: "Two medium chunks (90g). Put together, they fill your palm.",
  asun: "Two medium chunks (90g). Put together, they fill your palm.",
  "ram-meat": "Two medium chunks (90g). Put together, they fill your palm.",
  // Two eggs, the same as the Fried Egg card, and what the calories assume.
  eggs: "Two eggs (about 100g).",
  snail: "Three medium snails (about 90g).",
  pomo: "Two small pieces. Put together, they fill your palm (about 60g).",
  shaki: "Two small pieces. Put together, they fill your palm (about 90g).",
  wara: "Three small pieces. Put together, they fill your palm (about 90g).",
  coconut: "Two small pieces. Put together, they are about the size of one matchbox (about 40g).",
  "cow-leg": "One piece (about 90g).",
  "cow-tail": "One piece (about 90g).",
  sausage: "One sausage (about 50g).",
  "garden-egg": "Eat as much as you like. Three garden eggs is a good start.",
  cabbage: "Eat as much as you like. Two cups, cut up thin, is a good start.",
  tomato: "Eat as much as you like. Three tomatoes is a good start.",
  "bell-pepper": "Eat as much as you like. Two peppers is a good start.",
  lettuce: "Eat as much as you like. Three cups is a good start.",
  kale: "One cup. Eat it cooked or raw.",
  celery: "One stalk.",
  beetroot: "Two slices (about 80g).",
  agbalumo: "One small fruit.",
  dates: "One date only.",
  "cashew-fruit": "One fruit.",
  "passion-fruit": "Two fruits.",
  "monkey-kola": "Two small fruits.",
  jackfruit: "Three pieces. That is about half a cup (80g).",
  grapes: "About 15 grapes (80g).",
  strawberry: "About 8 berries (100g).",
  tamarind: "One pod. Or take one teaspoon of the pulp.",
  "bitter-kola": "One seed.",
  "kola-nut": "One lobe.",
  ube: "Two softened pears.",
  ekuru: "One wrap. That is about the size of your palm (150g).",
  ojojo: "Three small fritters (about 80g).",
  "beans-and-plantain": "Half a cup of cooked beans. Add two slices of plantain (80g).",
  samosa: "Best to skip this. If you do have it, only one small one.",
  "spring-roll": "Best to skip this. If you do have it, only one roll.",
  "palm-oil": "One teaspoon. No more than that.",
  "vegetable-oil": "One teaspoon. No more than that.",
  "coconut-oil": "One teaspoon. No more than that.",
  "olive-oil": "One teaspoon.",
  mustard: "One teaspoon.",
  "locust-bean": "One teaspoon in your pot of soup.",

  "egusi-soup": SOUP_CUP,
  "ogbono-soup": SOUP_CUP,
  "oha-soup": SOUP_CUP,
  "bitterleaf-soup": SOUP_CUP,
  gbegiri: SOUP_CUP,
  "white-soup": SOUP_CUP,
  "miyan-kuka": SOUP_CUP,
  "miyan-taushe": SOUP_CUP,
  "ora-soup": SOUP_CUP,
  "owho-soup": SOUP_CUP,
  "ofe-owerri": SOUP_CUP,
  "editan-soup": SOUP_CUP,
  "efo-riro": LEAFY_SOUP,
  "edikang-ikong": LEAFY_SOUP,
  "afang-soup": LEAFY_SOUP,
  "okra-soup": LEAFY_SOUP,
  "vegetable-soup": LEAFY_SOUP,
  ewedu: LEAFY_SOUP,
  "okazi-soup": LEAFY_SOUP,
  "miyan-kubewa": LEAFY_SOUP,
  "banga-soup": "One big spoon of soup (125ml). Go easy on the oil.",
  "atama-soup": "One big spoon of soup (125ml). Go easy on the oil.",
  "ofe-akwu": "One big spoon of soup (125ml). Go easy on the oil.",
  "groundnut-soup": "One big spoon of soup (125ml).",
  "tomato-stew": "One big spoon of stew (125ml).",
  ayamase: "One big spoon of stew (125ml).",
  "garden-egg-sauce": "One big spoon of sauce (125ml).",
  "pepper-sauce": "Half a big spoon (60ml).",
  // "Bowl" was a fourth size with no photo (founder chose big spoons, 2026-10-08).
  nkwobi: "One big spoon (125ml).",
  "pepper-soup": "Eat as much as you like. Four big spoons (500ml) is a good start.",
  "native-soup": "One big spoon of soup (125ml).",
};

/**
 * 4. A comma cannot join two instructions. Each of these becomes a full stop
 * and a plain verb, so the second half reads as its own thing to do.
 */
const RULES = [
  // "Bowl" is a different size in every home and has no photo. These cards
  // already said the cup that the bowl meant, so the bowl goes and the amount
  // stays exactly the same (founder, 2026-10-08).
  [/^One (?:small )?bowl\. That is about (\w)/, (_m, c) => c.toUpperCase()],
  [/^One bowl \(about one cup\)\.$/, "One cup."],
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

/**
 * The dietician's corrections. She said the salt and seasoning advice was too
 * vague to be any use, and gave the real number: under 5g of salt a day, which
 * is about one level teaspoon, and natural herbs in place of the cube.
 *
 * This script runs LAST, so this is where a correction has to live to survive.
 */
const DIETICIAN_PORTION = {
  salt: "Less than one level teaspoon (5g) in all your food for the whole day.",
};

/**
 * A fruit, or a vegetable you can count whole, is measured as ITSELF: how many
 * pieces, how big, never "half a cup" or "the size of an egg" (founder,
 * 2026-10-08: "you should not be using cup to describe fruit"). The grams are
 * the dietitian's and did not change; the shapes come from the NHS portion
 * guide and USDA household weights (a 3.5in-wide, 3/4in-thick pineapple slice
 * is 84g; a small fig 40g; a pomelo segment about 40g; a 3cm piece of melon
 * or pawpaw about 27g). Chopped or cooked mixtures (cabbage, peas, salad)
 * keep the cup, where a cup really is the easiest way.
 */
const OWN_SIZE = {
  apple: "One small apple, about 6.5cm across (120g).",
  watermelon: "Six pieces, each about 3cm on every side (150g).",
  "golden-melon": "Six pieces, each about 3cm on every side (150g).",
  pawpaw: "Four pieces, each about 3cm on every side (120g).",
  soursop: "Four pieces of the white flesh, each about 3cm on every side (100g). Take out the black seeds.",
  mango: "Half of one small mango (80g).",
  pineapple: "One round slice, about 9cm across and 2cm thick (80g).",
  jackfruit: "Three of the yellow pieces, with the seeds taken out (80g).",
  pomegranate: "The seeds from half of one medium pomegranate (80g).",
  pomelo: "Three segments, with the skin peeled off (120g).",
  fig: "Two small figs (80g).",
  "fruit-salad": "Ten small pieces of fresh fruit, each about 2cm on every side (80g).",
  "okra-veg": "Eat as much as you like. Eight okra fingers is a good start.",
  "green-beans": "Eat as much as you like. Twenty green beans is a good start.",
  broccoli: "Eat as much as you like. Eight small pieces of broccoli, each like a little tree, is a good start.",
  cauliflower: "Eat as much as you like. Eight small pieces of cauliflower is a good start.",
  mushroom: "Nine medium mushrooms, cooked (about 100g).",
  zucchini: "Half of one medium zucchini, cooked (about 120g).",
  lettuce: "Eat as much as you like. Six big leaves is a good start.",
};

const DIETICIAN_PAIRING = {
  "seasoning-cube":
    "In cooking. Onions, turmeric, garlic, and local spices give the same taste with no salt.",
};

/**
 * Pairings that told people to eat a food a way nobody here eats it.
 *
 * The founder rule is that a pairing must be food this audience actually eats,
 * cooked the way they cook it, and that a pairing nobody would make is worse
 * than no pairing at all. The worst of these was akara: the card said "Pair it
 * with vegetables instead", and nobody in Nigeria eats bean cakes with
 * vegetables. It is the same mistake as efo riro on beans, peanut butter on
 * celery, and vegetables on bread.
 *
 * Akara and moi moi were later over-corrected to "eat it on its own", which the
 * co-founder dietitian rejected (2026-10-08): akara with oats or pap, and moi
 * moi with oats, pap or salad, are real plates and safe ones, as long as the pap
 * or oats has no sugar and the pap is one small cup. It also contradicted the
 * Pap card, which itself says "moi moi or akara to slow it down".
 *
 * A yellow drink is drunk WITH food, never "alone" on an empty stomach (the
 * Smoothie card already said so; Kunu and Palm Wine said the opposite). Alcohol
 * on an empty stomach can also push sugar too LOW for anyone on insulin or
 * tablets.
 *
 * This script runs LAST, which is why the corrections live here. Beniseed stays
 * with soup, because beniseed soup is real.
 */
const REAL_PAIRINGS = {
  akara:
    "Akara goes well with oats or pap. Make them with water and add no sugar. Keep the pap to one cup, almost full (200ml).",
  // "One voice": names the partners on its own blue-card plates first (2026-10-08).
  oats: "Plain yogurt, soy milk, or groundnuts. Moi moi or akara also go well with it. Add no sugar or sweet milk.",
  eggs: "Beans, moi moi, or half an avocado. Two slices of unripe plantain (80g) also go well with it.",
  okpa: "Eat it on its own, or with pap. Keep the pap to one cup, almost full (200ml). Add no sugar.",
  kunu: "Drink it with food, like moi moi or akara. Do not drink it on an empty stomach.",
  "kunu-aya": "Drink it with food. Do not drink it on an empty stomach.",
  "palm-wine":
    "Drink it with food. On an empty stomach, it can make your sugar drop too low.",
  "plain-yogurt": "About 10 nuts, or 8 berries.",

  // Full pairing review, 2026-10-08 (co-founder dietitian: "say eat this alone,
  // or add this to it"). Wrong numbers and vague sizes fixed:
  // half a cup of cooked rice is 90g on every rice card, never 130g.
  "tomato-stew":
    "It already has fish, chicken, or meat. Eat it with half a cup of rice (90g), or a fist-size ball of swallow (100g). The swallow matters too. Oat swallow raises sugar the least, and eba, fufu, pounded yam and semovita raise it the most.",
  ayamase: "It already has assorted meat. Eat it with half a cup of ofada rice (90g).",
  "pepper-sauce":
    "Eat it with half a cup of rice (90g), two slices of plantain (80g), or two small pieces of yam (100g), plus fish or meat.",
  // The Dodo card says three small slices (60g). Gizdodo must not allow more.
  gizdodo: "The gizzard is the good part. Keep the fried plantain to three small slices (60g).",
  "miyan-kubewa": "A fist-size ball of tuwo (100g), with fish, chicken, or an egg.",
  mulberry: "About 10 nuts, or a little over half a cup of plain yogurt (150g).",
  "baba-dudu": "Better to eat one small apple instead.",
  orange: "Eat it alone, and eat it whole. Do not drink it as juice.",
  tangerine: "Eat it alone, and eat it whole. Do not drink it as juice.",
  "popcorn-plain": "Eat it alone, with water. Add no sugar or caramel.",
  "fura-da-nono": "Drink it alone, as a meal. Add no sugar.",
  nono: "Drink it alone. Add no sugar.",
  avocado: "Eat it alone, or with an egg.",
  "dambu-nama": "Eat it alone, or with vegetables.",
  "garden-egg": "Eat it alone, or with groundnut (ose oji).",
  groundnut: "Eat it alone, or with garden egg. At breakfast, add it to plain oats or plain yogurt.",
  cucumber: "Eat it alone as a snack.",
  pomegranate: "Eat it alone, or on plain yogurt.",
  "passion-fruit": "Eat it alone, or on plain yogurt.",
  "isi-ewu": "Eat it alone, with utazi and onions.",
  strawberry: "About 10 nuts, or a little over half a cup of plain yogurt (150g).",
  kiwi: "About 10 nuts, or a little over half a cup of plain yogurt (150g).",
  "fruit-salad": "About 10 nuts, or a little over half a cup of plain yogurt (150g). Add no sugar or cream.",
  smoothie: "Drink it with a meal, not on its own. Better to eat the whole fruit.",
  ojojo: "Pepper sauce. Eat it as a snack and not as a whole meal.",
  "scotch-egg":
    "Eat it on its own. Do not add bread or a sweet drink to it.",
  "french-fries":
    "If you eat it, have grilled chicken or fish with it. Drink water and not a soft drink.",
  "mixed-nuts": "Eat them on their own as a snack.",
  seeds: "Sprinkle them on your oats or on plain yogurt with no sugar.",
  "sesame-seed":
    "Stir it into soups and stews. Beniseed soup is made with it in many homes.",
  "moi-moi":
    "Moi moi goes well with oats, pap, or one cup of salad. Make the oats or pap with water and add no sugar.",
  chickpeas: "In stews and soups, with vegetables.",
};

/**
 * A bare "Alone." is not a sentence. It becomes the plain instruction the
 * co-founder dietitian asked for: "Eat it alone." or, for a drink, "Drink it
 * alone." Applied after the pairings above, so a written pairing always wins.
 */
const ALONE = /^alone\.$/i;
const foods = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(foods.map((f) => [f.id, f]));

for (const [id, text] of Object.entries({ ...MEAT, ...COOKED, ...EXACT, ...DIETICIAN_PORTION, ...OWN_SIZE })) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  f.portionGuidance = text;
}

for (const [id, text] of Object.entries({ ...DIETICIAN_PAIRING, ...REAL_PAIRINGS })) {
  const f = byId.get(id);
  if (!f) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
  f.pairingAdvice = text;
}
for (const f of foods) {
  if (f.pairingAdvice && ALONE.test(f.pairingAdvice.trim())) {
    f.pairingAdvice = f.role === "drink" ? "Drink it alone." : "Eat it alone.";
  }
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

/**
 * A comma may not be used to bolt the state of the food onto a measure.
 *
 * "Half a cup, cooked" is the exact thing rule 4 forbids, and it slipped past
 * this file twelve times, because the raw-or-cooked audit above accepts ANY text
 * containing the word "cooked" and the TACKED_ON list above is a hand-kept list
 * of phrases that never happened to include ", cooked". The two audits let it
 * through between them.
 *
 * Do not fix this by adding ", cooked" to the list above. Catch the SHAPE: a
 * comma followed by a bare state word is always wrong. Say what the cup is full
 * of instead, so the transition carries the meaning:
 *
 *   NO   Half a cup, cooked (about 130g).
 *   YES  Half a cup of cooked beans (about 130g).
 *
 * The comma must follow a MEASURE for this to fire. A plain list of ways to cook
 * a thing is not the error ("Grilled, boiled, or peppered" is fine), so anchoring
 * on the measure word is what keeps this from crying wolf.
 */
const COMMA_STATE =
  /\b(cup|cups|spoon|spoons|tablespoon|teaspoon|plate|bowl|pack|ball|slice|slices|piece|pieces|handful)\s*,\s*(cooked|raw|dry|uncooked|boiled|popped|tinned|canned|as it is served)\b/i;
for (const f of foods) {
  for (const field of ["portionGuidance", "pairingAdvice", "logicNote"]) {
    if (f[field] && COMMA_STATE.test(f[field])) {
      problems.push(
        `${f.id}.${field}: a comma is explaining instead of a transition. Say "a cup OF cooked X" -> ${f[field]}`,
      );
    }
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

// 5. One number, never a range, and no "big spoon" (co-founder dietitian).
const RANGE =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*(-|–|to|or)\s*(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|\d+)\b/i;
for (const f of foods) {
  for (const k of ["portionGuidance", "pairingAdvice", "logicNote", "carbExchange"]) {
    const v = f[k];
    if (typeof v !== "string") continue;
    if (RANGE.test(v)) problems.push(`${f.id}.${k}: a range, give one number -> ${v}`);
    if (/small cup|small glass|tea ?cup/i.test(v)) problems.push(`${f.id}.${k}: one cup only, say it against the GluFloat cup -> ${v}`);
    if (/big spoon/i.test(v) && !/big spoons?( of [\w ]+?)? \(\d+(ml|g)\)/i.test(v))
      problems.push(`${f.id}.${k}: a big spoon must say its ml (one big spoon is 125ml) -> ${v}`);
  }
}

// 6. A fruit is measured as itself, never against a cup or another object.
for (const f of foods) {
  if (f.category !== "fruit") continue;
  for (const k of ["portionGuidance", "carbExchange"]) {
    const v = f[k];
    if (typeof v === "string" && /cups?|eggs?|ball|fist|matchbox|handful/i.test(v))
      problems.push(`${f.id}.${k}: measure the fruit itself, not a cup or another object -> ${v}`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`${changed} field(s) rewritten. Instructions are whole sentences.`);
