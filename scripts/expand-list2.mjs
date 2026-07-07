// Second submitted list. Two things:
//  1. Add a small set of genuinely-new, high-confidence foods.
//  2. GROUP the many variants onto existing foods as search aliases (they give
//     the same effect on blood sugar), so a search resolves without bloating
//     the bank with duplicate cards. Uncertain items are skipped (no guessing).
// Database only. Aliases are deduped against every existing name/alias.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

// 1. New, confident foods ----------------------------------------------------
const add = [
  { id: "tuwo-dawa", name: "Tuwo Dawa (sorghum swallow)", aliases: ["tuwo dawa", "sorghum swallow", "tuwo sorghum", "tuwo millet"], category: "swallow", role: "starch", carbLoad: "high", gi: "medium", baseVerdict: "yellow", portionGuidance: "One ball the size of your fist. That is about half a cup (100g).", pairingAdvice: "A green vegetable soup like miyan kuka or okra, plus fish or meat.", frequency: "About 3 times a week.", logicNote: "A sorghum swallow. Whole grain, but still a starch, so keep the ball small.", tags: ["local", "northern"] },
  { id: "chickpeas", name: "Chickpeas (boiled)", aliases: ["chickpeas", "chickpea", "boiled chickpeas", "chickpea salad", "chickpea stew", "fried chickpeas", "garbanzo"], category: "legume", role: "legume", carbLoad: "medium", gi: "low", baseVerdict: "green", portionGuidance: "Half a cup, cooked (about 130g).", pairingAdvice: "In stews and salads, with vegetables.", frequency: "About 4 times a week.", logicNote: "A legume with fibre and protein, so the sugar rises slowly.", tags: [] },
  { id: "lentils", name: "Lentils", aliases: ["lentils", "lentil", "lentil stew", "lentil porridge"], category: "legume", role: "legume", carbLoad: "medium", gi: "low", baseVerdict: "green", portionGuidance: "Half a cup, cooked (about 130g).", pairingAdvice: "In stews and soups, with vegetables.", frequency: "About 4 times a week.", logicNote: "A low-GI legume, high in fibre and protein; friendly for sugar.", tags: [] },
  { id: "sausage", name: "Sausage (processed)", aliases: ["sausage", "meat sausage", "chicken sausage", "fish sausage", "mini sausage"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "yellow", portionGuidance: "One to two sausages (about 90g).", pairingAdvice: "With eggs and vegetables, not bread.", frequency: "About 2 times a week.", logicNote: "Low in carbs but processed, salty, and high in fat. Keep it occasional.", tags: ["processed"] },
  { id: "alkaki", name: "Alkaki", aliases: ["alkaki", "alkaki sweet"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only one small piece.", pairingAdvice: "Better to snack on about 10 nuts.", frequency: "Rarely; a treat.", logicNote: "Fried wheat dough soaked in sugar syrup; it raises sugar fast.", tags: ["local", "northern"] },
  { id: "radish", name: "Radish", aliases: ["radish"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "A small handful, sliced (about 100g).", pairingAdvice: "In salads and stir-fries.", frequency: "You can eat this every day.", logicNote: "A crunchy root with almost no sugar.", tags: [] },
  { id: "turnip", name: "Turnip", aliases: ["turnip"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Half a cup, cooked (about 80g).", pairingAdvice: "In soups, stews, and stir-fries.", frequency: "About 4 times a week.", logicNote: "A low-sugar root vegetable with fibre.", tags: [] },
  { id: "bean-sprouts", name: "Bean Sprouts", aliases: ["bean sprouts", "sprouts", "beansprouts"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One cup (about 100g).", pairingAdvice: "In stir-fries and salads with protein.", frequency: "You can eat this every day.", logicNote: "Crunchy sprouts, very low in sugar.", tags: [] },
  { id: "seeds", name: "Seeds (pumpkin, sunflower, flax, chia)", aliases: ["pumpkin seed", "sunflower seed", "flax seed", "chia seed", "seed mix", "spiced seed mix", "seeds"], category: "nut", role: "fat", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One tablespoon (about 15g).", pairingAdvice: "Sprinkle on salads, yogurt, and oats.", frequency: "You can eat this every day.", logicNote: "Seeds give healthy fat, fibre, and a little protein, with almost no sugar.", tags: [] },
  { id: "dried-fruit", name: "Dried Fruit (mango, pineapple, banana)", aliases: ["dried fruit", "dried mango", "dried pineapple", "dried banana", "dried pawpaw", "dried fruit mix", "fruit leather", "fruit cubes"], category: "fruit", role: "fruit", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. If you do have it, only one tablespoon (about 15g).", pairingAdvice: "Better to eat the fresh fruit instead.", frequency: "Rarely; a treat.", logicNote: "Drying removes the water and packs the sugar tight, so a small handful spikes fast. Fresh fruit is better.", tags: [] },
  { id: "canned-fruit", name: "Canned Fruit (in syrup)", aliases: ["canned fruit", "canned pineapple", "canned mango", "canned mixed fruit"], category: "fruit", role: "fruit", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. Choose fresh fruit instead.", pairingAdvice: "Better to eat fresh fruit, or fruit canned in water, not syrup.", frequency: "Rarely; a treat.", logicNote: "Fruit canned in syrup sits in added sugar, which spikes fast. Fresh fruit is better.", tags: ["processed"] },
  { id: "potato-salad", name: "Potato Salad", aliases: ["potato salad"], category: "snack", role: "starch", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Half a cup (about 130g).", pairingAdvice: "Add a boiled egg and vegetables. Go easy on the mayonnaise.", frequency: "About 2 times a week.", logicNote: "Boiled potato with mayonnaise; the potato is a starch, so keep the portion small.", tags: [] },
  { id: "mustard", name: "Mustard", aliases: ["mustard", "bottled mustard"], category: "condiment", role: "condiment", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One to two teaspoons.", pairingAdvice: "With meat, eggs, and in dressings.", frequency: "You can eat this every day.", logicNote: "A tangy, low-sugar condiment. Check the label and skip honey mustard.", tags: [] },
];

// 2. Group variants as aliases onto existing foods ---------------------------
const aliasMap = {
  "jollof-rice": ["hausa jollof", "party jollof", "native jollof", "firewood jollof", "smoky jollof", "palm oil jollof", "ready jollof pouch"],
  "coconut-rice": ["coconut jollof"],
  "native-rice": ["concoction rice", "palm oil rice"],
  "fried-rice": ["fried brown rice", "chicken fried rice", "seafood fried rice", "beef fried rice", "egg fried rice", "curry rice"],
  "ofada-rice": ["ofada mixed rice"],
  "white-rice": ["cold rice salad"],
  "lafun": ["amala lafun"],
  "amala-yam": ["amala dudu"],
  "tuwo-shinkafa": ["rice swallow", "tuwo rice"],
  "amala-plantain": ["plantain swallow"],
  "tuwo-masara": ["corn swallow"],
  "fufu-akpu": ["cassava fufu", "akpu", "nni akpu"],
  "pounded-yam": ["nni ji"],
  "cocoyam": ["cocoyam mash", "nni ede"],
  "bitterleaf-soup": ["ofe onugbu"],
  "okra-soup": ["ofe okro", "ila alasepo", "ila asepo", "okra pepper soup"],
  "white-soup": ["afia efere", "afia efere fish", "afia efere goat", "ofe nsala fish", "ofe nsala chicken", "ofe nsala goat"],
  "native-soup": ["fisherman soup"],
  "pepper-sauce": ["pepper stew", "ofada ata", "ata sisun", "chili sauce", "pepper paste", "bottled pepper paste", "bottled chili sauce", "aganyin sauce"],
  "tomato-stew": ["meat stew base", "obe ata", "obe eja", "obe iru", "ready stew pouch"],
  "efo-riro": ["obe efo"],
  "spinach": ["efo tete", "amaranth leaf", "green amaranth", "wild spinach"],
  "waterleaf": ["efo gbure", "efo amunututu"],
  "soko": ["efo shoko"],
  "ewedu": ["jute leaf"],
  "ugu": ["pumpkin leaf"],
  "okra-veg": ["okro pod"],
  "ogbono-soup": ["efere ibaba", "ogbono mix", "ofe ogbono leaf", "ofe ogbono akwu"],
  "egusi-soup": ["efo elegusi", "egusi mix", "ofe egusi leaf", "ofe egusi akwu"],
  "afang-soup": ["efere afang", "afang fish", "afang meat", "pepper afang", "afang leaf mix"],
  "edikang-ikong": ["efere edikan", "efere ikong", "edikaikong fish", "edikaikong meat", "pepper edikaikong", "edikang ikong mix"],
  "atama-soup": ["abak soup", "efere atama", "atama fish", "atama meat"],
  "ekpang-nkukwo": ["efere ekpan", "ekpang leaf", "ekpang cocoyam rolls"],
  "okazi-soup": ["okazi soup mix", "pepper okazi"],
  "banga-soup": ["pepper banga"],
  "ofe-akwu": ["ofe akwu fish", "ofe akwu meat"],
  "stockfish": ["ofe okporoko"],
  "pepper-soup": ["ofe azu"],
  "vegetable-soup": ["spicy vegetable stew"],
  "yam-porridge": ["asaro elepo", "ofe ji", "ji mmiri oku mixed", "ji porridge spicy", "ji porridge mild", "ji mmiri porridge"],
  "boiled-yam": ["yam mash"],
  "fried-yam": ["yam balls", "yam fingers", "yam crisps", "yam cutlets"],
  "irish-potato": ["potato mash"],
  "boli": ["ripe plantain roast", "grilled plantain slices", "boli fish", "skewered plantain"],
  "plantain-chips": ["plantain crisps", "spiced plantain chips", "salted plantain chips", "sweet plantain chips", "unripe plantain chips"],
  "garri-eba": ["cassava flakes"],
  "moi-moi": ["bean pudding"],
  "dan-wake": ["bean dumpling"],
  "okpa": ["boiled bambara nut", "bambara nut"],
  "akara": ["bean balls", "bean fritters", "bean croquettes"],
  "cooked-beans": ["black-eyed beans", "brown beans", "white beans", "boiled beans"],
  "beef": ["smoked beef", "minced beef", "beef ribs", "grilled beef ribs", "bbq beef", "grilled beef", "boiled beef", "cow tongue", "boiled cow tongue", "smoked cow tongue"],
  "goat-meat": ["goat ribs", "grilled goat ribs", "roasted goat meat", "goat suya"],
  "chicken": ["chicken wings", "chicken drumstick", "chicken thigh", "minced chicken", "bbq chicken", "spicy grilled chicken", "mild grilled chicken", "herb grilled chicken", "bbq sauce chicken"],
  "turkey": ["turkey wings", "turkey drumstick", "minced turkey", "turkey suya", "bbq turkey", "spicy grilled turkey", "mild grilled turkey", "herb grilled turkey", "bbq sauce turkey"],
  "ram-meat": ["roasted ram meat", "grilled ram meat", "ram suya"],
  "fish": ["bbq fish", "spicy grilled fish", "mild grilled fish", "herb grilled fish", "bbq sauce fish", "fish head", "fish tail", "fish cheeks", "fish roe", "boneless fish fillet"],
  "smoked-fish": ["smoked catfish", "smoked tilapia", "smoked croaker", "smoked sardine"],
  "prawns-crayfish": ["dry crayfish", "dry shrimp", "prawn kebab", "fried prawns", "fried shrimps", "shellfish mix", "crayfish powder", "smoked crayfish", "smoked prawns", "dried prawns", "dried shrimps", "ground crayfish mix"],
  "gizzard": ["gizzard stew", "chicken gizzard", "fried chicken gizzard", "smoked chicken gizzard", "turkey gizzard", "fried turkey gizzard", "grilled gizzard", "obe gizzard"],
  "liver": ["grilled liver", "goat liver"],
  "kidney": ["grilled kidney", "goat kidney"],
  "pomo": ["roasted ponmo", "boiled cow skin", "smoked cow skin"],
  "snail": ["grilled snail"],
  "suya": ["beef suya stick", "skewered meat", "beef suya", "chicken suya"],
  "corned-beef": ["corned beef slices"],
  "fried-chicken-fish": ["chicken popcorn", "fish popcorn", "chicken strips", "fish strips"],
  "dambu-nama": ["danbu nama"],
  "banana": ["banana finger"],
  "apple": ["red apple", "green apple"],
  "orange": ["sweet orange", "bitter orange"],
  "mango": ["local mango", "foreign mango"],
  "guava": ["guava pear"],
  "ube": ["local pear"],
  "sesame-seed": ["sesame snack", "sesame paste", "sesame spread", "seed butter"],
  "mixed-nuts": ["nut mix", "spiced nut mix", "roasted nut mix", "cashew snack", "nut topping"],
  "peanut-butter": ["groundnut paste", "nut butter mix"],
  "coconut": ["coconut paste", "coconut spread", "coconut flakes", "shredded coconut", "coconut chips"],
  "groundnut": ["spiced peanuts"],
  "carrot": ["carrot salad", "pickled carrot"],
  "cucumber": ["cucumber salad", "pickled cucumber"],
  "lettuce": ["mixed greens"],
  "coleslaw": ["mixed vegetable salad", "cold vegetable salad"],
  "biscuits": ["coconut biscuit", "milk biscuit", "ginger biscuit", "sugar biscuit", "butter biscuit", "spicy biscuit", "sesame biscuit", "cashew biscuit", "groundnut biscuit", "fruit biscuit", "cream crackers", "digestive biscuits"],
  "buns": ["raisin bun", "fruit bun", "coconut bun", "honey bun", "sweet bun"],
  "cake": ["spiced cake", "fruit cake", "marble cake", "coconut cake", "carrot cake", "pound cake", "sponge cake", "cupcake"],
  "agege-bread": ["milk bread", "sugar bread", "honey bread", "raisin bread", "fruit bread", "sliced bread"],
  "baguette": ["garlic bread", "herb bread"],
  "samosa": ["mini samosa"],
  "spring-roll": ["mini spring roll"],
  "meat-pie": ["meat turnover", "fish turnover", "mini meat pie", "mini fish pie", "mini chicken pie", "fish pie", "chicken pie"],
  "chin-chin": ["coconut chin chin", "spicy chin chin", "milk chin chin"],
  "puff-puff": ["skewered puff-puff", "mandazi"],
  "peanut-candy": ["sesame brittle", "cashew brittle"],
  "ice-cream": ["ice cream sundae", "ice cream sandwich", "ice cream bar", "frozen yogurt"],
  "sweetened-yogurt": ["flavored yogurt", "fruit yogurt", "spiced yogurt"],
  "condensed-milk": ["condensed milk spread"],
  "chocolate-spread": ["chocolate sauce", "caramel sauce", "chocolate topping", "caramel topping", "vanilla sauce"],
  "jam": ["strawberry sauce", "fruit topping"],
  "milo-bournvita": ["chocolate drink"],
  "malt-drink": ["spiced malt", "malt mix", "energy malt"],
  "energy-drink": ["energy juice"],
  "fruit-juice": ["fruit punch", "tropical punch", "citrus punch", "hibiscus punch", "orange juice", "pineapple juice", "watermelon juice", "mixed fruit juice"],
  "smoothie": ["banana smoothie", "mango smoothie", "pawpaw smoothie", "tropical smoothie"],
  "chapman": ["non-alcoholic cocktail"],
  "tea-coffee": ["lemongrass tea", "spiced tea", "spiced coffee", "black tea"],
  "pap": ["instant pap", "akamu mix", "koko drink"],
  "custard": ["instant custard"],
  "oats": ["instant oats"],
  "fura-da-nono": ["fura powder", "fura balls"],
  "nono": ["nono fresh", "nono thick", "nono light"],
  "masa": ["masa mix"],
  "kuli-kuli": ["kuli kuli hausa style"],
  "donkwa": ["dakuwa", "dakuwa sweet"],
  "aadun": ["adun"],
  "achicha": ["ji achicha", "achicha porridge"],
  "ukwa": ["ukwa dry", "ukwa roasted"],
  "ketchup": ["bottled ketchup"],
  "mayonnaise": ["bottled mayonnaise"],
  "locust-bean": ["iru mix"],
  "pepper-chili": ["ata rodo", "pickled pepper", "pepper mix", "pepper blend"],
  "onion": ["onion blend"],
  "garlic": ["garlic blend"],
  "ginger": ["ginger blend"],
  "palm-oil": ["seasoned palm oil"],
  "vegetable-oil": ["seasoned oil", "chili oil", "garlic oil", "ginger oil", "pepper oil"],
  "butter": ["herb butter", "garlic butter", "chili butter"],
  "cashew-nut": ["cashew snack"],
  "fruit-salad": ["fruit mix", "tropical fruit mix", "mixed citrus", "citrus salad", "cold fruit plate"],
};

// --- apply ---
const byId = new Map(foods.map((f) => [f.id, f]));
const seen = new Set();
for (const f of foods) {
  seen.add(f.name.toLowerCase());
  for (const a of f.aliases || []) seen.add(a.toLowerCase());
}

// add new foods first (guard duplicate ids, register their terms)
for (const f of add) {
  if (byId.has(f.id)) {
    console.error("duplicate id", f.id);
    process.exit(1);
  }
  byId.set(f.id, f);
  foods.push(f);
  seen.add(f.name.toLowerCase());
  for (const a of f.aliases) seen.add(a.toLowerCase());
}

// add aliases, skipping any term that already resolves anywhere
let aliasAdded = 0,
  aliasSkipped = 0;
for (const [id, aliases] of Object.entries(aliasMap)) {
  const f = byId.get(id);
  if (!f) {
    console.error("no food with id", id);
    process.exit(1);
  }
  for (const a of aliases) {
    const key = a.toLowerCase();
    if (seen.has(key)) {
      aliasSkipped++;
      continue;
    }
    f.aliases.push(a);
    seen.add(key);
    aliasAdded++;
  }
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
const terms = foods.reduce((n, f) => n + 1 + (f.aliases?.length || 0), 0);
console.log(`added ${add.length} foods, ${aliasAdded} aliases (skipped ${aliasSkipped} dups). entries: ${foods.length}, individual terms (names+aliases): ${terms}`);
