import type { Food } from "./types";

/**
 * Nut allergy (founder, 2026-11-06). A person's own answer, never a diagnosis.
 * Stored in profiles.nut_allergies (supabase/nut-allergy-schema.sql):
 *   null          not answered yet
 *   ["none"]      no
 *   ["all"]       not sure, or does not know which: treated as every nut
 *   ["groundnut", ...]  the ones they picked
 *
 * These foods leave the blue card, the extras, the snacks and every swap as a
 * hard rule, through the same `avoid` list a dietitian's left-out foods use
 * (`withNutAllergies`). Search still shows them, with a warning, because a card
 * is how somebody finds out what a food is.
 */
export const NUT_NONE = "none";
export const NUT_ALL = "all";

export const NUT_OPTIONS: { value: string; label: string }[] = [
  { value: "groundnut", label: "Groundnut (peanut)" },
  { value: "cashew", label: "Cashew" },
  { value: "walnut", label: "Walnut" },
  { value: "almond", label: "Almond" },
  { value: "coconut", label: "Coconut" },
  { value: "tiger-nut", label: "Tiger nut" },
  { value: "other", label: "Other nuts" },
];

/** Every food holding each nut, hidden ones included (groundnut soup, kuli kuli). */
const FOODS_WITH: Record<string, string[]> = {
  groundnut: [
    "groundnut", "peanut-butter", "groundnut-soup", "kuli-kuli", "donkwa", "peanut-candy",
    "kunun-gyada", "vegetable-oil", "mixed-nuts", "okpa",
  ],
  cashew: ["cashew-nut", "cashew-fruit", "mixed-nuts"],
  walnut: ["walnut", "mixed-nuts"],
  almond: ["almond", "mixed-nuts"],
  coconut: ["coconut", "coconut-water", "coconut-rice", "coconut-bread", "coconut-candy", "coconut-oil"],
  "tiger-nut": ["tiger-nut", "kunu-aya"],
  other: ["mixed-nuts"],
};

/** Words a food's "Eat it with" line may use for each nut. */
const PAIRING_WORDS: Record<string, { re: RegExp; name: string }> = {
  groundnut: { re: /groundnut|peanut/i, name: "groundnut" },
  cashew: { re: /cashew/i, name: "cashew" },
  walnut: { re: /walnut/i, name: "walnut" },
  almond: { re: /almond/i, name: "almond" },
  coconut: { re: /coconut/i, name: "coconut" },
  "tiger-nut": { re: /tiger nut/i, name: "tiger nut" },
};

/** The nuts this answer covers. */
function nutsIn(list: string[] | null | undefined): string[] {
  if (!list || list.includes(NUT_NONE)) return [];
  return list.includes(NUT_ALL) ? Object.keys(FOODS_WITH) : list;
}

/** The food ids this person must not be offered. */
export function blockedFoods(list: string[] | null | undefined): Set<string> {
  return new Set(nutsIn(list).flatMap((n) => FOODS_WITH[n] ?? []));
}

/** Every food id named here, for the test. */
export function allNutFoodIds(): string[] {
  return [...new Set(Object.values(FOODS_WITH).flat())];
}

/** A dietitian's rules with this person's nuts added to what is left out. */
export function withNutAllergies<T extends { avoid: string[]; prefer: string[] }>(
  rules: T | null,
  list: string[] | null | undefined,
): T | { avoid: string[]; prefer: string[] } | null {
  const blocked = blockedFoods(list);
  if (blocked.size === 0) return rules;
  return {
    ...(rules ?? {}),
    avoid: [...new Set([...(rules?.avoid ?? []), ...blocked])],
    prefer: (rules?.prefer ?? []).filter((id) => !blocked.has(id)),
  };
}

/** The warning on a food's card, or null. Plain words, shown in the red box. */
export function nutAllergyNote(food: Pick<Food, "id" | "pairingAdvice">, list: string[] | null | undefined): string | null {
  if (blockedFoods(list).has(food.id)) return "You told us nuts like this can harm you. Do not eat this.";
  for (const n of nutsIn(list)) {
    const w = PAIRING_WORDS[n];
    if (w && w.re.test(food.pairingAdvice ?? "")) return `You told us ${w.name} can harm you. Leave it out when you eat this.`;
  }
  return null;
}

/** The answer in words, for My details and the clinician's page. Null when not answered. */
export function nutAllergyLabel(list: string[] | null | undefined): string | null {
  if (!list || list.length === 0) return null;
  if (list.includes(NUT_NONE)) return "No";
  if (list.includes(NUT_ALL)) return "Not sure, so all nuts are left out";
  return list.map((v) => NUT_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ");
}
