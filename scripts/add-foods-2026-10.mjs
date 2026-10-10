// Adds 16 Nigerian foods that were missing, researched 2026-10-10 (full
// sources: reports/Nigerian foods nutrition and GI.md in the repo's parent
// folder). Safe append pattern, same as add-banga-rice.mjs. Nutrition is NOT
// written here: food-composition.mjs owns it (PER_100G entries added there).
//
// Sugar speed follows the asymmetry rule in docs/EVIDENCE.md: one small study
// cannot make a food better, so acha stays "high" like tuwo dawa although one
// study measured it lower, and ebiripo is "high" like boiled cocoyam (80-81).
//
// Left out on purpose, because nothing good enough was found: Tom Brown, corn
// pudding, alkubus, funkaso, sinasir, gurasa, gwate, dambu, gullisuwa, ukodo,
// black soup, ofe achi, yaji.
import { readFileSync, writeFileSync } from "node:fs";
const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

// Word for word the texts health-notes.mjs writes, so a re-run changes nothing.
const MEAT =
  "Beef and goat are red meat. Liver, kidney, shaki, and pomo are organ meat. Both are fine for your sugar but not for everyone. If you have high blood pressure, high cholesterol, or kidney problems, pick fish or skinless chicken instead and use less salt.";
const FRIED =
  "This food is fried or heavy with oil. If you have high blood pressure, high cholesterol, or kidney problems, keep to the size shown below and use less oil. Boiled or grilled is better.";
const SOUP_PAIRING =
  "Fish, meat, or egg, with a fist-size ball of swallow (100g) if any. The swallow matters too. Oat swallow raises sugar the least, and eba, fufu, pounded yam and semovita raise it the most.";

const add = [
  {
    id: "acha",
    name: "Acha (fonio)",
    aliases: ["acha", "fonio", "tuwon acha", "tuwo acha", "acha grain", "hungry rice"],
    category: "swallow", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow",
    portionGuidance: "One ball the size of your fist. That is about half a cup of the cooked acha (100g).",
    pairingAdvice: "A green vegetable soup like okra or miyan kuka, plus fish or meat.",
    frequency: "About 2 times a week.",
    logicNote: "A small northern grain, eaten as tuwo or boiled. It is still a starch, so keep to one fist-size ball (100g).",
    tags: ["local", "northern"],
  },
  {
    id: "boiled-cassava",
    name: "Boiled Cassava",
    aliases: ["boiled cassava", "roasted cassava", "cooked cassava", "cassava"],
    category: "tuber", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow",
    portionGuidance: "Two small pieces, each about 5cm long (100g).",
    pairingAdvice: "Garden egg sauce or vegetables, and fish, chicken, or an egg.",
    frequency: "About 2 times a week.",
    logicNote: "Turns to sugar fast, like boiled yam. Keep to the size shown below.",
    tags: ["local"],
  },
  {
    id: "akidi",
    name: "Akidi (black beans)",
    aliases: ["akidi", "black beans", "akidi beans"],
    category: "legume", role: "legume", carbLoad: "medium", gi: "low", baseVerdict: "green",
    portionGuidance: "Half a cup of cooked akidi (130g).",
    pairingAdvice: "Corn, the way it is cooked in the east, or two slices of unripe plantain (80g). Add fish.",
    frequency: "About 4 times a week.",
    logicNote: "A beans food. Your sugar rises slowly.",
    tags: ["local", "eastern"],
  },
  {
    id: "kunun-gyada",
    name: "Kunun Gyada (groundnut kunu)",
    aliases: ["kunun gyada", "kunu gyada", "groundnut kunu", "groundnut gruel"],
    category: "drink", role: "drink", carbLoad: "medium", gi: "medium", baseVerdict: "yellow",
    portionGuidance: "One cup, almost full (200ml). Add no sugar.",
    pairingAdvice: "Drink it with food, like moi moi or akara. Do not drink it on an empty stomach.",
    frequency: "About 2 times a week.",
    logicNote: "Rice cooked in groundnut milk. The sweet kind pushes your sugar up fast.",
    tags: ["local", "northern"],
  },
  {
    id: "mosa",
    name: "Mosa (plantain fritters)",
    aliases: ["mosa", "plantain fritters", "ripe plantain fritters"],
    category: "snack", role: "sugar", carbLoad: "high", gi: "high", baseVerdict: "red",
    portionGuidance: "Best to skip this. If you do have it, only two small mosa (40g).",
    pairingAdvice: "",
    frequency: "About 1 time a month.",
    logicNote: "Over-ripe plantain mixed with flour and fried. One of the worst snacks.",
    tags: ["local"],
    healthNote: FRIED,
  },
  {
    id: "dodo-ikire",
    name: "Dodo Ikire",
    aliases: ["dodo ikire", "ikire plantain", "ikire dodo"],
    category: "snack", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "red",
    portionGuidance: "Best to skip this. If you do have it, one small piece (40g).",
    pairingAdvice: "If eaten, fish, chicken, or an egg.",
    frequency: "About 1 time a month.",
    logicNote: "Over-ripe plantain fried in a lot of oil. Pushes your sugar up very fast.",
    tags: ["local"],
    healthNote: FRIED,
  },
  {
    id: "ebiripo",
    name: "Ebiripo (cocoyam pudding)",
    aliases: ["ebiripo", "cocoyam pudding"],
    category: "tuber", role: "starch", carbLoad: "high", gi: "high", baseVerdict: "yellow",
    portionGuidance: "One wrap, about 10cm long (120g).",
    pairingAdvice: "Egusi or a vegetable soup, and fish.",
    frequency: "About 2 times a week.",
    logicNote: "Grated cocoyam steamed in leaves. It raises sugar fast. Keep to the size shown below.",
    tags: ["local"],
  },
  {
    id: "bush-mango",
    name: "African Bush Mango (oro)",
    aliases: ["bush mango", "african bush mango", "oro", "ugiri", "wild mango"],
    category: "fruit", role: "fruit", carbLoad: "medium", gi: "medium", baseVerdict: "yellow",
    portionGuidance: "The flesh of one fruit (about 100g).",
    pairingAdvice: "Eat it alone.",
    frequency: "About 3 times a week.",
    logicNote: "The fruit of the ogbono tree. Sweet and juicy, so keep to the size shown below.",
    tags: ["local"],
    carbExchange: "The flesh of one fruit (100g).",
  },
  {
    id: "miyan-yakuwa",
    name: "Miyan Yakuwa (sorrel leaf soup)",
    aliases: ["miyan yakuwa", "yakuwa", "sorrel leaf soup", "isapa soup", "zobo leaf soup"],
    category: "soup", role: "soup", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "Eat as much as you like. Two big spoons of soup (250ml) is a good start.",
    pairingAdvice: SOUP_PAIRING,
    frequency: "You can eat this every day.",
    logicNote: "A sharp soup of sorrel leaves. A green soup.",
    tags: ["local", "northern"],
  },
  {
    id: "efo-igbo",
    name: "Efo Igbo",
    aliases: ["efo igbo", "igbagba leaf", "garden egg leaf", "african eggplant leaf"],
    category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "Eat as much as you like.",
    pairingAdvice: "Everything.",
    frequency: "You can eat this every day.",
    logicNote: "Leafy green. Very friendly.",
    tags: ["friendly", "local"],
  },
  {
    id: "moringa",
    name: "Moringa Leaves (zogale)",
    aliases: ["moringa", "moringa leaves", "zogale", "ewe igbale", "drumstick leaves"],
    category: "vegetable", role: "vegetable", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "Eat as much as you like.",
    pairingAdvice: "Everything.",
    frequency: "You can eat this every day.",
    logicNote: "Leafy green, full of goodness.",
    tags: ["friendly", "local"],
  },
  {
    id: "pork",
    name: "Pork",
    aliases: ["pork", "pig meat", "pork chop", "roasted pork", "pork suya"],
    category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "Two medium chunks (90g). Put together, they fill your palm.",
    pairingAdvice: "Pepper sauce, vegetables.",
    frequency: "You can eat this every day.",
    logicNote: "Red meat with no starch. Cut off the fat.",
    tags: ["local"],
    healthNote: MEAT,
  },
  {
    id: "guinea-fowl",
    name: "Guinea Fowl",
    aliases: ["guinea fowl", "awo", "zabo", "eran awo"],
    category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "Two medium pieces (90g). Put together, they fill your palm.",
    pairingAdvice: "It goes with anything. Remove the skin for less fat.",
    frequency: "You can eat this every day.",
    logicNote: "Lean bird meat. Grilled or boiled beats fried.",
    tags: ["local"],
  },
  {
    id: "rabbit",
    name: "Rabbit",
    aliases: ["rabbit", "rabbit meat", "ehoro"],
    category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "Two medium pieces (90g). Put together, they fill your palm.",
    pairingAdvice: "Pepper sauce, vegetables.",
    frequency: "You can eat this every day.",
    logicNote: "Lean meat with no starch. Grilled or boiled beats fried.",
    tags: ["local"],
    healthNote: MEAT,
  },
  {
    id: "quail-eggs",
    name: "Quail Eggs",
    aliases: ["quail egg", "quail eggs", "eyin aparo"],
    category: "protein", role: "protein", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "Ten quail eggs (about 90g). That is the same as two hen eggs.",
    pairingAdvice: "Beans, moi moi, or half an avocado.",
    frequency: "You can eat this every day.",
    logicNote: "Small eggs. No starch, filling.",
    tags: [],
  },
  {
    id: "local-spices",
    name: "Local Spices (alligator pepper, ehuru, uda)",
    aliases: ["alligator pepper", "atare", "ehuru", "calabash nutmeg", "uda", "negro pepper", "grains of selim"],
    category: "condiment", role: "condiment", carbLoad: "low", gi: "low", baseVerdict: "green",
    portionGuidance: "A pinch. Add it to your cooking for taste.",
    pairingAdvice: "Soups and pepper soup.",
    frequency: "You can eat this every day.",
    logicNote: "Spices with no sugar and no starch.",
    tags: [],
  },
];

const ids = new Set(foods.map((f) => f.id));
const taken = new Map();
for (const f of foods) for (const a of f.aliases || []) taken.set(a.toLowerCase(), f.id);
for (const f of add) {
  if (ids.has(f.id)) {
    console.log("already there, skipped:", f.id); // idempotent re-run
    continue;
  }
  for (const a of f.aliases) {
    if (taken.has(a)) throw new Error(`alias "${a}" on ${f.id} already belongs to ${taken.get(a)}`);
  }
  f.portionIcon = undefined; // set by portion-icons.mjs's table; filled below to match it
  foods.push(f);
}
const ICON = {
  acha: "fist", "boiled-cassava": "pieces", akidi: "half-cup", "kunun-gyada": "glass",
  mosa: "avoid", "dodo-ikire": "avoid", ebiripo: "pieces", "bush-mango": "whole-fruit",
  "miyan-yakuwa": "free", "efo-igbo": "free", moringa: "free", pork: "pieces",
  "guinea-fowl": "pieces", rabbit: "pieces", "quail-eggs": "eggs", "local-spices": "pinch",
};
for (const f of foods) if (f.id in ICON) f.portionIcon = ICON[f.id];
writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log("total:", foods.length);
