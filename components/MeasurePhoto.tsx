"use client";

import Image from "next/image";
import { Pointer } from "lucide-react";
import { measuresIn, openMeasureGuide, type Measure } from "@/lib/measures";
import { cn } from "@/lib/utils";

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
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "h-16 w-16" : "h-11 w-11";
  return (
    <button
      type="button"
      onClick={() => openMeasureGuide(measure.key)}
      aria-label={`See ${measure.name.toLowerCase()} full size, for ${forFood}`}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        box,
      )}
    >
      <Image
        src={measure.photo}
        alt=""
        fill
        sizes={size === "md" ? "64px" : "44px"}
        className="object-cover"
      />
      {measure.badge && (
        <span
          aria-hidden
          className="absolute left-0.5 top-0.5 rounded-md bg-white/95 px-1 text-[10px] font-bold leading-4 text-ink shadow-sm"
        >
          {measure.badge}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "tap-hint absolute bottom-0.5 right-0.5 flex items-center justify-center rounded-full bg-white text-brand shadow-md",
          size === "md" ? "h-6 w-6" : "h-5 w-5",
        )}
      >
        <Pointer className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={2.4} />
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
