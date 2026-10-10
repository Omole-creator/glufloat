"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Pointer } from "lucide-react";
import { matchedAlias, searchFoods } from "@/lib/search";
import type { Food } from "@/lib/types";
import VerdictCard from "./VerdictCard";
import { events } from "@/lib/analytics";
import StartMealSheet from "./StartMealSheet";
import { trackUsage } from "@/lib/usage";
import { cleanFoodName } from "@/lib/foodName";
import MealsWithFood from "./MealsWithFood";

// Access is gated upstream at /app, so this panel is always fully open here.
export default function SearchPanel({
  initialFood = null,
  onBuildMeal,
  onOpenPlate,
  personalize = false,
}: {
  /** When set (e.g. tapping a recent food), open straight to that food's card. */
  initialFood?: Food | null;
  /** Opens "Check a meal" with this food, from the sugar-test note's
   *  "Make this meal better" (there is no button for it on the card: founder,
   *  2026-10-08, "if a user wants to use the check meal feature, they would"). */
  onBuildMeal?: (food: Food) => void;
  /** A blue-card plate tapped under the card: open it in "Check a meal". */
  onOpenPlate?: (foods: Food[]) => void;
  /** canUseGoalPersonalization(access): size the plates to the calorie target. */
  personalize?: boolean;
} = {}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Food | null>(null);
  // The other name the person found this card by ("Bonga" for Smoked Fish),
  // so the card can say the advice is the same even though the picture shows
  // the card's own food. Null when they found it by its own name.
  const [pickedAs, setPickedAs] = useState<string | null>(null);
  const [ate, setAte] = useState(false);

  // Open to a food handed in from outside.
  useEffect(() => {
    if (initialFood) {
      setPicked(initialFood);
      setPickedAs(null);
      setAte(false);
      setQuery("");
    }
  }, [initialFood]);

  const results = useMemo(() => searchFoods(query), [query]);

  const pick = (food: Food, as: string | null = null) => {
    events.foodChecked(food.name);
    void trackUsage("food_search");
    // Checking a food is NOT eating it. Nothing is saved to the food record here;
    // the person logs it only if they tap "I ate this" below.
    setPicked(food);
    setPickedAs(as);
    setAte(false);
    setQuery("");
  };

  // "I ate this" opens the save sheet (StartMealSheet), which does the saving:
  // how much, and whether this is a meal test or a meal already eaten.
  const [sheetOpen, setSheetOpen] = useState(false);
  const logEaten = () => setSheetOpen(true);
  const onLogged = () => {
    void trackUsage("meal_logged");
    setAte(true);
  };

  return (
    <div>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
          }}
          placeholder="Try eba, jollof, plantain, moi moi, coke..."
          className="w-full rounded-full border-2 border-line bg-white py-3.5 pl-12 pr-5 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft/50 focus:border-brand"
          aria-label="Search a food"
        />
      </div>

      {results.length > 0 && !picked && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          {results.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => pick(f, matchedAlias(f, query, cleanFoodName(f.name)))}
                className="flex w-full items-center justify-between px-5 py-3 text-left text-sm transition-colors hover:bg-mist"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{cleanFoodName(f.name)}</span>
                  {matchedAlias(f, query, cleanFoodName(f.name)) && (
                    <span className="block text-xs text-ink-soft">
                      Same advice for {matchedAlias(f, query, cleanFoodName(f.name))}
                    </span>
                  )}
                </span>
                <span
                  className={`ml-3 h-3 w-3 shrink-0 rounded-full ${
                    f.baseVerdict === "green"
                      ? "bg-verdict-green"
                      : f.baseVerdict === "yellow"
                        ? "bg-verdict-yellow"
                        : "bg-verdict-red"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length >= 2 && results.length === 0 && !picked && (
        <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm text-ink-soft">
          We do not have this food yet. We add new ones every month, so check
          again soon.
        </p>
      )}

      {picked && (
        <div className="mt-4">
          {pickedAs && (
            <p className="mb-3 rounded-xl bg-mist px-4 py-3 text-sm text-ink">
              {pickedAs} follows the same advice as {cleanFoodName(picked.name)}.
              Same size, same number of times. The picture shows{" "}
              {cleanFoodName(picked.name).toLowerCase()}.
            </p>
          )}
          <VerdictCard
            food={picked}
            onFix={onBuildMeal ? () => onBuildMeal(picked) : undefined}
            onSwap={(f) => pick(f)}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {ate ? (
              <span className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-verdict-green/50 bg-verdict-green/10 px-5 py-3 text-sm font-bold text-leaf-deep">
                <Check className="h-4 w-4" strokeWidth={3} /> Added to your food
              </span>
            ) : (
              <button
                onClick={logEaten}
                className="cta-pulse flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-leaf to-leaf-deep px-5 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="h-4 w-4" strokeWidth={3} /> I ate this
                <span aria-hidden className="tap-bob ml-1">
                  <Pointer className="h-5 w-5" strokeWidth={2.4} />
                </span>
              </button>
            )}
          </div>
          <StartMealSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            items={[{ food: picked, portion: "normal" }]}
            kind="single"
            label={picked.name}
            verdict={picked.baseVerdict}
            onLogged={onLogged}
          />
          {onOpenPlate && <MealsWithFood food={picked} personalize={personalize} onOpen={onOpenPlate} />}
        </div>
      )}
    </div>
  );
}
