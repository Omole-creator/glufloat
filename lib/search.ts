import foodsData from "@/data/foods.json";
import type { Food } from "./types";

export const FOODS = foodsData as Food[];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").trim();

/**
 * Instant in-memory search over names + aliases.
 * Ranking: exact alias/name match > startsWith > word-startsWith > includes.
 */
export function searchFoods(query: string, limit = 8): Food[] {
  const q = norm(query);
  if (q.length < 2) return [];

  const scored: { food: Food; rank: number }[] = [];

  for (const food of FOODS) {
    const name = norm(food.name);
    const terms = [name, ...food.aliases.map(norm)];
    let rank = Infinity;

    for (const t of terms) {
      if (t === q) rank = Math.min(rank, 0);
      else if (t.startsWith(q)) rank = Math.min(rank, 1);
      else if (t.split(/[\s/(),-]+/).some((w) => w.startsWith(q)))
        rank = Math.min(rank, 2);
      else if (t.includes(q)) rank = Math.min(rank, 3);
    }

    if (rank !== Infinity) scored.push({ food, rank });
  }

  return scored
    .sort((a, b) => a.rank - b.rank || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map((s) => s.food);
}

/**
 * The other name a food was found by, so the list can say "Same advice for
 * Bonga" when somebody typed bonga and the card is called Smoked Fish. The
 * names on one card share a sugar effect and a safe size, not a look, so the
 * words say "same advice", never "same food". `shown` is
 * the name on screen (cleanFoodName, passed in because foodName.ts imports
 * this file). Null when that name already matches, so "eba" never reads
 * "Same advice for eba" under "Garri or Eba", and null for a match in the middle
 * of a word ("eba" inside "prawn kebab"), which would only confuse. Display
 * only: it never changes which foods are found or their order.
 */
export function matchedAlias(food: Food, query: string, shown: string): string | null {
  const q = norm(query);
  if (q.length < 2) return null;
  const hit = (t: string) =>
    t === q ? 0
    : t.startsWith(q) ? 1
    : t.split(/[\s/(),-]+/).some((w) => w.startsWith(q)) ? 2
    : Infinity;
  if (hit(norm(shown)) !== Infinity || norm(shown).includes(q)) return null;
  let best: string | null = null;
  let bestRank = Infinity;
  for (const a of food.aliases) {
    const r = hit(norm(a));
    if (r < bestRank || (r === bestRank && best !== null && a.length < best.length)) {
      best = a;
      bestRank = r;
    }
  }
  return best === null ? null : best.charAt(0).toUpperCase() + best.slice(1);
}

export function getFood(id: string): Food | undefined {
  return FOODS.find((f) => f.id === id);
}
