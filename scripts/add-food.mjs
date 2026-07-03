import { readFileSync, writeFileSync } from "node:fs";
const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

const add = [
  {
    id: "beef-regular",
    name: "Beef / Meat (regular cut)",
    aliases: ["beef", "meat", "red meat", "assorted meat", "orisirisi", "cow meat"],
    category: "protein",
    role: "protein",
    carbLoad: "low",
    gi: "low",
    baseVerdict: "green",
    portionGuidance: "One palm-size piece, like a deck of cards (90g).",
    pairingAdvice: "Vegetables; trim the visible fat.",
    frequency: "Good regular protein.",
    logicNote: "Meat has no carbs, so it does not raise blood sugar. Trim the fat, as fatty cuts are heavy for the heart.",
    tags: ["local"],
  },
];

const ids = new Set(foods.map((f) => f.id));
for (const f of add) {
  if (ids.has(f.id)) {
    console.error("duplicate", f.id);
    process.exit(1);
  }
}
const out = [...foods, ...add];
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
console.log("total:", out.length);
