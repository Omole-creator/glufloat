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

export function getFood(id: string): Food | undefined {
  return FOODS.find((f) => f.id === id);
}
