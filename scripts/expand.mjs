import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

// ---- specific, research-informed portion guidance, keyed by food id ----
const portions = {
  // swallow (one fist ~ 1/2 cup ~ 100g cooked)
  "garri-eba": "One ball the size of your fist, about half a cup (100g).",
  "pounded-yam": "One ball the size of your fist, about half a cup (100g).",
  "amala-yam": "One ball the size of your fist, about half a cup (100g).",
  "amala-plantain": "One ball the size of your fist, about half a cup (100g).",
  "fufu-akpu": "One ball the size of your fist, about half a cup (100g).",
  "semovita": "One ball the size of your fist, about half a cup (100g).",
  "wheat-swallow": "One ball the size of your fist, about half a cup (100g).",
  "oat-swallow": "One ball the size of your fist, about half a cup (100g).",
  "tuwo-shinkafa": "One ball the size of your fist, about half a cup (100g).",
  "tuwo-masara": "One ball the size of your fist, about half a cup (100g).",
  "starch-delta": "One ball the size of your fist, about half a cup (100g).",
  // rice
  "white-rice": "Half a cup of cooked rice, about the size of a tennis ball (90g).",
  "jollof-rice": "Half a cup of cooked rice, about the size of a tennis ball (90g).",
  "fried-rice": "Half a cup of cooked rice, about the size of a tennis ball (90g).",
  "ofada-rice": "Three-quarters of a cup of cooked rice (about 120g).",
  "brown-rice": "Three-quarters of a cup of cooked rice (about 120g).",
  "basmati-rice": "Three-quarters of a cup of cooked rice (about 120g).",
  "rice-and-beans": "Three-quarters of a cup, with more beans than rice (about 130g).",
  // tuber
  "boiled-yam": "Two small pieces, each the size of a matchbox (about 100g).",
  "fried-yam": "Avoid. If eaten, two small pieces at most (about 80g).",
  "yam-porridge": "One small bowl, about three-quarters of a cup (150g).",
  "roasted-yam": "Two small pieces, about the size of two matchboxes (100g).",
  "sweet-potato": "One medium piece, about the size of your fist (120g).",
  "irish-potato": "Two small potatoes, about the size of two eggs (120g).",
  "cocoyam": "Two small pieces, about the size of two eggs (120g).",
  // plantain
  "boiled-plantain-unripe": "About four to five slices, roughly one cup (120g).",
  "boiled-plantain-ripe": "About two to three slices (80g).",
  "dodo": "Avoid. If eaten, three to four small slices at most (60g).",
  "unripe-plantain-porridge": "One bowl, about one cup (200g), with plenty vegetables.",
  // snack
  "plantain-chips": "Avoid. If at all, a small handful, about 15 chips (30g).",
  "popcorn-plain": "One cup, unsweetened (about 8g).",
  "abacha": "A small plate, about one cup (150g).",
  "suya": "One stick, about six to eight pieces (90g of meat).",
  "kilishi": "Three to four pieces (about 30g).",
  "nkwobi": "One small bowl (about 150g).",
  "boli": "Half of one medium unripe plantain.",
  "chin-chin": "Avoid. A rare treat only, a small handful (30g).",
  "puff-puff": "Avoid. A rare treat only, one small ball.",
  "meat-pie": "Avoid. A rare treat only, half of one.",
  "sausage-roll": "Avoid. A rare treat only, one.",
  "buns": "Avoid. A rare treat only, one small piece.",
  "doughnut": "Avoid. A rare treat only, half of one.",
  "biscuits": "Avoid. A rare treat only, two small biscuits.",
  "cake": "Avoid. A rare treat only, one thin slice, a finger wide.",
  "ice-cream": "Avoid. A rare treat only, one small scoop.",
  // legume
  "cooked-beans": "One cupped handful, about half a cup cooked (130g).",
  "ewa-agoyin": "One cupped handful, about half a cup, easy on the oil (130g).",
  "moi-moi": "One wrap, about the size of your palm (150g).",
  "akara": "Three small balls (about 90g).",
  "beans-porridge": "One small bowl, about three-quarters of a cup (150g).",
  "okpa": "One wrap, about the size of your palm (150g).",
  // bread
  "agege-bread": "One thin slice at most (30g), never on its own.",
  "whole-wheat-bread": "One to two slices (about 30g each).",
  // cereal
  "pap": "One small cup made up (about 200ml), no sugar.",
  "custard": "One small cup made up (about 200ml), no sugar.",
  "oats": "Half a cup dry (40g), made with water.",
  "golden-morn": "Four tablespoons dry (about 40g), no sugar.",
  "cornflakes": "Avoid. A rare treat, four tablespoons (30g).",
  // corn
  "boiled-corn": "Half of one medium cob.",
  "roasted-corn": "Half of one medium cob.",
  // soup (serving spoon ~ 1/2 cup)
  "egusi-soup": "One to two serving spoons, about one cup.",
  "ogbono-soup": "One to two serving spoons, about one cup.",
  "efo-riro": "Eat freely, two or more serving spoons.",
  "edikang-ikong": "Eat freely, two or more serving spoons.",
  "afang-soup": "Eat freely, two or more serving spoons.",
  "oha-soup": "One to two serving spoons, about one cup.",
  "bitterleaf-soup": "One to two serving spoons, about one cup.",
  "okra-soup": "Eat freely, two or more serving spoons.",
  "vegetable-soup": "Eat freely, two or more serving spoons.",
  "banga-soup": "One serving spoon, easy on the oil, about half a cup.",
  "ewedu": "Eat freely, two or more serving spoons.",
  "gbegiri": "One to two serving spoons, about one cup.",
  "groundnut-soup": "One serving spoon, about half a cup.",
  "white-soup": "One to two serving spoons, about one cup.",
  "pepper-soup": "Eat freely, one full bowl.",
  "miyan-kuka": "One to two serving spoons, about one cup.",
  // protein (palm-size ~ deck of cards ~ 90g)
  "chicken": "One palm-size piece, like a deck of cards (90g).",
  "beef": "One palm-size piece, like a deck of cards (90g).",
  "goat-meat": "One palm-size piece, like a deck of cards (90g).",
  "fish": "One palm-size fillet, like a deck of cards (100g).",
  "eggs": "One to two eggs.",
  "turkey": "One palm-size piece, like a deck of cards (90g).",
  "snail": "Two to three medium snails (about 90g).",
  "prawns-crayfish": "One handful of prawns (about 90g).",
  "pomo": "Two to three small pieces (about 60g).",
  "liver": "One palm-size piece (90g).",
  "fried-chicken-fish": "One palm-size piece (90g), not often.",
  // vegetable (green, generous)
  "ugu": "Eat freely, one to two cupped handfuls.",
  "waterleaf": "Eat freely, one to two cupped handfuls.",
  "spinach": "Eat freely, one to two cupped handfuls.",
  "garden-egg": "Eat freely, two to three whole garden eggs.",
  "okra-veg": "Eat freely, about one cup chopped.",
  "cucumber": "Eat freely, one whole cucumber.",
  "cabbage": "Eat freely, one to two cups shredded.",
  "carrot": "One to two medium carrots.",
  "tomato": "Eat freely, two to three whole tomatoes.",
  "green-beans": "Eat freely, about one cup.",
  "ugba": "A small handful, about half a cup.",
  // fruit (~15g carb per serving)
  "avocado": "Half of a medium avocado (75g).",
  "pawpaw": "One slice, about half a cup diced (120g).",
  "watermelon": "One cup diced, about one thin slice (150g).",
  "orange": "One medium whole orange, not juice.",
  "apple": "One small apple, the size of a tennis ball (120g).",
  "banana": "Half of one medium banana.",
  "mango": "Half of one small mango, about half a cup (80g).",
  "pineapple": "One thin slice, about half a cup (80g).",
  "guava": "One small guava (about 55g).",
  "agbalumo": "One to two small fruits.",
  "soursop": "Half a cup, about three small pieces (100g).",
  "dates": "One to two pieces only.",
  "cashew-fruit": "One to two fruits.",
  // nut (small handful ~ 30g)
  "groundnut": "One small handful, a cupped palm (30g).",
  "cashew-nut": "One small handful, about 15 nuts (30g).",
  "tiger-nut": "One small handful (30g).",
  "coconut": "Two to three small pieces (about 40g).",
  "walnut": "One small handful, about seven whole (30g).",
  // drink
  "soft-drink": "None. Avoid completely.",
  "fruit-juice": "None. Eat the whole fruit instead.",
  "malt-drink": "None. Avoid.",
  "energy-drink": "None. Avoid completely.",
  "zobo-unsweetened": "One cup (250ml), no sugar.",
  "zobo-sweetened": "None. Avoid.",
  "kunu": "One small cup (200ml), unsweetened.",
  "kunu-aya": "One small cup (200ml), no added sugar.",
  "palm-wine": "One small glass (100ml), rarely.",
  "soaked-garri": "Avoid. If at all, a small cup with no sugar.",
  "milo-bournvita": "None of the sugary mix. Avoid.",
  "tea-coffee": "One cup (250ml), no sugar.",
  "water": "Drink plenty, six to eight cups a day.",
  // dairy
  "milk-full-cream": "Half a cup (125ml), unsweetened.",
  "condensed-milk": "None. Avoid.",
  "plain-yogurt": "One small cup (150g), unsweetened.",
  "sweetened-yogurt": "None. Avoid.",
  "wara": "Three to four small pieces (about 90g).",
  // fat
  "palm-oil": "One to two teaspoons, use sparingly.",
  "vegetable-oil": "One to two teaspoons, use sparingly.",
  "olive-oil": "One to two teaspoons.",
  "butter": "One thin scrape, about one teaspoon.",
  "mayonnaise": "One teaspoon.",
  // sugar
  "table-sugar": "None. Avoid completely.",
  "honey": "None. Avoid.",
  "glucose-lucozade": "None, unless treating a low sugar. Then a small glass.",
  // condiment
  "salt": "Less than one teaspoon a day in total.",
};

// ---- new foods across the regions, plus more Nigerian fruits ----
const newFoods = [
  // NORTH
  { id: "fura-da-nono", name: "Fura da Nono (millet and milk)", aliases: ["fura","nono","fura da nono"], category: "drink", role: "drink", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "One small cup (200ml), no added sugar.", pairingAdvice: "Alone, unsweetened.", frequency: "Occasional; avoid the sweetened type.", logicNote: "Millet balls in fermented milk. Gentle without sugar; the sweet type spikes.", tags: ["local","northern"] },
  { id: "masa", name: "Masa (rice cakes)", aliases: ["masa","waina"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow", portionGuidance: "Two small cakes (about 60g).", pairingAdvice: "Miyan taushe or vegetable soup and protein.", frequency: "Occasional, small.", logicNote: "Fermented rice cakes; soft and starchy, so keep it small.", tags: ["local","northern"] },
  { id: "dan-wake", name: "Dan Wake (bean dumplings)", aliases: ["dan wake","dankwa"], category: "legume", role: "legume", carbLoad: "medium", gi: "low", baseVerdict: "green", portionGuidance: "One small plate, about one cup (150g).", pairingAdvice: "A little oil and pepper; add vegetables.", frequency: "Good regular meal.", logicNote: "Bean-flour dumplings; high fibre and slow to raise sugar.", tags: ["local","northern"] },
  { id: "miyan-taushe", name: "Miyan Taushe (pumpkin soup)", aliases: ["miyan taushe","pumpkin soup"], category: "soup", role: "soup", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One to two serving spoons, about one cup.", pairingAdvice: "Small swallow and protein.", frequency: "Excellent regular soup.", logicNote: "Pumpkin and groundnut soup; filling and friendly.", tags: ["local","northern"] },
  { id: "kuli-kuli", name: "Kuli Kuli (groundnut cake)", aliases: ["kuli kuli"], category: "snack", role: "fat", carbLoad: "low", gi: "low", baseVerdict: "yellow", portionGuidance: "A small handful (about 30g).", pairingAdvice: "Alone; go easy if eating with garri.", frequency: "Occasional.", logicNote: "Fried groundnut cake; the nut is fine, the frying oil is the caution.", tags: ["local","northern"] },
  { id: "dambu-nama", name: "Dambu Nama (shredded meat)", aliases: ["dambu nama","shredded beef"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "A palm-size amount (about 60g).", pairingAdvice: "Alone or with vegetables.", frequency: "Good regular protein.", logicNote: "Dried, spiced, shredded meat; mostly protein.", tags: ["local","northern"] },
  // SOUTH-WEST
  { id: "ikokore", name: "Ikokore (water yam porridge)", aliases: ["ikokore","ifokore"], category: "tuber", role: "starch", carbLoad: "high", gi: "medium", baseVerdict: "yellow", portionGuidance: "One small bowl, about three-quarters of a cup (150g).", pairingAdvice: "Plenty vegetables and fish in it.", frequency: "Occasional, small.", logicNote: "Grated water yam porridge; load it with vegetables and protein.", tags: ["local","yoruba"] },
  { id: "ekuru", name: "Ekuru (white moi moi)", aliases: ["ekuru","white moi moi"], category: "legume", role: "legume", carbLoad: "medium", gi: "low", baseVerdict: "green", portionGuidance: "One to two wraps, palm size (150g).", pairingAdvice: "Ata sauce and fish; skip the eko.", frequency: "Good regular choice.", logicNote: "Steamed beans with no oil inside; protein-rich and slow.", tags: ["local","yoruba"] },
  { id: "ojojo", name: "Ojojo (water yam fritters)", aliases: ["ojojo"], category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow", portionGuidance: "Three to four small fritters (about 80g).", pairingAdvice: "Pepper sauce; pair with vegetables.", frequency: "Occasional; mind the frying oil.", logicNote: "Fried water yam balls; keep them few because of the frying.", tags: ["local","yoruba"] },
  { id: "eko-agidi", name: "Eko / Agidi (corn jelly)", aliases: ["eko","agidi","corn jelly"], category: "cereal", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow", portionGuidance: "One small wrap (about 120g).", pairingAdvice: "Beans, moi moi, or pepper soup.", frequency: "Occasional, small.", logicNote: "Set corn starch; smooth and quick to raise sugar, so keep it small.", tags: ["local","yoruba"] },
  // SOUTH-EAST
  { id: "ukwa", name: "Ukwa (African breadfruit)", aliases: ["ukwa","breadfruit"], category: "legume", role: "legume", carbLoad: "medium", gi: "low", baseVerdict: "green", portionGuidance: "One small bowl, about three-quarters of a cup (150g).", pairingAdvice: "A little palm oil and fish.", frequency: "Good regular meal.", logicNote: "African breadfruit; high fibre and protein, a filling meal.", tags: ["local","eastern"] },
  { id: "fio-fio", name: "Fio Fio (pigeon pea pottage)", aliases: ["fio fio","pigeon peas"], category: "legume", role: "legume", carbLoad: "medium", gi: "low", baseVerdict: "green", portionGuidance: "One cupped handful, about half a cup (130g).", pairingAdvice: "Vegetables and fish.", frequency: "Good regular meal.", logicNote: "Pigeon pea pottage; beans-like, high fibre and slow.", tags: ["local","eastern"] },
  { id: "achicha", name: "Achicha (dried cocoyam and beans)", aliases: ["achicha","achicha ede"], category: "tuber", role: "starch", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "One small bowl, about three-quarters of a cup (150g).", pairingAdvice: "Plenty vegetables and fish.", frequency: "Occasional, small.", logicNote: "Dried cocoyam cooked with beans; the beans help slow it.", tags: ["local","eastern"] },
  { id: "ora-soup", name: "Ora Soup (Oha-style)", aliases: ["ora soup","ofe ora"], category: "soup", role: "soup", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One to two serving spoons, about one cup.", pairingAdvice: "Small swallow and protein.", frequency: "Good regular soup.", logicNote: "Leafy vegetable soup; friendly, watch only the thickener and swallow.", tags: ["local","eastern"] },
  // SOUTH-SOUTH
  { id: "owho-soup", name: "Owho Soup (Urhobo)", aliases: ["owho soup","oghwo soup"], category: "soup", role: "soup", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One to two serving spoons, about one cup.", pairingAdvice: "Fish or bush meat; small starch.", frequency: "Good regular soup.", logicNote: "Light palm-based Delta soup; low carb and friendly.", tags: ["local","delta"] },
  { id: "native-soup", name: "Fisherman / Native Soup", aliases: ["native soup","fisherman soup"], category: "soup", role: "soup", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One full bowl.", pairingAdvice: "Assorted fish and seafood.", frequency: "Excellent.", logicNote: "Rich seafood broth, almost no carbs. A great choice.", tags: ["local","delta"] },
  { id: "ekpang-nkukwo", name: "Ekpang Nkukwo (grated cocoyam)", aliases: ["ekpang nkukwo","ekpang"], category: "tuber", role: "starch", carbLoad: "high", gi: "medium", baseVerdict: "yellow", portionGuidance: "One small bowl, about three-quarters of a cup (150g).", pairingAdvice: "Plenty vegetables, periwinkle, and fish in it.", frequency: "Occasional, small.", logicNote: "Grated cocoyam wrapped and cooked; dense, so keep it moderate.", tags: ["local","south-south"] },
  { id: "periwinkle", name: "Periwinkle (isam)", aliases: ["periwinkle","isam","mfi"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "A small handful of the meat (about 60g).", pairingAdvice: "In soups like afang and edikang ikong.", frequency: "Good protein.", logicNote: "Small shellfish; low carb and protein-rich.", tags: ["local","south-south"] },
  // MORE PROTEINS
  { id: "stockfish", name: "Stockfish (okporoko)", aliases: ["stockfish","okporoko","panla"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One small piece (about 60g).", pairingAdvice: "In soups and stews.", frequency: "Good in soups.", logicNote: "Dried fish; low carb and protein-rich.", tags: ["local"] },
  { id: "shaki", name: "Shaki (tripe)", aliases: ["shaki","towel","tripe"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Two to three small pieces (about 90g).", pairingAdvice: "In soups and pepper soup.", frequency: "Good regular protein.", logicNote: "Cow tripe; low carb, fine for blood sugar.", tags: ["local"] },
  { id: "gizzard", name: "Gizzard", aliases: ["gizzard"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "About five pieces, a palm-size serving (90g).", pairingAdvice: "Pepper sauce and vegetables.", frequency: "Good; grilled beats fried.", logicNote: "Chicken gizzard; lean protein, low carb.", tags: [] },
  { id: "crab", name: "Crab", aliases: ["crab"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One medium crab, or one handful of meat (90g).", pairingAdvice: "In soups and pepper soup.", frequency: "Good protein.", logicNote: "Shellfish; low carb and protein-rich.", tags: [] },
  { id: "grasscutter", name: "Grasscutter (bush meat)", aliases: ["grasscutter","bush meat"], category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One palm-size piece (90g).", pairingAdvice: "Pepper soup and vegetables.", frequency: "Good protein.", logicNote: "Lean bush meat; low carb.", tags: ["local"] },
  // MORE VEGETABLES
  { id: "scent-leaf", name: "Scent Leaf (nchanwu / efirin)", aliases: ["scent leaf","nchanwu","efirin"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Eat freely, a handful added to food.", pairingAdvice: "In soups, pepper soup, and stews.", frequency: "Excellent daily.", logicNote: "Aromatic leaf; very low sugar and friendly.", tags: ["local"] },
  { id: "uziza", name: "Uziza (leaf and seed)", aliases: ["uziza"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "A small handful of leaves, or a pinch of seed.", pairingAdvice: "In soups like oha and nsala.", frequency: "Excellent daily.", logicNote: "Peppery leaf and seed; low sugar, adds flavour.", tags: ["local","eastern"] },
  { id: "utazi", name: "Utazi", aliases: ["utazi"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "A small handful, sliced thin.", pairingAdvice: "In abacha, nkwobi, and pepper soup.", frequency: "Excellent daily.", logicNote: "Slightly bitter leaf; low sugar and friendly.", tags: ["local","eastern"] },
  { id: "bell-pepper", name: "Bell Pepper (tatashe)", aliases: ["tatashe","bell pepper"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Eat freely, one to two peppers.", pairingAdvice: "In stews, sauces, and salads.", frequency: "Excellent daily.", logicNote: "Sweet pepper; low sugar and high in fibre.", tags: ["local"] },
  { id: "onion", name: "Onion (alubosa)", aliases: ["onion","alubosa"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One medium onion used in cooking.", pairingAdvice: "In nearly everything.", frequency: "Excellent daily.", logicNote: "Low sugar and friendly; also good for the heart.", tags: [] },
  { id: "lettuce", name: "Lettuce", aliases: ["lettuce"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Eat freely, two to three cups.", pairingAdvice: "Salads and sandwiches.", frequency: "Excellent daily.", logicNote: "Leafy and watery; almost no sugar.", tags: [] },
  { id: "bitterleaf-veg", name: "Bitter Leaf (washed, as a side)", aliases: ["bitter leaf","onugbu leaf","bitterleaf"], category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Eat freely, one to two cupped handfuls.", pairingAdvice: "In soups and as a side.", frequency: "Excellent daily.", logicNote: "Leafy green; some studies link it to steadier blood sugar.", tags: ["local"] },
  // MORE FRUITS
  { id: "ube", name: "Ube (African pear)", aliases: ["ube","african pear","local pear"], category: "fruit", role: "fat", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Two to three softened pears.", pairingAdvice: "Great with boiled or roasted corn.", frequency: "Good, in season.", logicNote: "Oily fruit; low sugar and high in good fat, and it slows corn.", tags: ["local","seasonal"] },
  { id: "tangerine", name: "Tangerine", aliases: ["tangerine"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "One medium fruit, not juice.", pairingAdvice: "Eat whole for the fibre.", frequency: "Moderate.", logicNote: "Whole tangerine is fine; the juice is not.", tags: [] },
  { id: "grapefruit", name: "Grapefruit", aliases: ["grapefruit"], category: "fruit", role: "fruit", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "Half of one medium fruit.", pairingAdvice: "Alone.", frequency: "Good.", logicNote: "Lower sugar citrus; a friendly fruit.", tags: [] },
  { id: "lime-lemon", name: "Lime and Lemon", aliases: ["lime","lemon"], category: "fruit", role: "fruit", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "A squeeze in water or food.", pairingAdvice: "In water, tea, and cooking.", frequency: "Excellent daily.", logicNote: "Very low sugar; adds flavour with almost no carbs.", tags: [] },
  { id: "sugarcane", name: "Sugarcane (ireke)", aliases: ["sugarcane","ireke","sugar cane"], category: "fruit", role: "sugar", carbLoad: "high", gi: "high", baseVerdict: "red", portionGuidance: "Avoid. A rare treat, one small piece to chew.", pairingAdvice: "", frequency: "Rare.", logicNote: "You chew out pure sugar; it raises blood sugar fast.", tags: ["local"] },
  { id: "velvet-tamarind", name: "Velvet Tamarind (icheku / awin)", aliases: ["velvet tamarind","icheku","awin"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "A small handful of pods.", pairingAdvice: "Alone.", frequency: "Occasional, in season.", logicNote: "Tart and sweet; small amounts only.", tags: ["local","seasonal"] },
  { id: "tamarind", name: "Tamarind (tsamiya)", aliases: ["tamarind","tsamiya"], category: "fruit", role: "fruit", carbLoad: "high", gi: "medium", baseVerdict: "yellow", portionGuidance: "One to two pods, or a spoon of pulp.", pairingAdvice: "In drinks and sauces, no added sugar.", frequency: "Occasional.", logicNote: "Sweet-sour pulp; the sugar adds up, so keep it small.", tags: ["local","northern"] },
  { id: "bitter-kola", name: "Bitter Kola (orogbo)", aliases: ["bitter kola","orogbo"], category: "nut", role: "fat", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One to two seeds.", pairingAdvice: "Alone.", frequency: "Good.", logicNote: "Chewed seed; very low sugar.", tags: ["local"] },
  { id: "kola-nut", name: "Kola Nut (oji / gworo)", aliases: ["kola nut","oji","gworo"], category: "nut", role: "fat", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One to two lobes.", pairingAdvice: "Alone.", frequency: "Moderate; it has caffeine.", logicNote: "Low sugar, but the caffeine means do not overdo it.", tags: ["local"] },
  { id: "coconut-water", name: "Coconut Water", aliases: ["coconut water"], category: "drink", role: "drink", carbLoad: "low", gi: "low", baseVerdict: "green", portionGuidance: "One small glass (200ml), fresh and plain.", pairingAdvice: "Alone.", frequency: "Moderate.", logicNote: "Fresh coconut water is low in sugar; the packaged sweet type is not.", tags: ["local"] },
  { id: "jackfruit", name: "Jackfruit", aliases: ["jackfruit"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Three to four pieces, about half a cup (80g).", pairingAdvice: "A few nuts.", frequency: "Occasional.", logicNote: "Sweet tropical fruit; keep the portion small.", tags: [] },
  { id: "pomegranate", name: "Pomegranate", aliases: ["pomegranate"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow", portionGuidance: "Half a cup of seeds (about 80g).", pairingAdvice: "Alone or on plain yogurt.", frequency: "Moderate.", logicNote: "Has fibre but also natural sugar; a small portion is fine.", tags: [] },
  { id: "grapes", name: "Grapes", aliases: ["grapes"], category: "fruit", role: "fruit", carbLoad: "medium", gi: "high", baseVerdict: "yellow", portionGuidance: "About ten to fifteen grapes (80g).", pairingAdvice: "A few nuts to slow it.", frequency: "Occasional.", logicNote: "Small but sweet; easy to overeat, so count them.", tags: [] },
];

// ---- apply ----
let missing = [];
for (const f of foods) {
  if (portions[f.id]) f.portionGuidance = portions[f.id];
  else missing.push(f.id);
}
if (missing.length) {
  console.error("No portion mapping for:", missing);
  process.exit(1);
}

const existingIds = new Set(foods.map((f) => f.id));
for (const nf of newFoods) {
  if (existingIds.has(nf.id)) {
    console.error("Duplicate id:", nf.id);
    process.exit(1);
  }
}

const out = [...foods, ...newFoods];
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");

const spread = { green: 0, yellow: 0, red: 0 };
out.forEach((f) => spread[f.baseVerdict]++);
console.log(`total: ${out.length} (added ${newFoods.length})`, spread);
