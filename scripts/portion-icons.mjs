/**
 * Give every food a deliberate `portionIcon`.
 *
 * The picture used to be guessed from the wording of `portionGuidance` at
 * render time, so a copy edit could silently repaint a card. That is how Plain
 * Yogurt, Beer and Stockfish all ended up drawn as an apple, while Apple itself
 * was drawn as a cup of green liquid. The picture is now data: chosen once,
 * here, and reviewable in one screen.
 *
 * Idempotent and id-keyed, like scripts/health-notes.mjs. Fails if an id in the
 * table is missing from the data, or if any food is left without an icon.
 *
 *   node scripts/portion-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "foods.json");

/** id -> the picture to draw. Every food must appear exactly once. */
const ICONS = {
  // Swallow: one ball, the size of a fist.
  "garri-eba": "fist",
  "pounded-yam": "fist",
  "amala-yam": "fist",
  "amala-plantain": "fist",
  "fufu-akpu": "fist",
  semovita: "fist",
  "wheat-swallow": "fist",
  "oat-swallow": "fist",
  "tuwo-shinkafa": "fist",
  "tuwo-masara": "fist",
  "starch-delta": "fist",
  lafun: "fist",
  "cocoyam-fufu": "fist",
  "tuwo-dawa": "fist",

  // Rice and pasta: a cup measure.
  "white-rice": "half-cup",
  "jollof-rice": "half-cup",
  "fried-rice": "half-cup",
  "coconut-rice": "half-cup",
  "native-rice": "half-cup",
  "parboiled-rice": "half-cup",
  "ofada-rice": "three-quarter-cup",
  "brown-rice": "three-quarter-cup",
  "basmati-rice": "three-quarter-cup",
  "rice-and-beans": "three-quarter-cup",
  spaghetti: "half-cup",
  macaroni: "half-cup",
  couscous: "half-cup",
  "potato-salad": "half-cup",

  // Tubers.
  "boiled-yam": "matchbox",
  "roasted-yam": "matchbox",
  "boiled-water-yam": "matchbox",
  "irish-potato": "eggs",
  cocoyam: "eggs",
  "sweet-potato": "fist",
  "yam-porridge": "bowl",
  "sweet-potato-porridge": "bowl",
  ikokore: "bowl",
  achicha: "bowl",
  "ekpang-nkukwo": "bowl",

  // Plantain.
  "boiled-plantain-unripe": "plantain",
  "boiled-plantain-ripe": "plantain",
  boli: "plantain",
  "unripe-plantain-porridge": "bowl",
  gizdodo: "bowl",

  // Beans and other legumes.
  "cooked-beans": "half-cup",
  "ewa-agoyin": "half-cup",
  "fio-fio": "half-cup",
  "beans-and-plantain": "half-cup",
  "african-yam-bean": "half-cup",
  "baked-beans": "half-cup",
  chickpeas: "half-cup",
  lentils: "half-cup",
  "green-peas": "half-cup",
  "beans-porridge": "bowl",
  adalu: "bowl",
  ukwa: "bowl",
  "dan-wake": "bowl",
  "moi-moi": "palm",
  okpa: "palm",
  ekuru: "palm",
  "eko-agidi": "palm",
  akara: "pieces",

  // Bread, cereal, corn.
  "agege-bread": "slice",
  "whole-wheat-bread": "slice",
  "coconut-bread": "slice",
  "club-sandwich": "slice",
  pap: "cup",
  custard: "cup",
  tapioca: "cup",
  oats: "half-cup",
  "golden-morn": "spoon",
  weetabix: "pieces",
  pancakes: "pieces",
  masa: "pieces",
  ojojo: "pieces",
  aadun: "pieces",
  "boiled-corn": "cob",
  "roasted-corn": "cob",
  "sweet-corn": "half-cup",
  "popcorn-plain": "cup",
  abacha: "bowl",

  // Soups eaten by the spoon, and the leafy ones you may eat freely.
  "egusi-soup": "bowl",
  "ogbono-soup": "bowl",
  "oha-soup": "bowl",
  "bitterleaf-soup": "bowl",
  "banga-soup": "bowl",
  gbegiri: "bowl",
  "groundnut-soup": "bowl",
  "white-soup": "bowl",
  "miyan-kuka": "bowl",
  "miyan-taushe": "bowl",
  "ora-soup": "bowl",
  "owho-soup": "bowl",
  "native-soup": "bowl",
  "ofe-owerri": "bowl",
  "editan-soup": "bowl",
  "atama-soup": "bowl",
  "ofe-akwu": "bowl",
  "isi-ewu": "bowl",
  nkwobi: "bowl",
  "tomato-stew": "bowl",
  ayamase: "bowl",
  "garden-egg-sauce": "bowl",
  "pepper-sauce": "bowl",
  "tuna-salad": "bowl",
  "nigerian-salad": "bowl",
  "efo-riro": "free",
  "edikang-ikong": "free",
  "afang-soup": "free",
  "okra-soup": "free",
  "vegetable-soup": "free",
  ewedu: "free",
  "pepper-soup": "free",
  "okazi-soup": "free",
  "miyan-kubewa": "free",

  // Flat foods, where one palm-shaped piece is a real thing: a fillet, a slice
  // of liver, a block of tofu. These get the deck-of-cards picture.
  fish: "cards",
  "smoked-fish": "cards",
  stockfish: "cards",
  sardine: "cards",
  liver: "cards",
  tofu: "cards",
  bacon: "cards",
  "fried-chicken-fish": "cards",
  kilishi: "cards",
  // Meat that comes in chunks. A flat card would contradict the words, which
  // say "two or three medium chunks that, put together, fill your palm".
  chicken: "pieces",
  beef: "pieces",
  "beef-regular": "pieces",
  "goat-meat": "pieces",
  turkey: "pieces",
  kidney: "pieces",
  asun: "pieces",
  "ram-meat": "pieces",
  grasscutter: "pieces",
  suya: "pieces",
  "dambu-nama": "handful",
  gizzard: "pieces",
  pomo: "pieces",
  shaki: "pieces",
  "cow-leg": "pieces",
  "cow-tail": "pieces",
  snail: "pieces",
  sausage: "pieces",
  "corned-beef": "spoon",
  periwinkle: "handful",
  crab: "handful",
  "prawns-crayfish": "handful",

  // Eggs.
  eggs: "eggs",
  "fried-egg": "eggs",
  "scrambled-egg": "eggs",
  "egg-sauce": "eggs",
  omelette: "eggs",
  "scotch-egg": "eggs",

  // Vegetables you may eat freely.
  ugu: "free",
  waterleaf: "free",
  spinach: "free",
  soko: "free",
  "bitterleaf-veg": "free",
  "garden-egg": "free",
  "okra-veg": "free",
  cucumber: "free",
  cabbage: "free",
  tomato: "free",
  "green-beans": "free",
  lettuce: "free",
  "bell-pepper": "free",
  "scent-leaf": "free",
  broccoli: "free",
  cauliflower: "free",
  // Vegetables with a real limit.
  carrot: "sticks",
  celery: "sticks",
  beetroot: "slice",
  pumpkin: "half-cup",
  turnip: "half-cup",
  mushroom: "cup",
  kale: "cup",
  zucchini: "cup",
  coleslaw: "cup",
  "bean-sprouts": "cup",
  ugba: "handful",
  uziza: "handful",
  utazi: "handful",
  "spring-onion": "handful",
  parsley: "handful",
  radish: "handful",
  onion: "pieces",

  // Fruit.
  orange: "whole-fruit",
  apple: "whole-fruit",
  guava: "whole-fruit",
  agbalumo: "whole-fruit",
  "cashew-fruit": "whole-fruit",
  tangerine: "whole-fruit",
  "lime-lemon": "whole-fruit",
  "monkey-kola": "whole-fruit",
  "passion-fruit": "whole-fruit",
  "hog-plum": "whole-fruit",
  "star-fruit": "whole-fruit",
  kiwi: "whole-fruit",
  avocado: "half-fruit",
  mango: "half-fruit",
  grapefruit: "half-fruit",
  sweetsop: "half-fruit",
  banana: "plantain",
  pawpaw: "slice",
  watermelon: "slice",
  pineapple: "slice",
  grapes: "berries",
  strawberry: "berries",
  mulberry: "berries",
  pomegranate: "berries",
  soursop: "pieces",
  dates: "pieces",
  jackfruit: "pieces",
  fig: "pieces",
  "golden-melon": "pieces",
  "fruit-salad": "pieces",
  tamarind: "pieces",
  "velvet-tamarind": "handful",
  pomelo: "three-quarter-cup",
  "baobab-fruit": "spoon",

  // Nuts, seeds, oils, spreads.
  groundnut: "handful",
  "cashew-nut": "handful",
  "tiger-nut": "handful",
  walnut: "handful",
  almond: "handful",
  "mixed-nuts": "handful",
  "kuli-kuli": "handful",
  "egusi-seed": "handful",
  coconut: "pieces",
  ube: "pieces",
  "bitter-kola": "pieces",
  "kola-nut": "pieces",
  donkwa: "pieces",
  robo: "pieces",
  wara: "pieces",
  "palm-oil": "spoon",
  "vegetable-oil": "spoon",
  "olive-oil": "spoon",
  "coconut-oil": "spoon",
  butter: "spoon",
  mayonnaise: "spoon",
  "peanut-butter": "spoon",
  "sesame-seed": "spoon",
  seeds: "spoon",

  // Drinks.
  "zobo-unsweetened": "glass",
  kunu: "glass",
  "kunu-aya": "glass",
  "palm-wine": "glass",
  "tea-coffee": "glass",
  water: "glass",
  "coconut-water": "glass",
  "fura-da-nono": "glass",
  smoothie: "glass",
  beer: "glass",
  pito: "glass",
  nono: "glass",
  "soy-milk": "glass",
  "milk-full-cream": "glass",
  "plain-yogurt": "cup",
  "evaporated-milk": "spoon",

  // Seasoning: only a taste.
  ginger: "pinch",
  garlic: "pinch",
  "seasoning-cube": "pinch",
  "pepper-chili": "pinch",
  sweetener: "pinch",
  "curry-powder": "pinch",
  thyme: "pinch",
  "locust-bean": "spoon",
  ketchup: "spoon",
  mustard: "spoon",
  salt: "spoon",

  // Foods to skip. The red no-entry sign, and the signal the verdict engine
  // reads to say "Best to skip the X" instead of "A safe size is ...".
  "fried-yam": "avoid",
  dodo: "avoid",
  "plantain-chips": "avoid",
  "chin-chin": "avoid",
  "puff-puff": "avoid",
  "meat-pie": "avoid",
  "sausage-roll": "avoid",
  buns: "avoid",
  doughnut: "avoid",
  biscuits: "avoid",
  cake: "avoid",
  "ice-cream": "avoid",
  cornflakes: "avoid",
  "egg-roll": "avoid",
  "soft-drink": "avoid",
  "fruit-juice": "avoid",
  "malt-drink": "avoid",
  "energy-drink": "avoid",
  "zobo-sweetened": "avoid",
  "soaked-garri": "avoid",
  "milo-bournvita": "avoid",
  "condensed-milk": "avoid",
  "sweetened-yogurt": "avoid",
  "table-sugar": "avoid",
  honey: "avoid",
  "glucose-lucozade": "avoid",
  sugarcane: "avoid",
  chapman: "avoid",
  lacasera: "avoid",
  "local-gin": "avoid",
  "yoghurt-drink": "avoid",
  "sugarcane-juice": "avoid",
  "flavoured-milk": "avoid",
  shawarma: "avoid",
  samosa: "avoid",
  "spring-roll": "avoid",
  "fish-roll": "avoid",
  "small-chops": "avoid",
  kokoro: "avoid",
  "coconut-candy": "avoid",
  "cassava-chips": "avoid",
  pizza: "avoid",
  burger: "avoid",
  "hot-dog": "avoid",
  "french-fries": "avoid",
  "potato-crisps": "avoid",
  indomie: "avoid",
  waffles: "avoid",
  "chocolate-bar": "avoid",
  "peanut-candy": "avoid",
  "baba-dudu": "avoid",
  "chocolate-spread": "avoid",
  jam: "avoid",
  alkaki: "avoid",
  baguette: "avoid",
  "dried-fruit": "avoid",
  "canned-fruit": "avoid",
};

const foods = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(foods.map((f) => [f.id, f]));

let missing = 0;
for (const id of Object.keys(ICONS)) {
  if (!byId.has(id)) {
    console.error(`no such food: ${id}`);
    missing += 1;
  }
}
if (missing) process.exit(1);

let changed = 0;
for (const f of foods) {
  const icon = ICONS[f.id];
  if (!icon) {
    console.error(`no icon chosen for: ${f.id} (${f.name})`);
    missing += 1;
    continue;
  }
  if (f.portionIcon !== icon) {
    f.portionIcon = icon;
    changed += 1;
  }
}
if (missing) {
  console.error(`\n${missing} food(s) have no picture. Add them to ICONS.`);
  process.exit(1);
}

const generic = foods.filter((f) => f.portionIcon === "generic");
if (generic.length) {
  console.error(`these fall back to the meaningless grey dot: ${generic.map((f) => f.id).join(", ")}`);
  process.exit(1);
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");

const counts = {};
for (const f of foods) counts[f.portionIcon] = (counts[f.portionIcon] ?? 0) + 1;
console.log(`${foods.length} foods, ${changed} icon(s) set.`);
console.table(counts);
