// Shared, side-effect-free config for the nutrition pipeline, used by both
// food-composition.mjs (the writer) and food-composition-audit.mjs (the
// standalone, re-runnable checker) — kept in one place so the two can never
// silently disagree about what "plausible" or "the serving weight" means.
export const PLAUSIBILITY_BANDS = {
  swallow: [70, 180],
  rice: [90, 260],
  tuber: [60, 260],
  plantain: [70, 300],
  snack: [60, 600],
  legume: [70, 400],
  bread: [200, 340],
  cereal: [30, 420],
  corn: [60, 130],
  soup: [30, 260],
  protein: [60, 450],
  vegetable: [10, 250],
  fruit: [15, 320],
  nut: [280, 700],
  drink: [0, 420],
  dairy: [30, 350],
  fat: [650, 900],
  sugar: [0, 560],
  condiment: [0, 400],
  fastfood: [200, 340],
  pasta: [100, 450],
};

// Foods whose portionGuidance carries no explicit gram/ml anchor (e.g. "use
// as much as you like", "one medium onion used in cooking") get a reasonable
// culinary serving weight here instead. Without this shared copy, the
// standalone audit's own regex-only serving-weight parse returns null for
// every one of these foods and silently skips its plausibility-band check on
// all of them — this table is what lets the audit actually cover them too.
export const DEFAULT_SERVING_G = {
  onion: 50,
  "pepper-chili": 15,
  ginger: 10,
  garlic: 8,
  tangerine: 90,
  banana: 60,
  boli: 90,
  water: 250,
  "tea-coffee": 250,
  "bell-pepper": 80,
  tomato: 90,
  cucumber: 150,
  cabbage: 100,
  "green-beans": 80,
  ugu: 60,
  waterleaf: 60,
  spinach: 60,
  "garden-egg": 90,
  "okra-veg": 90,
  "scent-leaf": 15,
  utazi: 20,
  lettuce: 80,
  "bitterleaf-veg": 40,
  soko: 60,
  broccoli: 90,
  cauliflower: 90,
  "green-peas": 80,
  mushroom: 90,
  kale: 65,
  zucchini: 100,
  "spring-onion": 20,
  celery: 40,
  parsley: 20,
  "nigerian-salad": 150,
  "bean-sprouts": 100,
  ube: 60,
  dates: 20,
  "cashew-fruit": 90,
  "velvet-tamarind": 40,
  tamarind: 30,
  "bitter-kola": 10,
  "kola-nut": 15,
  "monkey-kola": 40,
  "passion-fruit": 60,
  "coconut-water": 200,
  chapman: 250,
  lacasera: 350,
  beer: 350,
  pito: 200,
  "local-gin": 30,
  smoothie: 200,
  "yoghurt-drink": 100,
  "sugarcane-juice": 200,
  "soaked-garri": 200,
  "milo-bournvita": 20,
  "fura-da-nono": 200,
  "palm-wine": 100,
  ketchup: 15,
  mustard: 10,
  "curry-powder": 2,
  thyme: 2,
  "locust-bean": 10,
  "seasoning-cube": 8,
  salt: 5,

  "meat-pie": 60,
  "sausage-roll": 50,
  doughnut: 30,
  biscuits: 20,
  cake: 40,
  "ice-cream": 60,
  "boiled-corn": 80,
  "roasted-corn": 80,
  "egusi-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "ogbono-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "efo-riro": 250,
  "edikang-ikong": 250,
  "afang-soup": 250,
  "oha-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "bitterleaf-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "okra-soup": 250,
  "vegetable-soup": 250,
  "banga-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  ewedu: 250,
  gbegiri: 125, // one big spoon is 125ml (founder, 2026-10-08)
  "groundnut-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "white-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "pepper-soup": 500, // four big spoons, the "good start" (founder, 2026-10-08)
  "miyan-kuka": 125, // one big spoon is 125ml (founder, 2026-10-08)
  eggs: 100,
  ugba: 65,
  orange: 130,
  agbalumo: 40,
  "soft-drink": 350,
  "fruit-juice": 200,
  "malt-drink": 330,
  "energy-drink": 250,
  "zobo-sweetened": 250,
  "condensed-milk": 20,
  "sweetened-yogurt": 150,
  "palm-oil": 4.5, // one teaspoon (co-founder dietitian: one number, 2026-10-08)
  "vegetable-oil": 4.5, // one teaspoon (co-founder dietitian: one number, 2026-10-08)
  "olive-oil": 4.5, // one teaspoon (co-founder dietitian: one number, 2026-10-08)
  butter: 5,
  mayonnaise: 5,
  "table-sugar": 5,
  honey: 5,
  "miyan-taushe": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "ora-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "owho-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "native-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  grapefruit: 120,
  "lime-lemon": 10,
  sugarcane: 30,
  "fried-egg": 100,
  "scrambled-egg": 110,
  // Both dishes are "two eggs" (~110g) PLUS the tomato/pepper/onion or
  // vegetables cooked into them, so the real serving weighs more than the
  // eggs alone — 100g under-weighed the dish.
  "egg-sauce": 150,
  omelette: 130,
  "egg-roll": 70,
  "scotch-egg": 120,
  "beans-and-plantain": 180,
  "ofe-owerri": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "okazi-soup": 250,
  "editan-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "atama-soup": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "ofe-akwu": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "miyan-kubewa": 250,
  sardine: 60,
  "corned-beef": 50,
  "evaporated-milk": 15,
  weetabix: 40,
  shawarma: 110,
  samosa: 50,
  "spring-roll": 50,
  "fish-roll": 70,
  "small-chops": 60,
  "coconut-candy": 15,
  "coconut-oil": 4.5, // one teaspoon (co-founder dietitian: one number, 2026-10-08)
  sweetener: 1,
  burger: 120,
  "hot-dog": 100,
  "french-fries": 50,
  // "That is about half a cup of the cooked noodles" — same phrase and same
  // weight as spaghetti/macaroni's own "half a cup of cooked pasta (130g)",
  // for consistency across the data (a gram anchor belongs to the measure,
  // not to which noodle it is).
  indomie: 130,
  waffles: 60,
  "tomato-stew": 125, // one big spoon is 125ml (founder, 2026-10-08)
  ayamase: 125, // one big spoon is 125ml (founder, 2026-10-08)
  "garden-egg-sauce": 125, // one big spoon is 125ml (founder, 2026-10-08)
  "pepper-sauce": 60,
  // "One bowl (about one cup)" of a mayo-bound salad is denser than a fresh
  // vegetable cup — 150g under-weighed it against the other "one cup" salads.
  "tuna-salad": 220,
  "chocolate-bar": 15,
  "baba-dudu": 15,
  "chocolate-spread": 10,
  jam: 10,
  "flavoured-milk": 200,
  alkaki: 15,
  "canned-fruit": 80,
  // Added 2026-10-10: same serving as the leaves and spice they sit beside.
  "efo-igbo": 60,
  moringa: 60,
  "local-spices": 2,
};
