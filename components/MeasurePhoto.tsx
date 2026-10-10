"use client";

import Image from "next/image";
import { Pointer } from "lucide-react";
import { measuresIn, openMeasureGuide, type Measure } from "@/lib/measures";
import { cn } from "@/lib/utils";
import { foodPhotoFor } from "@/lib/foodPhotos";
import { cleanFoodName } from "@/lib/foodName";
import type { Food } from "@/lib/types";
import { getFood } from "@/lib/search";
import { SkipMark } from "./MeasureGuide";

/**
 * The real photo of a household measure, as a button that opens it full size
 * (co-founder dietitian, 2026-10-08). A blinking hand sits on it so people
 * know it can be tapped: the founder asked for it, because a photo on its own
 * does not look like something you press. With reduced motion the hand still
 * shows, it just does not blink.
 *
 * `label` names the food too, so two photos of the same measure on one screen
 * never share an accessible name (scripts/qa.mjs runs Playwright in strict
 * mode, and a screen reader would hear two identical buttons).
 */
export function MeasurePhotoButton({
  measure,
  forFood,
  size = "md",
}: {
  measure: Measure;
  forFood: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <PhotoButton
      photo={measure.photo}
      label={`See ${measure.name.toLowerCase()} full size, for ${forFood}`}
      onOpen={() => openMeasureGuide(measure.key)}
      badge={measure.badge}
      size={size}
    />
  );
}

/**
 * The measure photo of a food's USUAL size, beside a bigger serving that names
 * no measure of its own (blue card: "4 medium pieces of chicken"). Opens as
 * "The usual size", with today's bigger amount written underneath.
 */
export function UsualSizePhotoButton({
  measure,
  food,
  usual,
  size = "md",
}: {
  measure: Measure;
  food: Food;
  usual: string;
  size?: "sm" | "md" | "lg";
}) {
  const name = cleanFoodName(food.name);
  return (
    <PhotoButton
      photo={measure.photo}
      label={`See the usual size of ${name}, full size`}
      onOpen={() =>
        openMeasureGuide({
          photo: measure.photo,
          alt: measure.alt,
          title: name,
          size: "The usual size",
          how: `The usual size: ${usual} ${food.portionGuidance}`,
        })
      }
      badge={measure.badge}
      size={size}
    />
  );
}

/**
 * A real photo of the food itself at its card's amount (lib/foodPhotos.ts),
 * for a card that names no household measure ("Two eggs"). Opens full size
 * with the card's own words underneath. A food with "None at all" carries the
 * red skip mark, small here and large in the full view.
 */
export function FoodPhotoButton({ food, size = "md" }: { food: Food; size?: "sm" | "md" | "lg" }) {
  const p = foodPhotoFor(food.id);
  if (!p) return null;
  const name = cleanFoodName(food.name);
  // A bigger serving from the blue card (or a search plate) carries its own
  // words, but the picture is of the card's usual amount. Say so, so six
  // snails beside a picture of three never reads as a mistake.
  const usual = getFood(food.id)?.portionGuidance;
  const bigger = Boolean(usual && usual !== food.portionGuidance);
  return (
    <PhotoButton
      photo={p.photo}
      label={`See how much ${name} to eat, full size`}
      onOpen={() =>
        openMeasureGuide({
          photo: p.photo,
          alt: p.drawing ? `A drawing of the usual amount of ${name}` : p.alt,
          title: name,
          size: p.skip ? "Best to skip" : bigger ? "The usual size" : "The right amount",
          how: bigger ? `${food.portionGuidance} The picture shows the usual size.` : food.portionGuidance,
          skip: p.skip,
        })
      }
      skip={p.skip}
      size={size}
    />
  );
}

function PhotoButton({
  photo,
  label,
  onOpen,
  badge,
  skip,
  size,
}: {
  photo: string;
  label: string;
  onOpen: () => void;
  badge?: string;
  skip?: boolean;
  size: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-24 w-24 rounded-2xl" : size === "md" ? "h-16 w-16" : "h-11 w-11";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        box,
      )}
    >
      <Image
        src={photo}
        alt=""
        fill
        sizes={size === "lg" ? "96px" : size === "md" ? "64px" : "44px"}
        className="object-cover"
        unoptimized={photo.endsWith(".svg")}
      />
      {skip && <SkipMark className="absolute inset-[10%]" />}
      {badge && (
        <span
          aria-hidden
          className="absolute left-1 top-1 rounded-md bg-white/95 px-1 text-[10px] font-bold leading-4 text-ink shadow-sm"
        >
          {badge}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "tap-hint absolute bottom-1 right-1 flex items-center justify-center rounded-full bg-white text-brand shadow-md",
          size === "sm" ? "h-5 w-5" : "h-6 w-6",
        )}
      >
        <Pointer className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.4} />
      </span>
    </button>
  );
}

/**
 * Small "tap to see" chips for every measure a sentence names. Used where a
 * size is said outside the portion box (the blue meal card's bigger serving,
 * the green extras card), and under the portion box when it names more than
 * one measure ("half a cup... the size of a tennis ball").
 */
export function MeasureChips({
  text,
  forFood,
  skipFirst = false,
  tone = "light",
  className,
}: {
  text: string | null | undefined;
  forFood: string;
  skipFirst?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const list = measuresIn(text).slice(skipFirst ? 1 : 0);
  if (list.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {list.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => openMeasureGuide(m.key)}
          aria-label={`See ${m.name.toLowerCase()} full size, for ${forFood}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
            tone === "dark"
              ? "bg-white/15 text-white ring-1 ring-inset ring-white/25 hover:bg-white/25 focus-visible:ring-white"
              : "bg-white text-ink ring-1 ring-inset ring-line hover:bg-mist focus-visible:ring-brand",
          )}
        >
          <span className="relative h-6 w-6 overflow-hidden rounded-full">
            <Image src={m.photo} alt="" fill sizes="24px" className="object-cover" />
          </span>
          {m.name}
          <Pointer className="tap-hint h-3 w-3" strokeWidth={2.4} aria-hidden />
        </button>
      ))}
    </div>
  );
}
