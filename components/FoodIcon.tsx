import {
  Apple,
  Bean,
  Beef,
  Cookie,
  CupSoda,
  Drumstick,
  Egg,
  Fish,
  Milk,
  Nut,
  Salad,
  Shrimp,
  Soup,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { Food } from "@/lib/types";

/**
 * A small picture for a food in a plate list, picked from what the food is
 * (its id first, then its category). Decoration only: the name beside it says
 * what the food is, so it is always aria-hidden.
 */
const BY_ID: Record<string, LucideIcon> = {
  chicken: Drumstick,
  turkey: Drumstick,
  beef: Beef,
  "goat-meat": Beef,
  pomo: Beef,
  shaki: Beef,
  eggs: Egg,
  "fried-egg": Egg,
  omelette: Egg,
  prawns: Shrimp,
  "prawns-crayfish": Shrimp,
};

const BY_CATEGORY: Record<string, LucideIcon> = {
  soup: Soup,
  swallow: Wheat,
  rice: Wheat,
  cereal: Wheat,
  corn: Wheat,
  bread: Wheat,
  pasta: Wheat,
  tuber: Wheat,
  plantain: Wheat,
  legume: Bean,
  vegetable: Salad,
  fruit: Apple,
  nut: Nut,
  drink: CupSoda,
  dairy: Milk,
  snack: Cookie,
  sugar: Cookie,
};

function iconFor(food: Food): LucideIcon {
  if (BY_ID[food.id]) return BY_ID[food.id];
  if (food.category === "protein") return /fish|titus|mackerel|sardine|tuna/i.test(food.name) ? Fish : Drumstick;
  return BY_CATEGORY[food.category] ?? Utensils;
}

export default function FoodIcon({
  food,
  tone = "light",
  size = "md",
  className = "",
}: {
  food: Food;
  /** "dark" sits on the blue card, "light" on white. */
  tone?: "dark" | "light";
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = iconFor(food);
  return (
    <span
      aria-hidden
      className={`flex ${size === "sm" ? "h-9 w-9" : "h-10 w-10"} shrink-0 items-center justify-center rounded-xl ${
        tone === "dark"
          ? "bg-white/15 text-white ring-1 ring-inset ring-white/20"
          : "bg-brand/[0.08] text-brand ring-1 ring-inset ring-brand/10"
      } ${className}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}
