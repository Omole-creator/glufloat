import { FOODS } from "./search";
import { SOUP_DISPLAY } from "./soupNames";
import type { Food } from "./types";

/**
 * How a food NAME is shown to a person. The data keeps its full, searchable name
 * (with brackets and aliases) so search and the audits are untouched; this is
 * purely the display layer, applied EVERYWHERE a name is shown (search, the meal
 * builder, the daily meal, the doctor record, the share text).
 *
 * Founder rule, said more than once: a trailing state in brackets reads badly.
 * "Oats (plain)" must show as "Plain Oats", not "Oats (plain)". So:
 *   - a bracket that is a single STATE word ("plain", "boiled", "ripe", ...) is
 *     moved to the front: "Oats (plain)" -> "Plain Oats", "Eggs (boiled)" ->
 *     "Boiled Eggs".
 *   - a bracket that lists OPTIONS (has a slash) is dropped: "Fish (Titus /
 *     Mackerel / ...)" -> "Fish", "Chicken (grilled / boiled)" -> "Chicken".
 *   - any other bracket is a useful clarifier and is kept ("Amala (yam flour)",
 *     "Plain Yogurt (no sugar)").
 * A slash between two real names ("Garri / Eba", "Tea / Coffee") reads as "or".
 */
const PREFIX_STATES = new Set([
  "plain",
  "boiled",
  "ripe",
  "unripe",
  "lean",
  "whole",
  "fresh",
  "roasted",
  "grilled",
]);

/**
 * Display names that the rules above would get wrong. The fish card's numbers
 * are for oily fish (founder, 2026-10-24), so it names those two; tilapia and
 * catfish still find this card through its aliases.
 */
const NAME_DISPLAY: Record<string, string> = {
  "Fish (Titus / Mackerel / Tilapia / Catfish)": "Fish (Titus or Mackerel)",
  // The slash rule below drops "(unripe / green)", so both plantains read
  // "Boiled Plantain" and a swap from one to the other looked like nothing
  // happened (founder, 2026-10-26).
  "Boiled Plantain (unripe / green)": "Boiled Unripe Plantain",
  "Boiled Plantain (ripe / yellow)": "Boiled Ripe Plantain",
};

export function cleanFoodName(name: string): string {
  if (SOUP_DISPLAY[name]) return SOUP_DISPLAY[name];
  if (NAME_DISPLAY[name]) return NAME_DISPLAY[name];
  let out = name;
  const m = name.match(/^(.*?)\s*\(([^)]*)\)(.*)$/);
  if (m) {
    const before = m[1].trim();
    const paren = m[2].trim();
    const after = m[3].trim();
    if (paren.includes("/")) {
      // options list -> drop the bracket entirely
      out = `${before}${after ? " " + after : ""}`.trim();
    } else if (PREFIX_STATES.has(paren.toLowerCase())) {
      // single state -> move to the front
      const adj = paren.charAt(0).toUpperCase() + paren.slice(1).toLowerCase();
      out = `${adj} ${before}${after ? " " + after : ""}`.trim();
    }
    // else: keep the whole name (useful clarifier)
  }
  // "Garri / Eba" -> "Garri or Eba" (a slash between two names reads as "or").
  return out.replace(/\s*\/\s*/g, " or ");
}

/** The display name for a Food object. */
export function displayName(food: Food): string {
  return cleanFoodName(food.name);
}

/**
 * Clean a stored history label (one food, or a comma-joined meal) for display,
 * by swapping each raw food name inside it for its clean form. Used for the
 * doctor record, whose rows were saved with the raw names.
 */
export function displayLabel(label: string): string {
  let out = label;
  for (const f of FOODS) {
    const clean = cleanFoodName(f.name);
    if (clean !== f.name && out.includes(f.name)) {
      out = out.split(f.name).join(clean);
    }
  }
  return out;
}
