// Adds Pupuru, requested by the founder 2026-11-06. Safe append, same pattern as
// add-foods-2026-10.mjs. Nutrition is NOT written here: food-composition.mjs
// owns it. Evidence and why the 86 is treated with care: docs/EVIDENCE.md §17.
import { readFileSync, writeFileSync } from "node:fs";
const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));
const food = {
  id: "pupuru",
  name: "Pupuru (Ikale fufu)",
  aliases: ["pupuru", "ikale fufu", "cassava poundo", "ikwurikwu", "kpukpuru"],
  category: "swallow",
  role: "starch",
  carbLoad: "high",
  gi: "high",
  baseVerdict: "yellow",
  portionGuidance: "One ball the size of your fist. That is about half a cup of the cooked swallow (100g).",
  pairingAdvice: "Egusi soup, bitterleaf soup, or okra soup, with fish or chicken.",
  frequency: "About 4 times a week.",
  logicNote: "Cassava soaked, dried over smoke, and cooked into a swallow. It raises sugar fast, like fufu. Keep to the size shown below.",
  tags: ["local", "staple"],
  portionIcon: "fist",
};
if (foods.some((f) => f.id === food.id)) {
  console.log("pupuru is already there");
} else {
  foods.push(food);
  writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
  console.log("added pupuru, now", foods.length);
}
