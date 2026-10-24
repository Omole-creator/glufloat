// The standard recipe behind every soup card (co-founder dietitian's rule,
// 2026-10-24: "GluFloat needs a standardized recipe and serving definition.
// The system must account for ingredients, cooking yield and the distribution
// of ingredients in the finished dish.").
//
// Founder's decisions, 2026-10-24:
//   - A soup card counts the SOUP ONLY: oil, seeds, thickener, vegetables,
//     crayfish, the small bits of stockfish used for taste, iru/ogiri,
//     seasoning and salt. The meat and fish pieces are left out, because the
//     plate counts its own fish or meat once. No exceptions: native soup and
//     pepper soup too (their plates add the fish or meat).
//   - No approval step: these numbers go straight onto the cards.
//
// Each recipe is ONE home pot: ingredients in grams as they go into the pot,
// and the yield in ml of finished soup (1ml taken as 1g). The numbers per
// 100ml are worked out from the ingredient table below, so changing a recipe
// changes the card. Side-effect free: food-composition.mjs imports
// SOUP_PER_100G and is still the only writer of the nutrition fields.
//
// Ingredient values are per 100g as used in the pot (USDA FoodData Central,
// FAO/INFOODS WAFCT 2019, and the Nigerian composition sources already named
// in food-composition.mjs). Internal only: no card ever cites a source.

// [kcal, protein_g, fat_g, carb_g, fiber_g, potassium_mg, sodium_mg] per 100g
export const INGREDIENTS = {
  "palm-oil": [884, 0, 100, 0, 0, 0, 0],
  "groundnut-oil": [884, 0, 100, 0, 0, 0, 0],
  "egusi-seed": [557, 28.3, 47.4, 15.3, 3, 648, 5], // ground melon seed
  "ogbono-seed": [697, 8.5, 69, 13, 14, 500, 10], // ground Irvingia seed
  "groundnut-paste": [588, 25, 50, 20, 6, 650, 17], // unsalted
  "palm-fruit-cream": [340, 1.5, 35, 5, 2, 150, 10], // banga extract, as it goes in
  crayfish: [300, 62, 3.5, 2, 0, 900, 3000], // dried, ground
  stockfish: [290, 63, 2.4, 0, 0, 1450, 150], // unsalted, air-dried, bits for taste
  "iru-ogiri": [220, 18, 15, 6, 4, 600, 1500], // fermented locust bean / ogiri
  "seasoning-cube": [230, 12, 14, 15, 0, 400, 24000],
  salt: [0, 0, 0, 0, 0, 8, 38758],
  "pepper-onion": [40, 1.5, 0.3, 9, 1.6, 230, 5], // fresh pepper and onion
  tomato: [18, 0.9, 0.2, 3.9, 1.2, 237, 5],
  spinach: [23, 2.9, 0.4, 3.6, 2.2, 558, 79], // efo tete / shoko
  ugu: [30, 4, 0.6, 5, 3, 300, 10], // fluted pumpkin leaf
  waterleaf: [25, 2, 0.3, 4, 2, 450, 40],
  "afang-leaf": [60, 4, 1, 10, 5, 350, 15], // also okazi
  "bitter-leaf": [40, 4, 1, 6, 3, 300, 20], // washed; also editan, utazi
  "oha-leaf": [45, 4, 1, 6, 3, 350, 20], // also ora, atama
  okra: [33, 1.9, 0.2, 7.5, 3.2, 299, 7],
  pumpkin: [26, 1, 0.1, 6.5, 0.5, 340, 1],
  "baobab-leaf-powder": [280, 12, 3, 55, 30, 1600, 20],
  "sorrel-leaf": [50, 2, 0.5, 10, 4, 400, 10],
  "scent-leaf": [25, 3, 0.6, 3, 1.6, 300, 4],
  cocoyam: [112, 1.5, 0.2, 26, 3.5, 530, 9], // thickener
  yam: [118, 1.5, 0.2, 28, 2.5, 450, 6], // thickener
  "cassava-starch": [357, 0.3, 0.1, 88, 1, 10, 5], // owho thickener
};

// The base every pot shares: crayfish, pepper and onion, 10g of seasoning cube
// and 6g of salt for a 2-litre pot. Cooks salt to taste, so a pot that cooks
// down smaller gets proportionally less salt, seasoning and crayfish (scaled
// in per100 below by yieldMl / 2000), never the full pot's worth.
const BASE = { crayfish: 30, "pepper-onion": 100, "seasoning-cube": 10, salt: 6 };
const NORTH_BASE = { crayfish: 20, "seasoning-cube": 10, salt: 6 };
const SCALED_WITH_POT = new Set(["crayfish", "seasoning-cube", "salt"]);

/** soup id -> { yieldMl, pot: { ingredient: grams } } */
export const SOUP_RECIPES = {
  "egusi-soup": { yieldMl: 2000, pot: { ...BASE, "egusi-seed": 250, "palm-oil": 120, ugu: 300, stockfish: 20, "iru-ogiri": 15, "pepper-onion": 150 } },
  "ogbono-soup": { yieldMl: 2000, pot: { ...BASE, "ogbono-seed": 100, "palm-oil": 100, ugu: 150, stockfish: 20 } },
  "efo-riro": { yieldMl: 1200, pot: { ...BASE, spinach: 600, "palm-oil": 120, tomato: 300, "pepper-onion": 200, "iru-ogiri": 20 } },
  "edikang-ikong": { yieldMl: 1500, pot: { ...BASE, ugu: 500, waterleaf: 500, "palm-oil": 150, stockfish: 20 } },
  "afang-soup": { yieldMl: 1500, pot: { ...BASE, "afang-leaf": 300, waterleaf: 600, "palm-oil": 150, stockfish: 20 } },
  "oha-soup": { yieldMl: 2000, pot: { ...BASE, "oha-leaf": 200, cocoyam: 200, "palm-oil": 120, stockfish: 20, "iru-ogiri": 15 } },
  "bitterleaf-soup": { yieldMl: 2000, pot: { ...BASE, "bitter-leaf": 200, cocoyam: 200, "palm-oil": 120, stockfish: 20, "iru-ogiri": 15 } },
  "okra-soup": { yieldMl: 2000, pot: { ...BASE, okra: 500, ugu: 150, "palm-oil": 80, stockfish: 20, "iru-ogiri": 10 } },
  "vegetable-soup": { yieldMl: 1500, pot: { ...BASE, ugu: 400, waterleaf: 400, "palm-oil": 120, stockfish: 20 } },
  "banga-soup": { yieldMl: 2000, pot: { ...BASE, "palm-fruit-cream": 800, "scent-leaf": 30, stockfish: 20 } },
  "groundnut-soup": { yieldMl: 2000, pot: { ...BASE, "groundnut-paste": 250, "palm-oil": 60, tomato: 300, "pepper-onion": 150, spinach: 200 } },
  "white-soup": { yieldMl: 2000, pot: { ...BASE, yam: 250, "bitter-leaf": 30, crayfish: 40, stockfish: 20, "iru-ogiri": 15 } },
  "pepper-soup": { yieldMl: 2000, pot: { ...BASE, crayfish: 20, "scent-leaf": 30 } },
  "miyan-kuka": { yieldMl: 2000, pot: { ...NORTH_BASE, "baobab-leaf-powder": 60, "groundnut-oil": 50, "iru-ogiri": 30, "pepper-onion": 100 } },
  "miyan-taushe": { yieldMl: 2000, pot: { ...NORTH_BASE, pumpkin: 600, "groundnut-paste": 150, spinach: 200, "groundnut-oil": 60, tomato: 150, "pepper-onion": 100, "iru-ogiri": 20 } },
  "ora-soup": { yieldMl: 2000, pot: { ...BASE, "oha-leaf": 200, cocoyam: 200, "palm-oil": 120, stockfish: 20, "iru-ogiri": 15 } },
  "owho-soup": { yieldMl: 2000, pot: { ...BASE, "palm-oil": 120, "cassava-starch": 60, stockfish: 20 } },
  "native-soup": { yieldMl: 2000, pot: { ...BASE, "palm-oil": 80, cocoyam: 150, "scent-leaf": 50 } },
  "ofe-owerri": { yieldMl: 2000, pot: { ...BASE, "afang-leaf": 100, ugu: 300, cocoyam: 200, "palm-oil": 150, stockfish: 20, "iru-ogiri": 15 } },
  "okazi-soup": { yieldMl: 2000, pot: { ...BASE, "afang-leaf": 200, waterleaf: 300, cocoyam: 150, "palm-oil": 120, stockfish: 20 } },
  "editan-soup": { yieldMl: 1500, pot: { ...BASE, "bitter-leaf": 400, waterleaf: 300, "palm-oil": 150, stockfish: 20 } },
  "atama-soup": { yieldMl: 2000, pot: { ...BASE, "palm-fruit-cream": 800, "oha-leaf": 100, stockfish: 20 } },
  "miyan-kubewa": { yieldMl: 2000, pot: { ...NORTH_BASE, okra: 300, "groundnut-oil": 50, "iru-ogiri": 30, tomato: 100, "pepper-onion": 100 } },
  "miyan-yakuwa": { yieldMl: 2000, pot: { ...NORTH_BASE, "sorrel-leaf": 400, "groundnut-oil": 60, "groundnut-paste": 50, "iru-ogiri": 30, tomato: 100, "pepper-onion": 100 } },
};

function per100(id, { yieldMl, pot }) {
  const total = [0, 0, 0, 0, 0, 0, 0];
  for (const [ing, grams] of Object.entries(pot)) {
    const row = INGREDIENTS[ing];
    if (!row) throw new Error(`${id}: unknown ingredient ${ing}`);
    const g = SCALED_WITH_POT.has(ing) ? (grams * yieldMl) / 2000 : grams;
    row.forEach((v, i) => (total[i] += (v * g) / 100));
  }
  return total.map((v, i) => {
    const x = (v * 100) / yieldMl;
    return i >= 5 ? Math.round(x) : Math.round(x * 10) / 10;
  });
}

/** soup id -> [kcal, protein, fat, carb, fiber, potassium, sodium] per 100ml. */
export const SOUP_PER_100G = Object.fromEntries(
  Object.entries(SOUP_RECIPES).map(([id, r]) => [id, per100(id, r)]),
);
