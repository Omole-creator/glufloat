// Dietician feedback:
//   B. "Eat it with protein" is not specific. Name the protein: replace the
//      bare word "protein" with "fish, chicken, or an egg", and pin any leftover
//      vague "small swallow" to a real size.
//   D. Nobody eats soup alone, so the swallow they pick matters a lot. On soups
//      that are eaten with swallow, add a plain reminder to that effect.
// Only the `pairingAdvice` field is touched. Read -> mutate -> re-serialize.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

const SWALLOW_NUDGE =
  " Remember, the swallow you pick matters as much as the soup.";

let proteinFixed = 0;
let soupFixed = 0;

for (const f of foods) {
  let p = f.pairingAdvice || "";
  // Strip any earlier swallow reminder so re-runs stay clean and never double up.
  p = p.replace(/\s*Remember, the swallow you pick[^]*$/i, "");
  const before = p;

  // Pin any remaining vague "small swallow".
  p = p.replace(/\bsmall swallow\b/gi, "a fist-size ball of swallow (100g)");

  // Make the generic protein suggestion specific.
  p = p.replace(/\ba protein\b/gi, "fish, chicken, or an egg");
  p = p.replace(/\bprotein\b/gi, "fish, chicken, or an egg");

  // A replacement at the very start can drop the leading capital.
  if (p.length > 0) p = p.charAt(0).toUpperCase() + p.slice(1);

  if (p !== before) proteinFixed += 1;

  // Soup + swallow reminder (feedback D).
  if (
    f.role === "soup" &&
    /\bswallow\b/i.test(p) &&
    !/you pick/i.test(p)
  ) {
    p = p.replace(/\s+$/, "") + SWALLOW_NUDGE;
    soupFixed += 1;
  }

  f.pairingAdvice = p;
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(
  `pairing edits: ${proteinFixed} protein/size fixes, ${soupFixed} soup swallow reminders. total foods: ${foods.length}`,
);
