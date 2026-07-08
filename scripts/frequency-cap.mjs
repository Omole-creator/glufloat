// Dietician rule: if a food carries any sugar or starch, it is NOT a daily
// food, even when green. This pass finds every food that used to show
// "You can eat this every day" but is not sugar-free, and writes a specific
// weekly count into its `frequency` so the card echoes a real number.
// Safe id-keyed edit pattern (read -> mutate `frequency` only -> re-serialize).
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

// Mirror of lib/frequency.ts canBeEveryday: the only sugar-free daily foods.
function canBeEveryday(food) {
  if (food.baseVerdict !== "green") return false;
  if (food.role === "vegetable" || food.role === "soup") return true;
  if (food.role === "protein" || food.role === "fat" || food.role === "condiment")
    return true;
  if (food.role === "drink" && food.gi === "low") return true;
  return false;
}

// Would the stored frequency have resolved to "every day" under the old rules?
function wasEveryday(f) {
  const s = f.frequency.toLowerCase();
  if (s.includes("never") || s.includes("avoid")) return false;
  if (s.includes("except") || s.includes("emergency") || s.includes("hypo"))
    return false;
  if (s.includes("rare") || s.includes("treat")) return false;
  if (/(\d+)\s*times?\s*a\s*week/.test(s)) return false;
  if (s.includes("once a week")) return false;
  if (
    s.includes("every day") ||
    s.includes("daily") ||
    s.includes("always") ||
    s.includes("regular") ||
    s.includes("excellent") ||
    s.includes("drink plenty")
  )
    return true;
  if (s.includes("a few times a week")) return false;
  if (s.includes("occasional")) return false;
  if (s.includes("moderate")) return false;
  if (s.includes("good") || s.includes("decent")) return true;
  if (f.baseVerdict === "green") return true; // colour fallback
  return false;
}

// A few hand-picked counts where a food deserves more than the role default.
const OVERRIDES = {
  "moi-moi": "About 4 times a week.",
  ekuru: "About 4 times a week.",
  "cooked-beans": "About 4 times a week.",
  "ewa-agoyin": "About 4 times a week.",
  okpa: "About 4 times a week.",
  "dan-wake": "About 4 times a week.",
  ukwa: "About 4 times a week.",
  "fio-fio": "About 4 times a week.",
  oats: "About 4 times a week.",
  "lime-lemon": "About 5 times a week.", // barely any sugar, just a squeeze
};

// Specific weekly cap, chosen from the food's own numbers so sweeter or
// starchier foods land on fewer days.
function capFor(f) {
  if (OVERRIDES[f.id]) return OVERRIDES[f.id];
  switch (f.role) {
    case "legume":
      return f.carbLoad === "high"
        ? "About 3 times a week."
        : "About 4 times a week.";
    case "dairy":
      return "About 4 times a week.";
    case "fruit":
      return f.gi === "high"
        ? "About 2 times a week."
        : "About 3 times a week.";
    case "sugar":
      return "Only once in a while, about once a month.";
    default:
      // starch, tubers, grains, and anything else that slipped through.
      return f.gi === "high"
        ? "About 2 times a week."
        : "About 3 times a week.";
  }
}

const changed = [];
for (const f of foods) {
  if (!canBeEveryday(f) && wasEveryday(f)) {
    const cap = capFor(f);
    if (f.frequency !== cap) {
      f.frequency = cap;
      changed.push(`${f.id} [${f.role}/${f.gi}] -> ${cap}`);
    }
  }
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`capped ${changed.length} foods:`);
console.log(changed.join("\n"));
