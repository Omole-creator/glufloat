/**
 * A clean, single name for a food when it is being SUGGESTED (the daily meal
 * card). Several foods list their options in brackets, e.g.
 * "Fish (Titus / Mackerel / Tilapia / Catfish)". A list of choices is confusing
 * when the app is telling someone what to eat, so we drop the options and keep
 * the plain name ("Fish"). The full name still shows on the food's own card and
 * in the meal builder, where the detail belongs.
 *
 * Only a bracket that lists OPTIONS (contains a slash) is stripped. A plain
 * explanatory bracket like "Oats (plain)" or "Moi Moi (bean pudding)" is kept.
 */
export function shortFoodName(name: string): string {
  const m = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m && m[2].includes("/")) return m[1].trim();
  return name;
}
