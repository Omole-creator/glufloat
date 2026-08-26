import type { NamedMeal } from "./mealtime";

/**
 * Which of breakfast/lunch/dinner a person actually eats. Free on every tier,
 * including Basic — this is not guidance, it is not showing someone a meal
 * they do not eat, so it does not belong behind a paywall.
 */

const ORDER: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const VALID = new Set<string>(ORDER);

/** Which meals this person eats. Defaults to all three when nothing is set,
 * so anyone who has not touched this setting sees exactly what they see today. */
export function normalizeMealPattern(pattern: string[] | null | undefined): NamedMeal[] {
  const clean = (pattern ?? []).filter((m): m is NamedMeal => VALID.has(m));
  return clean.length > 0 ? clean : ORDER;
}

/**
 * Roll forward from `from` to the next meal this person actually eats,
 * wrapping breakfast -> lunch -> dinner -> breakfast. Always terminates:
 * normalizeMealPattern guarantees at least one meal is eaten.
 */
export function nextEatenMeal(pattern: string[] | null | undefined, from: NamedMeal): NamedMeal {
  const eaten = normalizeMealPattern(pattern);
  const startIdx = ORDER.indexOf(from);
  for (let i = 0; i < ORDER.length; i++) {
    const candidate = ORDER[(startIdx + i) % ORDER.length];
    if (eaten.includes(candidate)) return candidate;
  }
  return from;
}
