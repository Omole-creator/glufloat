import { oatPlateIds, oatPlateWith, swapInPlate, type MealIdea, type OatChange, type SwapContext } from "./nextMeal";
import type { NamedMeal } from "./mealtime";

/**
 * The one swap a person made on today's blue card ("I don't have this"),
 * remembered on the device for that meal on that day. Both the blue card
 * (components/TodaysMeal.tsx) and the extras sizing (lib/useTodaysCalories.ts)
 * read it through `withStoredSwap`, so the plate and the extras card always
 * agree on what is being eaten. Any other day or meal reads as no swap.
 */
const KEY = "gf_meal_swap";
export const SWAP_CHANGED = "gf-meal-swap-changed";

/** `oat` is set instead of from/to when the soup or protein of an oat swallow plate was changed. */
type Stored = { day: string; meal: NamedMeal; plate: number; from: string; to: string; turn: number; oat?: OatChange };

function read(): Stored | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null") as Stored | null;
  } catch {
    return null;
  }
}

/** Remember a swap (or forget it with null) and tell the page. */
export function writeSwap(s: Stored | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the swap lasts until the page is closed */
  }
  window.dispatchEvent(new Event(SWAP_CHANGED));
}

/** `idea` with today's remembered swap applied, when it was made on this same plate. */
export function withStoredSwap(meal: NamedMeal, day: string, idea: MealIdea, ctx: SwapContext): MealIdea {
  const s = read();
  if (!s || s.day !== day || s.meal !== meal || s.plate !== idea.index) return idea;
  if (s.oat) return oatPlateWith(idea, s.oat, ctx);
  return swapInPlate(meal, idea, s.from, ctx, s.turn) ?? idea;
}

/** The food ids of the plate shown for `meal` today, with today's swap applied. */
export function shownPlateWithSwap(meal: NamedMeal, day: string, index: number, plate: string[]): string[] {
  const s = read();
  if (!s || s.day !== day || s.meal !== meal || s.plate !== index) return plate;
  if (s.oat) return oatPlateIds(plate, s.oat);
  return plate.map((id) => (id === s.from ? s.to : id));
}
