"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A premium collapsible card. The /app home is an accordion of these: one open
 * at a time, the rest resting as a coloured header bar. The header carries a
 * frosted icon chip, a soft gradient, and a chevron that rotates; the body
 * expands with a smooth height animation (CSS grid rows), no layout jank.
 */
export default function CollapsibleCard({
  open,
  onToggle,
  headerClass,
  icon,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  /** Gradient/background classes for the header band. */
  headerClass: string;
  /** Icon shown in the frosted chip on the left of the header. */
  icon?: ReactNode;
  /** Title area (may differ open vs collapsed). */
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_-12px_rgba(12,42,71,0.22)] ring-1 ring-ink/[0.04] transition-shadow duration-300 hover:shadow-[0_8px_30px_-12px_rgba(12,42,71,0.28)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`group flex w-full items-center gap-4 px-5 py-4 text-left text-white ${headerClass}`}
      >
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-inset ring-white/25 backdrop-blur-sm">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">{header}</div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/30">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
