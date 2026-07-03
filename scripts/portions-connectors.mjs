import { readFileSync, writeFileSync } from "node:fs";
const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

// Make it clear that the second measure is the SAME amount, said another way,
// instead of looking like two different things separated by a comma.
function clarify(p) {
  return p
    .replaceAll(", like a deck of cards", ". That is the size of a deck of cards")
    .replaceAll(", each the size of a matchbox", ". Each is about the size of a matchbox")
    .replaceAll(", a cupped palm", ". That is a cupped palm")
    .replaceAll(", about ", ". That is about ")
    .replaceAll(", the size of ", ". That is the size of ");
}

const before = foods.map((f) => f.portionGuidance);
for (const f of foods) f.portionGuidance = clarify(f.portionGuidance);

// print only the ones that changed, for review
foods.forEach((f, i) => {
  if (before[i] !== f.portionGuidance) {
    console.log(`\n${f.name}`);
    console.log("  -", before[i]);
    console.log("  +", f.portionGuidance);
  }
});

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`\nUpdated ${foods.filter((f, i) => before[i] !== f.portionGuidance).length} of ${foods.length}.`);
