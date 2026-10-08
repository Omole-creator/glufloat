"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { OPEN_MEASURE_GUIDE, measureByKey, type MeasureKey } from "@/lib/measures";

/**
 * The full-size picture of ONE portion size: the photo that was tapped and
 * nothing else (founder, 2026-10-08: "it should only show me the image for the
 * portion size of that meal i clicked"). An earlier version listed every other
 * measure underneath, which pulled the eye away from the one that mattered.
 *
 * Mounted once in /app and opened through OPEN_MEASURE_GUIDE, the same
 * window-event idiom as ToastHost. The event carries either a measure key
 * (a fist, a cup...) or a ready-made picture (a food photo at its real size).
 */
export interface PhotoView {
  photo: string;
  alt: string;
  title: string;
  size?: string;
  how?: string;
  /** Draw the red "skip" mark over the photo (a food with no safe amount). */
  skip?: boolean;
}

export default function MeasureGuide() {
  const [view, setView] = useState<PhotoView | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setView(null);
    returnTo.current?.focus?.();
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<MeasureKey | PhotoView | null>).detail;
      let next: PhotoView | null = null;
      if (typeof detail === "string") {
        const m = measureByKey(detail);
        if (m) next = { photo: m.photo, alt: m.alt, title: m.name, size: m.size, how: m.how };
      } else if (detail && typeof detail === "object") {
        next = detail;
      }
      if (!next) return;
      returnTo.current = document.activeElement as HTMLElement | null;
      setView(next);
    };
    window.addEventListener(OPEN_MEASURE_GUIDE, onOpen);
    return () => window.removeEventListener(OPEN_MEASURE_GUIDE, onOpen);
  }, []);

  useEffect(() => {
    if (!view) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // One button inside; keep Tab on it while the picture is open.
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [view, close]);

  if (!view) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/50 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-view-title"
        onClick={(e) => e.stopPropagation()}
        className="verdict-pop flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 id="photo-view-title" className="font-display text-lg font-bold text-ink">
            {view.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close the picture"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 pt-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-mist">
            <Image
              src={view.photo}
              alt={view.alt}
              fill
              sizes="(min-width: 640px) 470px, 100vw"
              className="object-cover"
              priority
            />
            {view.skip && <SkipMark className="absolute inset-[12%]" />}
          </div>
          {(view.size || view.how) && (
            <div className="mt-4">
              {view.size && (
                <p
                  className={
                    view.skip
                      ? "inline-block rounded-full bg-verdict-red/10 px-3 py-1 text-sm font-bold text-verdict-red"
                      : "inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand"
                  }
                >
                  {view.size}
                </p>
              )}
              {view.how && <p className="mt-3 text-base leading-relaxed text-ink">{view.how}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The red circle-and-line drawn over a food that is best skipped. */
export function SkipMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#E74C3C" strokeWidth="9" opacity="0.92" />
      <line x1="19" y1="81" x2="81" y2="19" stroke="#E74C3C" strokeWidth="9" strokeLinecap="round" opacity="0.92" />
    </svg>
  );
}
