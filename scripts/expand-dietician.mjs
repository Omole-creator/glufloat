// Dietitian feedback (Maureen, RDN) + deeper Nigerian food research.
//   1. Fix verdicts that were too lenient: carrot and pumpkin flesh are sweet/
//      starchy and can spike in large amounts or as juice, so they move to
//      yellow (eat with care), with concrete portions and a juice warning.
//   2. Add commonly-eaten Nigerian foods that were missing: fast food, pasta,
//      more fruits and vegetables, and a few plant proteins/drinks.
// Every field is specific. Frequency is an exact count ("About N times a week"
// or "Every day"), never a vague "most days". Safe id-keyed pattern.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(foods.map((f) => [f.id, f]));

// 1. Verdict fixes ----------------------------------------------------------
const fixes = {
  carrot: {
    gi: "medium",
    baseVerdict: "yellow",
    portionGuidance: "Two small or medium carrots (about 100g).",
    pairingAdvice: "Raw as a snack, or in salads and stews with protein. Do not drink it as juice.",
    frequency: "About 3 times a week.",
    logicNote: "Carrot has natural sugar. A normal portion is fine, but large amounts, or carrot juice with the fibre removed, can raise your sugar.",
  },
  pumpkin: {
    gi: "medium",
    baseVerdict: "yellow",
    portionGuidance: "Half a cup, cooked (about 100g).",
    pairingAdvice: "Add to soups and porridge with protein and green vegetables.",
    frequency: "About 3 times a week.",
    logicNote: "Cooked pumpkin flesh is soft and starchy, so it can raise sugar in large amounts. A small portion is fine.",
  },
};
for (const [id, patch] of Object.entries(fixes)) {
  const f = byId.get(id);
  if (!f) {
    console.error("no food with id", id);
    process.exit(1);
  }
  Object.assign(f, patch);
}

// 2. New foods --------------------------------------------------------------
const add = [
  // --- fast food ---
  { id: "pizza", name: "Pizza", aliases: ["pizza"], category: "fastfood", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only one thin slice (about 100g).", pairingAdvice: "Ask for extra vegetable toppings and lean meat, and skip the sugary drink.", frequency: "Rarely; a treat.", logicNote: "Refined flour crust, cheese, and often sugary sauce raise sugar fast. Thin crust with vegetable toppings is the better choice.", tags: ["fastfood"] },
  { id: "burger", name: "Burger (beef)", aliases: ["burger", "hamburger", "cheeseburger"], category: "fastfood", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only one small burger.", pairingAdvice: "Add a side salad, and skip the chips and soft drink.", frequency: "Rarely; a treat.", logicNote: "The white bun is a fast starch and the sauces add hidden sugar. The beef and vegetables are the friendly parts.", tags: ["fastfood"] },
  { id: "hot-dog", name: "Hot Dog", aliases: ["hot dog", "hotdog"], category: "fastfood", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only one, with extra vegetables.", pairingAdvice: "Add onions, pepper, and a side salad, and skip the soft drink.", frequency: "Rarely; a treat.", logicNote: "The white bun spikes fast and the sausage is processed and salty. The vegetables are the friendly part.", tags: ["fastfood", "processed"] },
  { id: "club-sandwich", name: "Sandwich (club)", aliases: ["sandwich", "club sandwich", "bread sandwich"], category: "fastfood", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow", portionGuidance: "One round, about two thin slices of bread (60g), never on its own.", pairingAdvice: "Fill it with egg, chicken, tuna, and plenty of vegetables, not jam or sweet spreads.", frequency: "About 2 times a week.", logicNote: "White bread spikes fast, so the filling matters. Choose protein and vegetables and skip sweet spreads.", tags: [] },
  { id: "french-fries", name: "French Fries (chips)", aliases: ["french fries", "chips", "fries", "potato chips"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only a small handful, about 10 chips.", pairingAdvice: "If eaten, add a side salad and grilled chicken or fish.", frequency: "Rarely; a treat.", logicNote: "Deep-fried refined potato raises sugar fast and adds a lot of oil. Boiled or roasted potato is better.", tags: ["fried"] },
  { id: "potato-crisps", name: "Potato Crisps (packaged)", aliases: ["crisps", "pringles", "potato crisps"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only a small handful (about 25g).", pairingAdvice: "Better to snack on about 10 nuts, or on cucumber.", frequency: "Rarely; a treat.", logicNote: "Thin fried potato with salt; a fast spike and a lot of oil in a small pack.", tags: ["fried", "processed"] },
  // --- pasta ---
  { id: "indomie", name: "Indomie / Instant Noodles", aliases: ["indomie", "noodles", "instant noodles"], category: "pasta", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only half a pack, about half a cup cooked.", pairingAdvice: "Add an egg and vegetables like carrot and green beans to slow it down.", frequency: "Rarely; a treat.", logicNote: "Refined wheat noodles cook soft and raise sugar fast, and the seasoning is salty. Add protein and vegetables.", tags: ["processed"] },
  { id: "spaghetti", name: "Spaghetti / Pasta", aliases: ["spaghetti", "pasta"], category: "pasta", role: "starch", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Half a cup, cooked (about 130g).", pairingAdvice: "Add a tomato and vegetable sauce with fish, chicken, or meat.", frequency: "About 2 times a week.", logicNote: "White pasta is gentler than white rice but still a starch. Keep the portion small and pair with protein and vegetables.", tags: [] },
  { id: "macaroni", name: "Macaroni", aliases: ["macaroni", "elbow pasta"], category: "pasta", role: "starch", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Half a cup, cooked (about 130g).", pairingAdvice: "Add a vegetable sauce with fish, chicken, or meat.", frequency: "About 2 times a week.", logicNote: "Refined wheat, like other pasta. Keep it small and pair with protein and vegetables.", tags: [] },
  { id: "couscous", name: "Couscous", aliases: ["couscous"], category: "rice", role: "starch", carbLoad: "medium", gi: "high", baseVerdict: "yellow", portionGuidance: "Half a cup, cooked (about 120g).", pairingAdvice: "Add plenty of vegetables and fish, chicken, or meat.", frequency: "About 2 times a week.", logicNote: "Made from refined wheat, so it behaves like white rice. Keep it small and load the vegetables.", tags: [] },
  // --- other starches ---
  { id: "tapioca", name: "Tapioca (cassava)", aliases: ["tapioca", "sagu"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow", portionGuidance: "One small cup, made up (about 200ml), no sugar.", pairingAdvice: "Add unsweetened milk and about 10 nuts. No sugar.", frequency: "About 2 times a week.", logicNote: "Cassava starch pearls raise sugar fast. Take it small and never with added sugar.", tags: [] },
  { id: "pancakes", name: "Pancakes", aliases: ["pancake", "pancakes"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow", portionGuidance: "Two small pancakes (about 90g), no syrup.", pairingAdvice: "Have with an egg, and use no syrup or sugar.", frequency: "About 2 times a week.", logicNote: "Flour and sugar cook into a fast starch. Skip the syrup and add an egg for balance.", tags: [] },
  { id: "waffles", name: "Waffles", aliases: ["waffle", "waffles"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only one small waffle, no syrup.", pairingAdvice: "Have with an egg and no syrup.", frequency: "Rarely; a treat.", logicNote: "Refined flour and sugar; a fast spike, more so with syrup on top.", tags: [] },
  // --- vegetables ---
  { id: "beetroot", name: "Beetroot", aliases: ["beetroot", "beet", "beets"], category: "vegetable", role: "vegetable", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Two to three slices (about 80g).", pairingAdvice: "Add to a salad with cucumber and protein. Do not drink it as juice.", frequency: "About 3 times a week.", logicNote: "Beetroot has more natural sugar than green vegetables, so keep the portion small. Juicing it removes the fibre and raises sugar faster.", tags: [] },
  { id: "green-peas", name: "Green Peas", aliases: ["green peas", "garden peas"], category: "vegetable", role: "vegetable", carbLoad: "medium", gi: "low", baseVerdict: "green", portionGuidance: "Half a cup (about 80g).", pairingAdvice: "Mix into rice, stews, or a vegetable sauce with protein.", frequency: "About 4 times a week.", logicNote: "Peas have fibre and protein that slow the sugar, so a normal portion is friendly.", tags: [] },
  { id: "mushroom", name: "Mushroom", aliases: ["mushroom", "mushrooms"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One cup, cooked (about 100g).", pairingAdvice: "Add to stews, sauces, and stir-fries with protein.", frequency: "Every day.", logicNote: "Very low in carbs and calories; a friendly way to add bulk and taste.", tags: [] },
  { id: "kale", name: "Kale", aliases: ["kale"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One to two cups, cooked or raw.", pairingAdvice: "Use in soups, stir-fries, and salads with protein.", frequency: "Every day.", logicNote: "A leafy green that is high in fibre and very low in sugar.", tags: [] },
  { id: "zucchini", name: "Zucchini (courgette)", aliases: ["zucchini", "courgette"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One cup, cooked (about 120g).", pairingAdvice: "Add to stir-fries, sauces, and soups with protein.", frequency: "Every day.", logicNote: "Mostly water and fibre; a friendly low-sugar vegetable.", tags: [] },
  { id: "coleslaw", name: "Coleslaw / Vegetable Salad", aliases: ["coleslaw", "salad", "vegetable salad", "garden salad"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One cup (about 100g), with little salad cream.", pairingAdvice: "Add a boiled egg, chicken, or fish. Go easy on the salad cream.", frequency: "About 4 times a week.", logicNote: "Cabbage and carrot are friendly. The salad cream and any sweet corn add the sugar and fat, so go light on those.", tags: [] },
  { id: "sweet-corn", name: "Sweet Corn (tinned)", aliases: ["sweet corn", "sweetcorn", "tinned corn"], category: "corn", role: "starch", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Half a cup (about 80g).", pairingAdvice: "Mix a little into a vegetable salad or sauce with protein.", frequency: "About 2 times a week.", logicNote: "Sweet corn has more sugar than fresh corn on the cob. Keep the portion small.", tags: [] },
  // --- fruits (carbExchange = one 15g-carb serving) ---
  { id: "pomelo", name: "Pomelo (Shaddock)", aliases: ["pomelo", "shaddock", "oroma"], category: "fruit", role: "fruit", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Three-quarters of a cup of segments (about 120g).", pairingAdvice: "About 10 nuts to slow the sugar.", frequency: "About 4 times a week.", logicNote: "A large citrus, low in sugar and high in fibre and vitamin C.", tags: [], carbExchange: "three-quarters of a cup of segments" },
  { id: "sweetsop", name: "Sweetsop (Custard Apple)", aliases: ["sweetsop", "custard apple", "sugar apple"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "high", baseVerdict: "yellow", portionGuidance: "Half of one small fruit (about 80g).", pairingAdvice: "About 10 nuts to slow the sugar.", frequency: "About 2 times a week.", logicNote: "Very sweet and creamy, with a fast sugar rise. A small portion only.", tags: [], carbExchange: "half of one small fruit" },
  { id: "hog-plum", name: "Hog Plum (June Plum)", aliases: ["hog plum", "june plum", "iyeye", "ambarella"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "One small fruit (about 80g).", pairingAdvice: "About 10 nuts to slow the sugar.", frequency: "About 2 times a week.", logicNote: "Tart-sweet fruit with fibre; keep to a small portion.", tags: [], carbExchange: "one small fruit" },
  { id: "baobab-fruit", name: "Baobab Fruit (Kuka)", aliases: ["baobab", "kuka fruit", "monkey bread fruit"], category: "fruit", role: "fruit", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Two tablespoons of the pulp (about 20g).", pairingAdvice: "Stir into water or plain yogurt, with no added sugar.", frequency: "About 4 times a week.", logicNote: "The dry pulp is very high in fibre and vitamin C, with a low sugar rise. Do not add sugar.", tags: [], carbExchange: "two tablespoons of the pulp" },
  { id: "star-fruit", name: "Star Fruit (Carambola)", aliases: ["star fruit", "carambola"], category: "fruit", role: "fruit", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One medium star fruit (about 90g).", pairingAdvice: "About 10 nuts.", frequency: "About 4 times a week.", logicNote: "Low in sugar and high in water and fibre; a friendly fruit in normal amounts.", tags: [], carbExchange: "one medium star fruit" },
  { id: "fig", name: "Fig (fresh)", aliases: ["fig", "figs", "fresh fig"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Two small figs. That is about half a cup (80g).", pairingAdvice: "About 10 nuts to slow the sugar.", frequency: "About 2 times a week.", logicNote: "Fresh figs are sweet, so keep to a small portion. Dried figs are far more concentrated; avoid those.", tags: [], carbExchange: "two small figs" },
  { id: "kiwi", name: "Kiwi", aliases: ["kiwi", "kiwifruit"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "One whole kiwi (about 75g).", pairingAdvice: "About 10 nuts, or a small cup of plain yogurt (150g).", frequency: "About 2 times a week.", logicNote: "Sweet but full of fibre and vitamin C; a small one is fine.", tags: [], carbExchange: "one whole kiwi" },
  { id: "mulberry", name: "Mulberry", aliases: ["mulberry", "mulberries"], category: "fruit", role: "fruit", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "About fifteen mulberries (80g).", pairingAdvice: "About 10 nuts, or plain yogurt.", frequency: "About 4 times a week.", logicNote: "Small berries with fibre and a gentle sugar rise.", tags: [], carbExchange: "about fifteen mulberries" },
  // --- plant proteins / dairy / drinks ---
  { id: "tofu", name: "Tofu (soy / awara)", aliases: ["tofu", "awara", "beske", "soy cheese"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One palm-size piece (about 90g).", pairingAdvice: "Grill it, or add to stews, sauces, and stir-fries with vegetables.", frequency: "Every day.", logicNote: "Made from soybeans; low in carbs, high in protein, and friendly for blood sugar.", tags: ["plant"] },
  { id: "bacon", name: "Bacon", aliases: ["bacon"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "yellow", portionGuidance: "Two rashers (about 50g).", pairingAdvice: "Have with eggs and vegetables, not bread.", frequency: "About 2 times a week.", logicNote: "Low in carbs but processed, salty, and high in fat. Keep it occasional.", tags: ["processed"] },
  { id: "soy-milk", name: "Soy Milk (unsweetened)", aliases: ["soy milk", "soya milk", "soymilk"], category: "dairy", role: "dairy", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One cup (about 250ml), unsweetened.", pairingAdvice: "Drink it plain, or use in tea, oats, or pap with no sugar.", frequency: "Every day.", logicNote: "Plant milk with protein and little sugar when unsweetened. Check the label and avoid the sweetened kind.", tags: ["plant"] },
  { id: "yoghurt-drink", name: "Yoghurt Drink (sweetened)", aliases: ["yoghurt drink", "hollandia yoghurt", "drinking yoghurt"], category: "dairy", role: "drink", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only half a small bottle (about 125ml).", pairingAdvice: "Better to eat plain unsweetened yogurt with about 10 nuts.", frequency: "Rarely; a treat.", logicNote: "Drinking yoghurts carry a lot of added sugar in liquid form, which spikes fast. Plain unsweetened yogurt is the safe choice.", tags: ["processed"] },
  { id: "sugarcane-juice", name: "Sugarcane Juice", aliases: ["sugarcane juice", "cane juice"], category: "drink", role: "drink", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "None. Chew a small piece of the cane instead.", pairingAdvice: "Nothing makes sweet cane juice safe. Drink water or unsweetened zobo.", frequency: "Never.", logicNote: "Pressed cane juice is almost pure liquid sugar with no fibre. It spikes very fast.", tags: ["avoid"] },
];

const ids = new Set(foods.map((f) => f.id));
for (const f of add) {
  if (ids.has(f.id)) {
    console.error("duplicate id", f.id);
    process.exit(1);
  }
  ids.add(f.id);
}

const out = [...foods, ...add];
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
console.log(`fixed ${Object.keys(fixes).length}, added ${add.length}. total: ${out.length}`);
