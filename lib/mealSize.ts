import { FOODS } from "./search";

/**
 * Break a saved check into its foods, each with its portion size, so the doctor
 * sees HOW MUCH was eaten, not just the name of the food.
 *
 * A single check is one food (its name is the label, and names can contain
 * commas, e.g. "Seeds (pumpkin, sunflower, flax, chia)", so it is never split).
 * A meal check is the foods joined by ", ", so it is split back apart. A name we
 * cannot find (an odd edge case) just comes back with no size rather than break.
 */
export interface SizedFood {
  name: string;
  size: string;
}

export function sizedFoods(
  label: string,
  kind: "single" | "meal",
): SizedFood[] {
  const names =
    kind === "single"
      ? [label.trim()]
      : label
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  return names.map((name) => {
    const f = FOODS.find((x) => x.name === name);
    return { name, size: f?.portionGuidance ?? "" };
  });
}
