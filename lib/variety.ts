import { FOODS } from "./search";
import { togetherFrequency } from "./frequency";
import type { Food } from "./types";

/**
 * Snacks swap to a whole food eaten as it is, between meals: cheap, sold
 * everywhere, no cooking, nothing to fry (2026-10-10). Inside the "snack"
 * category the only green foods were suya and nkwobi, so a puff-puff used to be
 * told to try suya (processed meat, the reason it left the extras card) or cow
 * foot. That is not a swap a dietitian would ever make. A snack is replaced by
 * a snack, not by meat. Order is the order shown when carbs tie.
 */
const SNACK_SWAPS = ["groundnut", "tiger-nut", "garden-egg", "cashew-nut", "cucumber"];

/**
 * Snack-category foods that are really a meal (eaten with soup or as
 * breakfast), so a handful of groundnuts is not a fair swap for them.
 */
const MEAL_LIKE_SNACKS = new Set(["masa", "abacha", "tapioca", "potato-salad", "pancakes", "waffles"]);

/**
 * The kunu drinks get no zobo swap (co-founder dietitian, 2026-10-12: someone
 * who wants kunu is not helped by being told to drink zobo). Instead they are
 * told to sweeten it with fruit in place of sugar: one date blended in, or half
 * a banana. The date and the banana keep their own cards' rules, so the count
 * is the stricter of the drink and the fruit (`togetherFrequency`).
 */
const KUNU_IDS = new Set(["kunu", "kunu-aya", "kunun-gyada"]);

export interface SweetenTip {
  /** The fruit to blend in, so its own card can be opened. */
  fruit: Food;
  /** The whole instruction, in plain words. */
  text: string;
}

export function kunuSweetenTips(food: Food): SweetenTip[] {
  if (!KUNU_IDS.has(food.id)) return [];
  const date = FOODS.find((f) => f.id === "dates");
  const banana = FOODS.find((f) => f.id === "banana");
  const tips: SweetenTip[] = [];
  if (date) {
    tips.push({
      fruit: date,
      text: `Make it with no sugar. If you want it sweet, blend one date into it. Drink it this way ${togetherFrequency([food, date])}.`,
    });
  }
  if (banana) {
    tips.push({
      fruit: banana,
      text: `Or blend half of one medium banana into it instead. Drink it this way ${togetherFrequency([food, banana])}.`,
    });
  }
  return tips;
}

/**
 * Safe alternatives to a food the person eats a lot: other foods in the SAME
 * group that the app marks green. Same group means the swap is a real one (a
 * swallow for a swallow, a soup for a soup), never an odd pairing. This lets the
 * app expand a person's rotation instead of only repeating what they already
 * know, which is a different kind of value than a one-off lookup.
 *
 * A swap never carries its own red warning box (`healthNote`): "safer" has to
 * be safer for everyone, including someone with high blood pressure, high
 * cholesterol or kidney problems. That rules out red, organ and processed meat,
 * oily soups and fried food as suggestions, even when they are green for sugar.
 */
export function saferSwaps(food: Food, limit = 3, turn = 0): Food[] {
  if (KUNU_IDS.has(food.id)) return [];
  if (food.category === "swallow") return slowerSwallows(food, turn).slice(0, limit);
  let candidates: Food[];
  if (food.category === "snack") {
    if (MEAL_LIKE_SNACKS.has(food.id)) return [];
    candidates = SNACK_SWAPS.map((id) => FOODS.find((f) => f.id === id)).filter(
      (f): f is Food => !!f && f.id !== food.id && f.baseVerdict === "green" && !f.healthNote,
    );
  } else {
    candidates = FOODS.filter(
      (f) =>
        f.id !== food.id &&
        f.category === food.category &&
        f.baseVerdict === "green" &&
        !f.healthNote,
    );
  }
  // When both foods carry a measured carb weight for their own real serving,
  // prefer the closest match first: a genuine like-for-like swap (the exchange-
  // list idea a Nigerian dietitian already uses with patients), not just any
  // green food that happens to share the category. A stable sort keeps the
  // SNACK_SWAPS order on a tie.
  if (food.carbG != null) {
    candidates.sort((a, b) => {
      const da = a.carbG == null ? Infinity : Math.abs(a.carbG - food.carbG!);
      const db = b.carbG == null ? Infinity : Math.abs(b.carbG - food.carbG!);
      return da - db;
    });
  }
  return candidates.slice(0, limit);
}

/**
 * The swallows that really raise sugar more slowly, in a fixed order (co-founder
 * dietitian + founder, 2026-10-12). Oat swallow is the only green one; plantain
 * amala, cocoyam fufu and acha (medium since 2026-10-24) are yellow but medium, so still slower than eba,
 * pounded yam, fufu or tuwo. Swapping eba for tuwo would be a sideways move, so
 * no other swallow is ever offered here.
 */
const SLOWER_SWALLOWS = ["oat-swallow", "amala-plantain", "cocoyam-fufu", "acha"];
const GI_RANK: Record<Food["gi"], number> = { low: 0, medium: 1, high: 2 };

/**
 * The slower swallows for this swallow, rotated by `turn` so each takes its
 * turn first and oat swallow is not the only one ever shown (founder: "evenly
 * distributed"). Only swallows slower than the one searched.
 */
function slowerSwallows(food: Food, turn: number): Food[] {
  const list = SLOWER_SWALLOWS.map((id) => FOODS.find((f) => f.id === id)).filter(
    (f): f is Food => !!f && f.id !== food.id && GI_RANK[f.gi] < GI_RANK[food.gi] && !f.healthNote,
  );
  if (list.length === 0) return list;
  const k = ((turn % list.length) + list.length) % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

const SWAP_TURN_KEY = "gf_swallow_swap_turn";

/**
 * The next turn for the swallow swap, counted on this device so the three
 * slower swallows come round evenly, one per look. Storage blocked: turn 0.
 */
export function nextSwallowSwapTurn(): number {
  try {
    const n = Number(localStorage.getItem(SWAP_TURN_KEY) ?? "0") || 0;
    localStorage.setItem(SWAP_TURN_KEY, String(n + 1));
    return n;
  } catch {
    return 0;
  }
}

/** True when the swap comes from a different food group (a snack swapped for
 *  groundnut), so the card must not say "in the same food group". */
export function isCrossGroupSwap(food: Food, swap: Food): boolean {
  return food.category !== swap.category;
}

/** The same, found by the food's name (as stored in the history log). */
export function swapsByName(name: string, limit = 3): { food: Food; swaps: Food[] } | null {
  const food = FOODS.find((f) => f.name === name);
  if (!food) return null;
  const swaps = saferSwaps(food, limit);
  return swaps.length > 0 ? { food, swaps } : null;
}
