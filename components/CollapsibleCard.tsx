"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A card with a pronounced colour header that collapses to just that header.
 * The /app home is an accordion of these: only one is open at a time, the rest
 * show their coloured header bar. The header is a button that toggles the card.
 */
export default function CollapsibleCard({
  open,
  onToggle,
  headerClass,
  borderClass,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  /** Background classes for the header band (the card's pronounced colour). */
  headerClass: string;
  /** Border colour class for the whole card. */
  borderClass: string;
  /** Title area shown in the header band (may differ open vs collapsed). */
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border-2 ${borderClass} bg-white shadow-sm`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left text-white ${headerClass}`}
      >
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}
