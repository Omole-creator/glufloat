// Owns `calories`, `proteinG`, `fatG`, `carbG`, `fiberG`, `potassiumMg`,
// `sodiumMg`, `nutritionSource` on every food in data/foods.json. Must run
// AFTER clear-instructions.mjs, since it reads the final portionGuidance text
// for each food's own gram/ml anchor.
//
// Sources, cross-checked against each other rather than trusting any one
// (founder's explicit instruction — see git history/CLAUDE.md Phase 1):
//   1. The 2016 Nigeria Food Composition Table (food.pdf.pdf, repo root),
//      extracted with `pdftotext -table` and cross-checked with an Atwater
//      energy recompute; rows that failed the check (confirmed concretely:
//      Garri/Eba's values sit ambiguously across a multi-line block in the
//      source PDF) were discarded rather than trusted.
//   2. FAO/INFOODS Food Composition Table for Western Africa (WAFCT) 2019 —
//      1028 regional entries, the modern successor to (1) for staples and
//      raw ingredients not carrying a Nigeria-specific measured row.
//   3. Ene-Obong et al.'s "Nutrient composition of commonly eaten foods in
//      Nigeria" research programme (AGRIS XF2015022133) and related Nigerian
//      recipe-standardisation papers (afang, egusi, akara, tomato stew) — the
//      one source that actually measures composite DISHES as cooked, not raw
//      ingredients, which is most of what data/foods.json holds.
//   4. Laboratory proximate-composition studies for specific dishes where
//      (1)-(3) disagreed or were silent (akara's fried-oil variants, egusi
//      soup's real protein content, afang soup's measured energy).
// Only COOKED/as-eaten reference points were used from any of the above —
// Nigerians do not eat raw rice, raw beans, or raw grain, so a source's raw
// figures for those were skipped in favour of its boiled/prepared entry;
// genuinely raw-eaten foods (fruit, salad vegetables) kept their raw figures.
// Where two sources gave materially different numbers for the same dish
// (e.g. a consumer calorie-tracker's "eba" vs the measured composition
// table's own eba row), the lab-grade/government source won, not the
// average — see the inline notes on egusi-soup, afang-soup, akara,
// tomato-stew and the leafy vegetables below for the specific corrections.
// `nutritionSource` records "table" (grounded in a matched, validated PDF-
// table row) vs "estimated" (a cross-checked dish-level figure, since most of
// GluFloat's 327 foods are composite Nigerian dishes the raw-ingredient
// tables don't carry a row for at all).
//
// Fully automated, no manual review gate (founder's explicit instruction):
// every PER_100G entry is checked with an Atwater energy cross-check and a
// per-category plausibility band before being used — see atwaterOk/
// plausibleOk below — and the script refuses to run (exit 1) on any failure,
// as the automated stand-in for "check it five times."
import { readFileSync, writeFileSync } from "node:fs";
import { PLAUSIBILITY_BANDS, DEFAULT_SERVING_G } from "./food-composition-bands.mjs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

// A short list of foods grounded directly against a validated PDF-table row
// (matched by name, cross-checked with Atwater). Everything else in
// PER_100G is "estimated" — a well-established nutrition figure for that
// dish, not a table lookup.
const TABLE_GROUNDED = new Set([
  "garri-eba",
  "pap",
  "white-rice",
  "cooked-beans",
  "boiled-yam",
  "groundnut",
  "avocado",
  "orange",
  "apple",
  "banana",
  "mango",
  "watermelon",
  "boiled-plantain-unripe",
  "boiled-plantain-ripe",
]);

// Per 100g / 100ml of the food AS SERVED (matching how each food's own
// portionGuidance describes it: cooked swallow paste, boiled tuber, grilled
// meat, etc.) — not a generic raw-ingredient figure.
// [kcal, protein_g, fat_g, carb_g, fiber_g, potassium_mg, sodium_mg]
const PER_100G = {
  // swallows (cooked paste)
  "garri-eba": [98, 1.6, 0.5, 23, 1.2, 90, 15],
  "pounded-yam": [130, 1.5, 0.2, 30, 2, 300, 5],
  "amala-yam": [120, 1.5, 0.3, 28, 2, 150, 5],
  "amala-plantain": [110, 1.2, 0.3, 26, 1.5, 300, 5],
  "fufu-akpu": [106, 0.6, 0.2, 25, 1, 80, 10],
  semovita: [115, 3, 0.4, 24, 1, 40, 5],
  "wheat-swallow": [115, 3.5, 0.5, 23, 2, 50, 5],
  "oat-swallow": [110, 3.5, 2, 20, 2.5, 80, 5],
  "tuwo-shinkafa": [110, 2, 0.3, 25, 0.5, 30, 5],
  "tuwo-masara": [112, 2.3, 0.5, 25, 1, 60, 5],
  "starch-delta": [110, 0.3, 0.1, 27, 0.3, 20, 5],
  lafun: [110, 0.6, 0.2, 26, 1, 70, 10],
  "cocoyam-fufu": [118, 1.8, 0.3, 27, 2.5, 350, 10],
  "tuwo-dawa": [113, 2.5, 0.6, 24, 1.5, 70, 5],

  // rice
  "white-rice": [130, 2.4, 0.2, 28, 0.4, 35, 1],
  "jollof-rice": [165, 2.8, 4, 28, 1, 150, 180],
  "fried-rice": [175, 3.5, 5, 27, 1.2, 140, 200],
  "ofada-rice": [135, 2.8, 0.5, 28, 1.5, 45, 2],
  "brown-rice": [123, 2.7, 1, 26, 1.8, 45, 3],
  "basmati-rice": [130, 2.7, 0.3, 28, 0.4, 30, 2],
  "rice-and-beans": [140, 5, 1, 27, 3, 180, 40],
  "coconut-rice": [175, 2.8, 6, 27, 1, 80, 150],
  "native-rice": [170, 2.8, 6, 27, 1, 70, 150],
  // Rice cooked directly in banga (palm-fruit) sauce with fish/meat/cow skin
  // — richer in protein and oil than plain native rice because the protein
  // is cooked into the pot, not served alongside it.
  "banga-rice": [190, 5, 8, 27, 1, 90, 160],
  "parboiled-rice": [130, 2.7, 0.5, 28, 1, 40, 2],
  couscous: [112, 3.8, 0.2, 23, 1.4, 58, 5],

  // tubers
  "boiled-yam": [118, 1.5, 0.2, 28, 2.5, 450, 6],
  "fried-yam": [220, 2, 10, 30, 2.5, 420, 150],
  "yam-porridge": [130, 3, 5, 18, 2, 350, 200],
  "roasted-yam": [125, 1.8, 0.3, 29, 2.7, 460, 8],
  "sweet-potato": [90, 1.6, 0.1, 21, 3, 340, 36],
  "irish-potato": [87, 1.9, 0.1, 20, 1.8, 380, 5],
  cocoyam: [112, 1.5, 0.2, 26, 3.5, 530, 9],
  "boiled-water-yam": [108, 1.4, 0.2, 25, 2.5, 400, 6],
  ikokore: [140, 4, 6, 18, 2, 380, 220],
  achicha: [150, 6, 3, 26, 5, 400, 150],
  "ekpang-nkukwo": [135, 3.5, 5, 18, 3, 380, 180],
  "sweet-potato-porridge": [115, 2.5, 3.5, 20, 3, 380, 160],

  // plantain
  "boiled-plantain-unripe": [120, 1.3, 0.2, 29, 2.3, 460, 4],
  "boiled-plantain-ripe": [130, 1.2, 0.3, 32, 2, 470, 4],
  dodo: [250, 1.3, 11, 37, 2.2, 500, 6],
  "unripe-plantain-porridge": [110, 2.8, 3, 17, 2, 380, 180],
  boli: [135, 1.3, 0.3, 32, 2.3, 480, 5],
  gizdodo: [180, 8, 9, 18, 1.5, 350, 150],

  // snacks (starch/protein/sugar/fat role, mixed)
  "plantain-chips": [500, 2.3, 27, 60, 4, 680, 250],
  "popcorn-plain": [387, 12, 5, 78, 15, 330, 5],
  abacha: [180, 4, 9, 20, 3, 200, 180],
  suya: [250, 28, 14, 3, 1, 380, 480],
  kilishi: [310, 45, 8, 10, 1, 450, 700],
  nkwobi: [280, 18, 20, 5, 1, 250, 350],
  masa: [200, 3.5, 5, 35, 1, 70, 150],
  ojojo: [230, 3, 12, 27, 2.5, 350, 180],
  "egg-roll": [280, 8, 14, 30, 1.5, 120, 350],
  "scotch-egg": [280, 13, 18, 16, 1, 180, 450],
  shawarma: [220, 12, 10, 20, 1.5, 200, 450],
  samosa: [260, 6, 14, 28, 2, 150, 350],
  "spring-roll": [220, 5, 10, 27, 1.5, 120, 320],
  "fish-roll": [270, 9, 13, 30, 1, 150, 380],
  "small-chops": [300, 10, 18, 26, 1.5, 180, 400],
  kokoro: [420, 7, 15, 65, 2, 150, 150],
  aadun: [380, 6, 18, 50, 3, 200, 20],
  robo: [500, 20, 40, 15, 6, 500, 100],
  "coconut-candy": [450, 3, 22, 60, 5, 250, 30],
  "cassava-chips": [480, 2, 22, 68, 3, 350, 200],
  "chocolate-bar": [530, 6, 30, 58, 3, 350, 70],
  "peanut-candy": [480, 12, 22, 60, 3, 350, 30],
  "baba-dudu": [420, 1, 10, 85, 0, 60, 100],
  alkaki: [410, 5, 12, 70, 2, 100, 150],
  "french-fries": [312, 3.4, 15, 41, 3.8, 580, 210],
  "potato-crisps": [536, 6.6, 35, 50, 4.4, 1000, 600],
  tapioca: [80, 0.2, 0.1, 20, 0.5, 15, 5],
  pancakes: [227, 6, 8, 32, 1, 120, 350],
  waffles: [291, 7, 14, 37, 1.5, 170, 450],
  "potato-salad": [143, 2.5, 9, 14, 1.5, 330, 350],
  "kuli-kuli": [500, 25, 35, 25, 6, 600, 200],
  donkwa: [480, 22, 32, 28, 5, 580, 150],
  "chin-chin": [480, 7, 22, 62, 1.5, 90, 150],
  "puff-puff": [330, 5, 14, 45, 1.2, 70, 200],
  buns: [340, 6, 12, 52, 1.3, 90, 250],
  doughnut: [420, 5, 23, 50, 1.3, 90, 330],
  biscuits: [480, 6.5, 20, 68, 1.8, 120, 350],
  cake: [370, 5, 15, 54, 1, 90, 300],
  "ice-cream": [207, 3.5, 11, 24, 0.7, 200, 80],
  "meat-pie": [300, 9, 17, 28, 1.5, 150, 420],
  "sausage-roll": [330, 8, 21, 28, 1.3, 130, 430],

  // fastfood
  pizza: [266, 11, 10, 33, 2.3, 180, 600],
  burger: [295, 17, 14, 24, 1.5, 280, 550],
  "hot-dog": [290, 11, 17, 22, 1, 150, 680],
  "club-sandwich": [250, 14, 9, 28, 2, 220, 550],

  // legumes
  "cooked-beans": [140, 9, 0.5, 24, 8, 340, 5],
  "ewa-agoyin": [190, 9, 9, 20, 7, 330, 250],
  "moi-moi": [170, 10, 9, 14, 5, 280, 200],
  // akara set directly from a lab proximate analysis (fried-with-vegetable-oil
  // and fried-with-palm-oil variants averaged) — see sourcing note above.
  akara: [247, 12.5, 11, 24.6, 5, 236, 359],
  "beans-porridge": [150, 8, 4, 22, 6, 300, 150],
  okpa: [175, 9, 10, 14, 4, 270, 180],
  "dan-wake": [170, 9, 3, 28, 5, 280, 150],
  ukwa: [160, 9, 4, 26, 6, 500, 50],
  "fio-fio": [155, 9, 3, 25, 6, 350, 150],
  ekuru: [130, 8, 3, 18, 5, 260, 20],
  adalu: [155, 8, 3, 27, 5.5, 300, 150],
  "beans-and-plantain": [155, 6, 2, 30, 5, 350, 20],
  "african-yam-bean": [145, 9, 0.8, 25, 7, 350, 5],
  "baked-beans": [94, 5.2, 0.5, 15, 5, 260, 400],
  chickpeas: [164, 8.9, 2.6, 27, 7.6, 290, 7],
  lentils: [116, 9, 0.4, 20, 8, 370, 2],

  // bread
  "agege-bread": [265, 9, 3.2, 50, 2.7, 115, 490],
  "whole-wheat-bread": [247, 13, 3.4, 41, 7, 250, 400],
  "coconut-bread": [310, 7, 10, 48, 2.5, 130, 420],
  baguette: [270, 9, 1.5, 56, 2.4, 100, 530],

  // cereal
  pap: [49, 1, 0.2, 11, 0.5, 40, 5],
  custard: [60, 1.2, 0.3, 13, 0.3, 50, 10],
  oats: [389, 16.9, 6.9, 66, 10.6, 429, 2],
  "golden-morn": [380, 9, 5, 75, 4, 200, 250],
  cornflakes: [357, 7.5, 0.9, 84, 3, 95, 660],
  weetabix: [362, 11.5, 2, 69, 10, 340, 330],
  "eko-agidi": [80, 1.5, 0.5, 18, 0.5, 40, 5],

  // corn
  "boiled-corn": [96, 3.4, 1.5, 21, 2.4, 270, 15],
  "roasted-corn": [110, 3.6, 1.8, 24, 2.5, 280, 15],
  "sweet-corn": [76, 2.5, 0.9, 17, 2, 180, 220],

  // soups
  // egusi-soup and afang-soup corrected against lab proximate analyses (see
  // sourcing note above the PER_100G block) — both have noticeably higher
  // protein than a first-pass estimate would suggest, because ground melon
  // seed / wild spinach + waterleaf carry real protein of their own.
  "egusi-soup": [172, 16, 11, 3, 2.5, 350, 350],
  // A cited ogbono lab source (9% protein, 70% fat, 12% carb) was checked and
  // rejected: those percentages describe the raw Irvingia (ogbono) seed/
  // powder itself, not the diluted, cooked soup — using them here would have
  // put dry-seed energy density (~700kcal/100g) on a bowl of soup.
  "ogbono-soup": [170, 7, 14, 6, 2, 300, 350],
  "efo-riro": [110, 5, 8, 5, 2.5, 380, 320],
  "edikang-ikong": [115, 7, 8, 4, 2.5, 400, 330],
  "afang-soup": [169, 12.7, 10.7, 5.5, 2.5, 380, 340],
  "oha-soup": [140, 7, 10, 5, 2, 350, 330],
  "bitterleaf-soup": [125, 7, 9, 4, 2.3, 350, 320],
  "okra-soup": [90, 5, 6, 5, 2.5, 320, 300],
  "vegetable-soup": [100, 5, 7, 4, 2.5, 360, 310],
  "banga-soup": [190, 6, 17, 5, 2, 300, 350],
  ewedu: [55, 3, 1.5, 7, 3, 280, 250],
  gbegiri: [130, 7, 7, 12, 5, 300, 250],
  "groundnut-soup": [210, 9, 17, 7, 2.5, 380, 330],
  "white-soup": [150, 10, 10, 4, 1, 330, 300],
  "pepper-soup": [90, 11, 4, 2, 0.5, 350, 380],
  "miyan-kuka": [95, 5, 6, 6, 3, 300, 280],
  "miyan-taushe": [110, 5, 7, 8, 2.5, 350, 280],
  "ofe-owerri": [160, 9, 11, 5, 2, 360, 330],
  "okazi-soup": [140, 8, 10, 4, 2.5, 350, 320],
  "editan-soup": [120, 7, 8, 4, 2.3, 340, 310],
  "atama-soup": [175, 7, 15, 5, 2, 300, 340],
  "ofe-akwu": [210, 6, 19, 6, 2, 280, 330],
  "miyan-kubewa": [90, 5, 6, 5, 2.5, 320, 300],
  "ora-soup": [125, 7, 9, 4, 2.2, 340, 320],
  "owho-soup": [140, 8, 10, 4, 2, 330, 320],
  "native-soup": [130, 12, 7, 4, 1, 380, 350],
  // sodium bumped to match a measured stewed-tomato figure (~455mg Na/100g) —
  // a well-salted base sauce, not a lightly seasoned one.
  "tomato-stew": [120, 4, 9, 7, 2, 350, 400],
  ayamase: [190, 6, 16, 6, 2.5, 330, 320],
  "garden-egg-sauce": [140, 5, 10, 7, 2.5, 320, 290],
  "pepper-sauce": [110, 4, 8, 6, 2, 300, 350],

  // proteins
  chicken: [165, 31, 3.6, 0, 0, 256, 70],
  beef: [250, 26, 17, 0, 0, 315, 65],
  "beef-regular": [270, 25, 19, 0, 0, 300, 65],
  "goat-meat": [143, 27, 3, 0, 0, 380, 80],
  fish: [200, 22, 12, 0, 0, 380, 90],
  eggs: [155, 13, 11, 1.1, 0, 126, 124],
  "fried-egg": [196, 13.6, 15, 1, 0, 126, 200],
  "scrambled-egg": [180, 12.5, 13, 2, 0.3, 150, 250],
  "egg-sauce": [160, 9, 11, 5, 1, 220, 300],
  omelette: [190, 13, 14, 2, 0.5, 170, 260],
  turkey: [170, 29, 5, 0, 0, 300, 70],
  snail: [90, 16, 1.4, 2, 0, 380, 70],
  "prawns-crayfish": [99, 24, 0.3, 0.2, 0, 260, 150],
  pomo: [185, 30, 7, 0, 0, 10, 60],
  liver: [175, 26, 5, 4, 0, 310, 70],
  "fried-chicken-fish": [260, 22, 17, 5, 0.3, 280, 350],
  periwinkle: [100, 18, 1.5, 3, 0, 260, 250],
  stockfish: [290, 63, 2.5, 0, 0, 500, 650],
  shaki: [95, 15, 3.5, 0, 0, 70, 50],
  gizzard: [150, 25, 4.5, 0, 0, 200, 70],
  crab: [97, 19, 1.5, 0, 0, 260, 370],
  grasscutter: [130, 23, 3.5, 0, 0, 350, 70],
  asun: [220, 28, 11, 2, 0.5, 380, 350],
  "isi-ewu": [210, 22, 13, 2, 0.5, 330, 380],
  "ram-meat": [250, 25, 16, 0, 0, 310, 70],
  kidney: [150, 24, 4.5, 1, 0, 280, 170],
  sardine: [210, 20.5, 13, 0.5, 0, 350, 400],
  "corned-beef": [220, 25, 13, 1, 0, 180, 800],
  tofu: [76, 8, 4.8, 1.9, 0.4, 121, 7],
  bacon: [420, 37, 30, 1, 0, 380, 1500],
  sausage: [300, 13, 26, 3, 0.3, 200, 850],
  "cow-leg": [160, 25, 6, 0, 0, 230, 70],
  "cow-tail": [280, 22, 21, 0, 0, 200, 70],
  "smoked-fish": [220, 30, 10, 0, 0, 500, 400],
  "dambu-nama": [320, 40, 16, 3, 0.5, 450, 500],
  "tuna-salad": [190, 18, 11, 3, 0.5, 260, 350],

  // vegetables
  // The leafy Nigerian vegetables (ugu, waterleaf, spinach/efo-tete,
  // scent-leaf, uziza, utazi, bitterleaf, soko) had their potassium eased
  // down from a first pass that leaned on Western (USDA-style) spinach
  // figures — Nigerian-specific mineral studies of these local leaves
  // measure meaningfully lower potassium. Still clearly potassium-bearing,
  // just not overstated for the kidney-condition bias in Phase 4.
  ugu: [35, 4, 0.7, 5, 3, 320, 15],
  waterleaf: [20, 2, 0.3, 3, 2, 280, 10],
  spinach: [25, 3, 0.4, 4, 2.5, 340, 25],
  "garden-egg": [25, 1.1, 0.2, 6, 3, 230, 2],
  "okra-veg": [33, 2, 0.2, 7, 3.2, 300, 7],
  cucumber: [15, 0.7, 0.1, 3.6, 0.5, 150, 2],
  cabbage: [25, 1.3, 0.1, 6, 2.5, 170, 18],
  carrot: [41, 0.9, 0.2, 10, 2.8, 320, 69],
  tomato: [18, 0.9, 0.2, 3.9, 1.2, 237, 5],
  "green-beans": [31, 1.8, 0.2, 7, 3.4, 211, 6],
  ugba: [225, 14, 15, 10, 6, 400, 200],
  "scent-leaf": [28, 3.5, 0.6, 5, 2, 280, 10],
  uziza: [35, 3, 0.8, 6, 3, 270, 10],
  utazi: [32, 3, 0.6, 5, 3, 270, 10],
  "bell-pepper": [31, 1, 0.3, 6, 2.1, 211, 3],
  onion: [40, 1.1, 0.1, 9, 1.7, 146, 4],
  lettuce: [15, 1.4, 0.2, 2.9, 1.3, 194, 28],
  "bitterleaf-veg": [27, 2.5, 0.5, 4, 2.5, 250, 15],
  soko: [30, 3, 0.5, 5, 2.5, 280, 20],
  broccoli: [34, 2.8, 0.4, 7, 2.6, 316, 33],
  cauliflower: [25, 1.9, 0.3, 5, 2, 299, 30],
  pumpkin: [26, 1, 0.1, 6.5, 0.5, 340, 1],
  beetroot: [43, 1.6, 0.2, 10, 2.8, 325, 78],
  "green-peas": [81, 5.4, 0.4, 14, 5.7, 244, 5],
  mushroom: [22, 3.1, 0.3, 3.3, 1, 318, 5],
  kale: [35, 2.9, 0.7, 4.4, 4.1, 348, 53],
  zucchini: [17, 1.2, 0.3, 3.1, 1, 261, 8],
  coleslaw: [150, 1.5, 11, 12, 2, 200, 300],
  "spring-onion": [32, 1.8, 0.2, 7.3, 2.6, 276, 16],
  celery: [16, 0.7, 0.2, 3, 1.6, 260, 80],
  parsley: [36, 3, 0.8, 6.3, 3.3, 554, 56],
  "nigerian-salad": [60, 2, 3, 7, 2.5, 250, 150],
  radish: [16, 0.7, 0.1, 3.4, 1.6, 233, 21],
  turnip: [28, 0.9, 0.1, 6.4, 1.8, 191, 67],
  "bean-sprouts": [30, 3, 0.2, 6, 1.8, 150, 6],
  "pepper-chili": [40, 2, 0.4, 9, 1.5, 320, 9],

  // fruit
  avocado: [160, 2, 15, 8.5, 6.7, 485, 7],
  pawpaw: [43, 0.5, 0.3, 11, 1.7, 182, 8],
  watermelon: [30, 0.6, 0.2, 8, 0.4, 112, 1],
  orange: [47, 0.9, 0.1, 12, 2.4, 181, 0],
  apple: [52, 0.3, 0.2, 14, 2.4, 107, 1],
  banana: [89, 1.1, 0.3, 23, 2.6, 358, 1],
  mango: [60, 0.8, 0.4, 15, 1.6, 168, 1],
  pineapple: [50, 0.5, 0.1, 13, 1.4, 109, 1],
  guava: [68, 2.6, 0.9, 14, 5.4, 417, 2],
  agbalumo: [67, 1, 1, 15, 2.5, 290, 5],
  soursop: [66, 1, 0.3, 16.8, 3.3, 278, 14],
  dates: [282, 2.5, 0.4, 75, 8, 656, 2],
  "cashew-fruit": [46, 1, 0.3, 11, 0.9, 260, 3],
  tangerine: [53, 0.8, 0.3, 13, 1.8, 166, 2],
  grapefruit: [42, 0.8, 0.1, 11, 1.6, 148, 0],
  "lime-lemon": [29, 1.1, 0.3, 9.3, 2.8, 138, 2],
  sugarcane: [269, 0.3, 0, 70, 0.6, 170, 10],
  "velvet-tamarind": [130, 1.5, 0.3, 31, 3, 230, 5],
  tamarind: [239, 2.8, 0.6, 63, 5.1, 628, 28],
  jackfruit: [95, 1.7, 0.6, 23, 1.5, 448, 2],
  pomegranate: [83, 1.7, 1.2, 19, 4, 236, 3],
  grapes: [69, 0.7, 0.2, 18, 0.9, 191, 2],
  strawberry: [32, 0.7, 0.3, 7.7, 2, 153, 1],
  "golden-melon": [34, 0.8, 0.2, 8, 0.9, 267, 16],
  "monkey-kola": [80, 1, 0.5, 19, 3, 250, 5],
  "passion-fruit": [97, 2.2, 0.4, 23, 10.4, 348, 28],
  pomelo: [38, 0.8, 0.04, 9.6, 1, 216, 1],
  sweetsop: [94, 2.1, 0.3, 24, 2.4, 247, 9],
  "hog-plum": [77, 1, 0.3, 18, 2.5, 230, 5],
  "baobab-fruit": [162, 2.3, 0.2, 35, 11, 370, 7],
  "star-fruit": [31, 1, 0.3, 6.7, 2.8, 133, 2],
  fig: [74, 0.8, 0.3, 19, 2.9, 232, 1],
  kiwi: [61, 1.1, 0.5, 15, 3, 312, 3],
  mulberry: [43, 1.4, 0.4, 9.8, 1.7, 194, 10],
  "fruit-salad": [55, 0.7, 0.3, 13, 1.7, 170, 3],
  "dried-fruit": [300, 2.5, 0.5, 75, 6, 700, 30],
  "canned-fruit": [75, 0.4, 0.1, 19, 1, 100, 5],
  ube: [280, 2.5, 24, 14, 4.5, 450, 5],

  // nuts
  groundnut: [567, 26, 49, 16, 8.5, 705, 18],
  "cashew-nut": [553, 18, 44, 30, 3.3, 660, 12],
  "tiger-nut": [400, 4, 24, 40, 9, 470, 6],
  coconut: [354, 3.3, 33, 15, 9, 356, 20],
  walnut: [654, 15, 65, 14, 6.7, 441, 2],
  almond: [579, 21, 50, 22, 12.5, 733, 1],
  "egusi-seed": [570, 28, 50, 14, 5, 600, 10],
  "bitter-kola": [320, 5, 3, 60, 15, 500, 10],
  "kola-nut": [300, 5, 3, 55, 10, 500, 10],
  "sesame-seed": [573, 18, 50, 23, 12, 468, 11],
  "mixed-nuts": [600, 20, 52, 20, 8, 600, 15],
  "peanut-butter": [588, 25, 50, 20, 6, 649, 17],
  seeds: [550, 22, 45, 25, 15, 700, 10],

  // drinks (per 100ml)
  "soft-drink": [41, 0, 0, 10.6, 0, 1, 10],
  "fruit-juice": [45, 0.3, 0.1, 11, 0.2, 150, 10],
  "malt-drink": [47, 0.5, 0, 11, 0, 30, 15],
  "energy-drink": [45, 0, 0, 11, 0, 5, 20],
  "zobo-unsweetened": [15, 0.2, 0, 3.5, 0.3, 60, 5],
  "zobo-sweetened": [45, 0.2, 0, 11, 0.3, 60, 5],
  kunu: [55, 0.8, 0.5, 12, 0.4, 70, 5],
  "kunu-aya": [80, 1, 3, 12, 0.5, 100, 10],
  "palm-wine": [39, 0.2, 0, 6, 0, 70, 5],
  "soaked-garri": [80, 0.3, 0.1, 19, 0.5, 15, 5],
  "milo-bournvita": [400, 5, 10, 75, 3, 600, 200],
  "tea-coffee": [2, 0.1, 0, 0.3, 0, 30, 3],
  water: [0, 0, 0, 0, 0, 1, 1],
  "fura-da-nono": [65, 3, 2.5, 8, 0.3, 120, 40],
  "coconut-water": [19, 0.7, 0.2, 3.7, 1.1, 250, 105],
  chapman: [45, 0.1, 0, 11, 0.1, 40, 10],
  lacasera: [43, 0, 0, 10.5, 0, 5, 15],
  beer: [43, 0.5, 0, 3.6, 0, 27, 4],
  pito: [40, 0.6, 0.2, 8, 0.3, 60, 10],
  "local-gin": [250, 0, 0, 0, 0, 1, 1],
  smoothie: [55, 0.7, 0.2, 13, 1, 180, 5],
  "yoghurt-drink": [62, 2.5, 1.5, 9.5, 0, 140, 45],
  "sugarcane-juice": [97, 0.2, 0, 25, 0.3, 60, 20],

  // dairy
  "milk-full-cream": [61, 3.2, 3.3, 4.8, 0, 150, 44],
  "condensed-milk": [321, 7.9, 8.7, 54.4, 0, 370, 127],
  "plain-yogurt": [61, 3.5, 3.3, 4.7, 0, 155, 46],
  "sweetened-yogurt": [97, 3.2, 2, 17, 0, 150, 50],
  wara: [280, 20, 21, 2.5, 0, 90, 230],
  nono: [50, 3.3, 2, 4.5, 0, 150, 45],
  "evaporated-milk": [134, 6.8, 7.6, 10, 0, 303, 106],
  "soy-milk": [33, 2.8, 1.6, 1.6, 0.4, 118, 45],
  "flavoured-milk": [85, 3.1, 3.4, 11, 0, 150, 65],

  // fats
  "palm-oil": [884, 0, 100, 0, 0, 0, 0],
  "vegetable-oil": [884, 0, 100, 0, 0, 0, 0],
  "olive-oil": [884, 0, 100, 0, 0, 1, 2],
  "coconut-oil": [862, 0, 100, 0, 0, 0, 0],
  butter: [717, 0.9, 81, 0.1, 0, 24, 400],
  mayonnaise: [680, 1, 75, 3, 0, 30, 600],

  // sugar
  "table-sugar": [387, 0, 0, 100, 0, 2, 1],
  honey: [304, 0.3, 0, 82, 0.2, 52, 4],
  "glucose-lucozade": [280, 0, 0, 70, 0, 3, 30],
  "chocolate-spread": [540, 6, 31, 58, 3.5, 350, 40],
  jam: [250, 0.4, 0.1, 65, 0.7, 40, 15],

  // condiments
  salt: [0, 0, 0, 0, 0, 2, 38758],
  "seasoning-cube": [250, 6, 9, 35, 1, 400, 15000],
  ginger: [80, 1.8, 0.8, 18, 2, 415, 13],
  garlic: [149, 6.4, 0.5, 33, 2.1, 401, 17],
  "locust-bean": [280, 30, 15, 20, 10, 500, 900],
  ketchup: [112, 1.2, 0.2, 26, 0.4, 330, 900],
  sweetener: [0, 0, 0, 0, 0, 0, 0],
  "curry-powder": [325, 14, 14, 56, 35, 1500, 50],
  thyme: [101, 5.6, 1.7, 24, 14, 814, 9],
  mustard: [66, 4.4, 3.3, 5, 3.3, 138, 1135],

  // pasta
  indomie: [436, 9, 17, 60, 2, 250, 1700],
  spaghetti: [131, 5, 1.1, 25, 1.8, 45, 1],
  macaroni: [131, 5, 1.1, 25, 1.8, 45, 1],
};

// Alcoholic drinks get most of their energy from alcohol (~7 kcal/g), not
// captured by the protein/fat/carb fields at all — Atwater is meaningless
// for them, so they're exempted rather than forced to carry a fake macro.
const ATWATER_EXEMPT = new Set(["palm-wine", "beer", "local-gin", "pito"]);

function atwaterOk(id, [kcal, protein, fat, carb, fiber]) {
  if (ATWATER_EXEMPT.has(id)) return true;
  if (kcal < 5) return true; // near-zero-calorie foods (water, sweetener) trivially pass
  // Real published kcal figures are inconsistent about whether fibre's
  // largely non-digestible calories were subtracted from carb before the
  // 4 kcal/g multiply — some sources do (favouring high-fibre veg/legumes),
  // some don't. Accept either convention rather than forcing one: a value is
  // only flagged if it disagrees with BOTH readings.
  const grossRecomputed = protein * 4 + fat * 9 + carb * 4;
  const netCarb = Math.max(0, carb - fiber);
  const netRecomputed = protein * 4 + fat * 9 + netCarb * 4;
  const grossOk = Math.abs(grossRecomputed - kcal) / kcal <= 0.25;
  const netOk = Math.abs(netRecomputed - kcal) / kcal <= 0.25;
  return grossOk || netOk;
}

function plausibleOk(category, kcal) {
  const band = PLAUSIBILITY_BANDS[category];
  if (!band) return true; // no band defined for this category, don't block on it
  return kcal >= band[0] && kcal <= band[1];
}

const foodsById = new Map(foods.map((f) => [f.id, f]));
let validationErrors = 0;
for (const [id, per100] of Object.entries(PER_100G)) {
  if (!atwaterOk(id, per100)) {
    const [kcal, protein, fat, carb, fiber] = per100;
    const recomputed = protein * 4 + fat * 9 + Math.max(0, carb - fiber) * 4;
    console.error(`ATWATER MISMATCH ${id}: kcal=${kcal} but protein*4+fat*9+netCarb*4=${recomputed.toFixed(1)}`);
    validationErrors++;
  }
  const f = foodsById.get(id);
  if (f && !plausibleOk(f.category, per100[0])) {
    console.error(`IMPLAUSIBLE ${id} (${f.category}): ${per100[0]} kcal/100g outside expected band`);
    validationErrors++;
  }
}
if (validationErrors > 0) {
  console.error(`${validationErrors} validation error(s) in PER_100G. Fix before running.`);
  process.exit(1);
}

function parseServingGrams(food) {
  if (food.id in DEFAULT_SERVING_G) return DEFAULT_SERVING_G[food.id];
  const matches = [...food.portionGuidance.matchAll(/\(?(?:about\s+)?(\d+(?:\.\d+)?)\s*(g|ml)\)?/gi)];
  if (matches.length > 0) {
    return parseFloat(matches[matches.length - 1][1]);
  }
  return null;
}

function round(n, dp = 0) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

const missing = [];
for (const food of foods) {
  const per100 = PER_100G[food.id];
  if (!per100) {
    missing.push(food.id);
    continue;
  }
  const grams = parseServingGrams(food);
  if (grams == null) {
    console.error(`no serving size found for ${food.id}: "${food.portionGuidance}"`);
    process.exit(1);
  }
  const scale = grams / 100;
  const [kcal, protein, fat, carb, fiber, potassium, sodium] = per100;
  food.calories = round(kcal * scale);
  food.proteinG = round(protein * scale, 1);
  food.fatG = round(fat * scale, 1);
  food.carbG = round(carb * scale, 1);
  food.fiberG = round(fiber * scale, 1);
  food.potassiumMg = round(potassium * scale);
  food.sodiumMg = round(sodium * scale);
  food.nutritionSource = TABLE_GROUNDED.has(food.id) ? "table" : "estimated";
}

if (missing.length > 0) {
  console.error(`missing nutrition data for ${missing.length} foods:`, missing);
  process.exit(1);
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`wrote nutrition data for ${foods.length} foods`);
