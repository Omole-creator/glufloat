// Adds Banga Rice — rice cooked directly in palm-fruit (banga) sauce with
// fish, meat and cow skin, distinct from Banga Soup (which is a soup eaten
// WITH a separate swallow/rice) and from Native Rice (which uses plain palm
// oil, not the palm-fruit extract). A real, well-documented Niger-Delta
// dish (Urhobo) that was missing from the 327-food set — found while
// cross-checking Nigerian-dish sources for the calorie/macro data pass (see
// scripts/food-composition.mjs). Safe append pattern, same as add-food.mjs.
import { readFileSync, writeFileSync } from "node:fs";
const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

const add = [
  {
    id: "banga-rice",
    name: "Banga Rice (palm fruit rice)",
    aliases: ["banga rice", "rice in banga sauce", "palm fruit rice"],
    category: "rice",
    role: "starch",
    carbLoad: "high",
    gi: "high",
    baseVerdict: "yellow",
    portionGuidance: "Half a cup of cooked rice. That is about the size of a tennis ball (90g).",
    pairingAdvice: "It already has fish and meat in it. Keep the rice to half a cup (about 90g).",
    frequency: "About 2 times a week.",
    logicNote: "A rice dish cooked in palm fruit sauce with fish and meat. It is full of oil, and a big plate of rice still pushes your sugar up fast.",
    tags: ["local", "delta"],
    healthNote: "This dish is cooked with a lot of palm oil. If you have high blood pressure, high cholesterol, or kidney problems, use less oil and go easy on the red meat.",
    portionIcon: "half-cup",
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
