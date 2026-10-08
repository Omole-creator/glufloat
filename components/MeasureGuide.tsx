"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import {
  MEASURES,
  OPEN_MEASURE_GUIDE,
  measureByKey,
  type MeasureKey,
} from "@/lib/measures";
import { cn } from "@/lib/utils";

/**
 * "How to measure": every household measure GluFloat names, as a real photo
 * with its size (co-founder dietitian, 2026-10-08). Mounted once in /app and
 * opened from any measure photo or chip through OPEN_MEASURE_GUIDE, the same
 * window-event idiom as ToastHost.
 *
 * The tapped measure leads, large, so the person sees the thing they asked
 * about first. Every other measure sits below it, tappable, so the guide is
 * also the one place to learn them all.
 */
export default function MeasureGuide() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<MeasureKey>("cup");
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Picking another measure from the grid shows it at the top. Without this
  // the big photo changed above the fold and nothing seemed to happen.
  const show = (key: MeasureKey) => {
    setActive(key);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  const returnTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    returnTo.current?.focus?.();
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const key = (e as CustomEvent<MeasureKey | null>).detail;
      returnTo.current = document.activeElement as HTMLElement | null;
      setActive(key && measureByKey(key) ? key : "cup");
      setOpen(true);
    };
    window.addEventListener(OPEN_MEASURE_GUIDE, onOpen);
    return () => window.removeEventListener(OPEN_MEASURE_GUIDE, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // Keep Tab inside the guide while it is open.
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>("button");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;
  const m = measureByKey(active)!;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/50 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={close}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="measure-guide-title"
        onClick={(e) => e.stopPropagation()}
        className="verdict-pop flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 id="measure-guide-title" className="font-display text-lg font-bold text-ink">
            How to measure
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close how to measure"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-ink transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto px-5 pb-6 pt-4">
          {/* The measure they tapped, full size. */}
          <figure>
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-mist sm:aspect-[4/3]">
              <Image
                key={m.key}
                src={m.photo}
                alt={m.alt}
                fill
                sizes="(min-width: 640px) 560px, 100vw"
                className="object-cover"
                priority
              />
            </div>
            <figcaption className="mt-4">
              <p className="font-display text-2xl font-bold text-ink">{m.name}</p>
              <p className="mt-1 inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand">
                {m.size}
              </p>
              <p className="mt-3 text-base leading-relaxed text-ink">{m.how}</p>
            </figcaption>
          </figure>

          {/* Every other measure, so this is also the place to learn them all. */}
          <p className="mt-7 text-[11px] font-bold uppercase tracking-wider text-ink/60">
            All the measures GluFloat uses
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {MEASURES.map((x) => (
              <li key={x.key}>
                <button
                  type="button"
                  onClick={() => show(x.key)}
                  aria-pressed={x.key === active}
                  aria-label={`Show ${x.name.toLowerCase()}`}
                  className={cn(
                    "w-full overflow-hidden rounded-xl bg-white text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    x.key === active ? "ring-2 ring-brand" : "ring-line hover:ring-ink/30",
                  )}
                >
                  <span className="relative block aspect-square w-full bg-mist">
                    <Image src={x.photo} alt="" fill sizes="120px" className="object-cover" />
                  </span>
                  <span className="block px-2 py-1.5 text-xs font-semibold leading-tight text-ink">
                    {x.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
