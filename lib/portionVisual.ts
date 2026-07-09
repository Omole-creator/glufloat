import type { Food, PortionKey } from "./types";

export type { PortionKey };

const CAPTIONS: Record<PortionKey, string> = {
  fist: "About the size of your fist",
  "half-cup": "Half a cup. Fill a tea cup halfway",
  "three-quarter-cup": "Almost a full cup",
  cup: "One full cup",
  bowl: "One small bowl",
  cards: "As big as your palm",
  handful: "One handful",
  matchbox: "Two pieces, each the size of a matchbox",
  slice: "One slice",
  "half-fruit": "Half of one fruit",
  "whole-fruit": "One whole fruit",
  berries: "One handful of berries",
  pieces: "One to two pieces",
  glass: "One glass",
  spoon: "One to two spoons",
  eggs: "Two pieces, each the size of an egg",
  cob: "Half a cob",
  palm: "One wrap, as big as your palm",
  plantain: "Half of one plantain",
  pinch: "Just a pinch, for taste",
  sticks: "Two sticks",
  avoid: "None. Best to skip this",
  free: "Eat as much as you like",
  generic: "See the exact amount below",
};

/**
 * A guess at the picture, from the wording of the portion text. Every food in
 * `data/foods.json` already carries a deliberate `portionIcon`, so this only
 * runs for a food added later that has not been given one yet. Order matters:
 * the first match wins, so the narrow rules come before the broad ones.
 */
function pick(p: string, food: Food): PortionKey {
  if (food.baseVerdict === "red" && /^(avoid|none)\b/.test(p)) return "avoid";
  if (p.includes("eat freely") || p.includes("as much as you like")) {
    return "free";
  }
  if (p.includes("fist")) return "fist";
  if (p.includes("cob")) return "cob";
  if (p.includes("matchbox")) return "matchbox";
  if (p.includes("pinch")) return "pinch";

  // Fruit shapes first: a fruit measured in cups is still a fruit.
  if (food.role === "fruit") {
    if (p.includes("grape") || p.includes("berr")) return "berries";
    if (p.includes("plantain") || p.includes("banana")) return "plantain";
    if (p.includes("half of one") || p.includes("half of a")) return "half-fruit";
    if (p.includes("piece")) return "pieces";
    if (p.includes("whole") || p.includes("one small") || p.includes("medium")) {
      return "whole-fruit";
    }
  }

  if (p.includes("egg")) return "eggs";
  if (p.includes("deck of cards") || p.includes("palm-size")) return "cards";
  if (p.includes("as big as your palm")) return "cards";
  if (p.includes("size of your palm")) return "palm";
  if (p.includes("handful")) return "handful";
  if (p.includes("slice")) return "slice";
  if (p.includes("bowl") || p.includes("plate")) return "bowl";
  if (p.includes("teaspoon") || p.includes("tablespoon")) return "spoon";
  if (p.includes("ml") || p.includes("glass") || p.includes("drink plenty")) {
    return "glass";
  }
  if (p.includes("tennis ball") || p.includes("half a cup")) return "half-cup";
  if (p.includes("three-quarters of a cup")) return "three-quarter-cup";
  if (p.includes("pod")) return "handful";
  if (p.includes("cup")) return "cup";
  return "generic";
}

export function portionVisual(food: Food): { key: PortionKey; caption: string } {
  // The stored picture is the truth. `pick` is only the net for a new food.
  const key = food.portionIcon ?? pick(food.portionGuidance.toLowerCase(), food);
  return { key, caption: CAPTIONS[key] };
}
