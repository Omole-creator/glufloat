import type { Food } from "./types";

export type PortionKey =
  | "fist"
  | "half-cup"
  | "three-quarter-cup"
  | "cup"
  | "bowl"
  | "cards"
  | "handful"
  | "matchbox"
  | "slice"
  | "half-fruit"
  | "whole-fruit"
  | "glass"
  | "spoon"
  | "eggs"
  | "cob"
  | "avoid"
  | "free"
  | "generic";

const CAPTIONS: Record<PortionKey, string> = {
  fist: "About the size of your fist",
  "half-cup": "About half a cup (a tennis ball)",
  "three-quarter-cup": "About three-quarters of a cup",
  cup: "About one cup",
  bowl: "One small bowl",
  cards: "Palm-size, like a deck of cards",
  handful: "One small handful",
  matchbox: "About two matchbox-size pieces",
  slice: "One slice",
  "half-fruit": "Half of one",
  "whole-fruit": "One whole fruit",
  glass: "About one glass",
  spoon: "One to two spoons",
  eggs: "One to two eggs",
  cob: "Half a cob",
  avoid: "None. Best to skip this",
  free: "Eat freely",
  generic: "See the exact amount below",
};

function pick(p: string, food: Food): PortionKey {
  if (p.includes("avoid") || p.includes("none.")) return "avoid";
  if (p.includes("fist")) return "fist";
  if (p.includes("cob")) return "cob";
  if (p.includes("matchbox")) return "matchbox";
  if (p.includes("deck of cards") || p.includes("palm-size")) return "cards";
  if (p.includes("handful")) return "handful";
  if (p.includes("egg") && food.role === "protein") return "eggs";
  if (p.includes("slice")) return "slice";
  if (p.includes("bowl") || p.includes("serving spoon")) return "bowl";
  if (p.includes("teaspoon") || p.includes("tablespoon")) return "spoon";
  if (p.includes("ml") || p.includes("glass") || p.includes("drink plenty"))
    return "glass";
  if (p.includes("tennis ball") || p.includes("half a cup")) return "half-cup";
  if (p.includes("three-quarters of a cup")) return "three-quarter-cup";
  if (p.includes("eat freely")) return "free";
  if (p.includes("half of one") || p.includes("half of a")) return "half-fruit";
  if (
    p.includes("whole") ||
    p.includes("one small") ||
    p.includes("small fruits") ||
    p.includes("one to two small") ||
    p.includes("one to two fruits")
  )
    return "whole-fruit";
  if (p.includes("cup")) return "cup";
  return "generic";
}

export function portionVisual(food: Food): { key: PortionKey; caption: string } {
  const key = pick(food.portionGuidance.toLowerCase(), food);
  return { key, caption: CAPTIONS[key] };
}
