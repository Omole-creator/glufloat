// Make card copy specific and readable (dietician/founder feedback):
//   - "Eat it with" (pairingAdvice) must give concrete amounts, never a vague
//     "small size" / "a little" / "a few". Use the same anchors the app uses
//     elsewhere (one thin slice of bread 30g, a fist-size ball 100g, two slices
//     of plantain 80g, half a cup of rice 130g, about 10 nuts, one teaspoon...).
//   - a few portionGuidance lines had no concrete measure at all; add one.
//   - join two ideas with a full stop or connective word, not a bare comma.
// Safe id-keyed edit pattern (read -> mutate by id -> re-serialize).
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

const pairingAdvice = {
  "fried-rice": "A palm-size piece of chicken or fish (90g), plus the mixed vegetables in it.",
  "cooked-beans": "Fish, an egg, or two slices of plantain (80g).",
  "beans-porridge": "Fish, or two slices of unripe plantain (80g).",
  oats: "About 10 nuts. Skip sugar and sweet milk.",
  "egusi-soup": "A fist-size ball of swallow (100g) and plenty of vegetables.",
  ewedu: "Gbegiri and a fist-size ball of swallow (100g), with fish or meat.",
  pawpaw: "About 10 nuts to slow the sugar.",
  watermelon: "About 10 nuts to slow the sugar.",
  apple: "About 10 nuts.",
  banana: "About 10 groundnuts.",
  mango: "About 10 nuts.",
  pineapple: "About 10 nuts.",
  "plain-yogurt": "About 10 nuts, or 8 to 10 berries.",
  "dan-wake": "One teaspoon of oil and some pepper. Add plenty of vegetables.",
  "kuli-kuli": "Eat it alone. If you add garri, keep the garri to a fist-size ball (100g).",
  ukwa: "One teaspoon of palm oil, plus fish.",
  jackfruit: "About 10 nuts.",
  grapes: "About 10 nuts to slow the sugar.",
  "fried-egg": "One thin slice of bread (30g), a fist-size piece of yam (100g), or two slices of plantain (80g). Fry the egg in one teaspoon of oil.",
  "scrambled-egg": "Plenty of vegetables, with one thin slice of bread (30g) or a fist-size piece of yam (100g).",
  "egg-sauce": "A fist-size piece of boiled yam (100g), two slices of plantain (80g), or one small boiled potato.",
  omelette: "One thin slice of bread (30g), or a fist-size piece of yam (100g).",
  adalu: "Fish, or two slices of plantain (80g). Keep the corn to about two tablespoons.",
  // 130g was the cooked-beans anchor. Half a cup of cooked rice is 90g, which is
  // what the White Rice card itself says.
  "ofe-akwu": "Fish or meat. Eat it with half a cup of white rice (about 90g).",
  strawberry: "About 10 nuts, or one small cup of plain yogurt (150g).",
  "golden-melon": "About 10 nuts to slow the sugar.",
  smoothie: "One small glass (200ml) with a meal, not on its own. Better to eat the whole fruit.",
  weetabix: "Unsweetened milk and about 10 nuts.",
  shawarma: "If you eat it, ask for more meat and vegetables and less bread and sauce.",
  ketchup: "One tablespoon on the side.",
  // bread is not eaten with a plate of vegetables; pair with a protein or fat
  // spread that also slows the sugar.
  "whole-wheat-bread": "Egg, avocado, beans, or moi moi. Never on its own.",
  "agege-bread": "If eaten, add egg, beans, or moi moi, never on its own.",
  "coconut-bread": "Egg, beans, or moi moi. Never on its own.",
  // soups that said "small swallow": give the concrete ball size, expand
  // "protein" to "fish, meat, or egg", and replace bare-comma joins.
  "ogbono-soup": "A fist-size ball of swallow (100g) and plenty of vegetables.",
  "efo-riro": "Fish, meat, or egg, with a fist-size ball of swallow (100g) if any.",
  "edikang-ikong": "Fish, meat, or egg, with a fist-size ball of swallow (100g) if any.",
  "afang-soup": "Fish, meat, or egg, with a fist-size ball of swallow (100g) if any.",
  "oha-soup": "A fist-size ball of swallow (100g) with fish, meat, or egg.",
  "bitterleaf-soup": "A fist-size ball of swallow (100g) with fish, meat, or egg.",
  "okra-soup": "Fish, meat, or egg, with a fist-size ball of swallow (100g) if any.",
  "vegetable-soup": "Fish, meat, or egg, with a fist-size ball of swallow (100g) if any.",
  "banga-soup": "Fish, with a fist-size ball of swallow (100g) if any.",
  gbegiri: "Ewedu and a fist-size ball of swallow (100g), with fish or meat.",
  "groundnut-soup": "Vegetables and fish or meat, with a fist-size ball of swallow (100g).",
  "white-soup": "Fish or meat, with a fist-size ball of swallow (100g).",
  "miyan-kuka": "Fish, meat, or egg, with a fist-size ball of swallow (100g).",
  "miyan-taushe": "A fist-size ball of swallow (100g) with fish, meat, or egg.",
  "ora-soup": "A fist-size ball of swallow (100g) with fish, meat, or egg.",
  "ofe-owerri": "A fist-size ball of swallow (100g) with plenty of fish or meat.",
  "okazi-soup": "Fish, meat, or egg, with a fist-size ball of swallow (100g) if any.",
  "editan-soup": "Fish, meat, or egg, with a fist-size ball of swallow (100g).",
  "atama-soup": "Fish and seafood, with a fist-size ball of swallow (100g).",
  // replace semicolon joins with full stops or connective words, and pin down
  // the last vague sizes ("small starch", "keep the rice small").
  "ewa-agoyin": "Add fish, meat, or egg. Skip the bread.",
  akara: "Pap is the problem, not the akara. Pair it with vegetables instead.",
  chicken: "It goes with anything. Remove the skin for less fat.",
  eggs: "Vegetables. It is great with two slices of unripe plantain (80g).",
  ekuru: "Ata sauce and fish. Skip the eko.",
  ojojo: "Pepper sauce. Pair it with vegetables.",
  "owho-soup": "Fish or bush meat, with a fist-size ball of swallow (100g) if any.",
  "beef-regular": "Vegetables. Trim the visible fat.",
  // Its own portion field says half a cup is 90g. The card was contradicting itself.
  "native-rice": "It has vegetables and fish in it. Keep the rice to half a cup (about 90g).",
  gizdodo: "The gizzard is the friendly part. Keep the fried plantain to about four slices.",
  "beans-and-plantain": "Use boiled or roasted plantain, not fried. Add fish.",
  "isi-ewu": "Utazi and onions. Eat it on its own.",
  "ram-meat": "Vegetables. Trim the fat.",
  sardine: "With vegetables. Skip the bread if you can.",
  "corned-beef": "With vegetables. Watch the salt.",
  "egusi-seed": "In soups, or roasted as a snack.",
  beer: "Never on an empty stomach. Eat first.",
  "evaporated-milk": "In tea, oats, or pap, with no sugar.",
  "seasoning-cube": "In cooking. Balance it with less added salt.",
};

const portionGuidance = {
  "isi-ewu": "One small bowl. That is about three-quarters of a cup (150g).",
  aadun: "One small piece (about 40g).",
  pito: "One small cup (200ml), rarely.",
  "evaporated-milk": "One tablespoon in tea or pap, with no sugar.",
  sweetener: "A pinch, or one tablet, in place of sugar in tea or coffee.",
  "puff-puff": "Avoid. A rare treat only. One ball the size of a golf ball (about 40g).",
  buns: "Avoid. A rare treat only. One piece the size of a golf ball (about 50g).",
  "soaked-garri": "Avoid. If at all, one small cup (200ml) with no sugar.",
  "glucose-lucozade": "None, unless you are treating a low sugar. Then half a glass (100ml).",
  smoothie: "One small cup (200ml), made from whole fruit with no added sugar.",
  "fried-egg": "One to two eggs, fried in one teaspoon of oil.",
  gizdodo: "A small plate, about one cup (150g). Plantain with the gizzard.",
  // "A rare treat only, one" reads as a broken sentence and sometimes leaves
  // "one" with no noun. Reword to "Avoid. If you do have it, only <amount>."
  "chin-chin": "Avoid. If you do have it, only a small handful (about 30g).",
  "meat-pie": "Avoid. If you do have it, only half of one pie.",
  "sausage-roll": "Avoid. If you do have it, only one roll.",
  doughnut: "Avoid. If you do have it, only half of one.",
  biscuits: "Avoid. If you do have it, only two small biscuits.",
  cake: "Avoid. If you do have it, only one thin slice, about a finger wide.",
  "ice-cream": "Avoid. If you do have it, only one small scoop.",
  "egg-roll": "Avoid. If you do have it, only one egg roll.",
  samosa: "Avoid. If you do have it, only one or two small ones.",
  "spring-roll": "Avoid. If you do have it, only one or two rolls.",
  "fish-roll": "Avoid. If you do have it, only one fish roll.",
  kokoro: "Avoid. If you do have it, only a small handful (about 30g).",
  "coconut-candy": "Avoid. If you do have it, only one small piece.",
  "puff-puff": "Avoid. If you do have it, only one ball the size of a golf ball (about 40g).",
  buns: "Avoid. If you do have it, only one piece the size of a golf ball (about 50g).",
  shawarma: "Avoid. If you do have it, only half of one.",
  "small-chops": "Avoid. If you do have it, only about four pieces.",
  "cassava-chips": "Avoid. If you do have it, only a small handful, about 15 chips (30g).",
};

// Card description line: pin the last vague sizes so it matches the concrete
// portion shown just below it.
const logicNote = {
  "fried-egg": "Egg has no carbs and does not raise your sugar. Fry it in one teaspoon of oil.",
  ketchup: "It has hidden sugar, so use one tablespoon, not a pool.",
  "evaporated-milk": "Unsweetened evaporated milk has natural milk sugar, so use one tablespoon. Avoid the sweetened condensed kind.",
  "coconut-oil": "No sugar impact, but still a heavy fat, so use one teaspoon.",
  sardine: "Oily fish, low in carbs and rich in good fat. Choose the ones packed in water rather than oil.",
  pomegranate: "Has fibre but also natural sugar, so half a cup of seeds is fine.",
  // "keep it small" is vague; point to the exact size shown just below.
  "starch-delta": "Very dense starch, so keep to the size shown below.",
  banana: "The riper the banana, the sweeter it is. Keep to the size shown below.",
  masa: "Fermented rice cakes, soft and starchy. Keep to the size shown below.",
  "eko-agidi": "Set corn starch, smooth and quick to raise sugar. Keep to the size shown below.",
  tamarind: "Sweet-sour pulp, and the sugar adds up. Keep to the size shown below.",
  "corned-beef": "Low in carbs, but processed and salty. Keep to the size shown below and drink water.",
  beer: "Alcohol can drop or raise your sugar, and beer carries carbs. If you drink, keep to the size shown below and eat first.",
  donkwa: "Groundnut and grain snack. The nut is fine, but it has some sugar and grain, so keep to the size shown below.",
  aadun: "Cornmeal snack with oil and pepper. Still corn starch, so keep to the size shown below.",
};

const byId = new Map(foods.map((f) => [f.id, f]));

function apply(map, field) {
  for (const [id, text] of Object.entries(map)) {
    const f = byId.get(id);
    if (!f) {
      console.error("no food with id", id);
      process.exit(1);
    }
    f[field] = text;
  }
}

apply(pairingAdvice, "pairingAdvice");
apply(portionGuidance, "portionGuidance");
apply(logicNote, "logicNote");

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(
  `updated ${Object.keys(pairingAdvice).length} pairings, ${Object.keys(portionGuidance).length} portions, ${Object.keys(logicNote).length} notes. total: ${foods.length}`,
);
