"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type CardTone = "green" | "blue";

/**
 * A refined collapsible card. The /app home is an accordion of these: one open
 * at a time. The look is a calm, premium health-app card, NOT a loud colour bar:
 * a clean white surface with a soft-tinted icon chip and a whisper of the tone
 * colour, dark readable text, and a smooth height animation. The tone (green /
 * blue) gives each card a quiet identity without shouting.
 */
const TONES: Record<
  CardTone,
  { chip: string; ring: string; tintOpen: string; bar: string }
> = {
  green: {
    chip: "bg-leaf/10 text-leaf-deep ring-leaf/15",
    ring: "ring-leaf/10",
    tintOpen: "bg-leaf/[0.04]",
    bar: "bg-leaf",
  },
  blue: {
    chip: "bg-brand/10 text-brand ring-brand/15",
    ring: "ring-brand/10",
    tintOpen: "bg-brand/[0.04]",
    bar: "bg-brand",
  },
};

export default function CollapsibleCard({
  open,
  onToggle,
  tone,
  icon,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  tone: CardTone;
  /** Icon shown in the soft tinted chip. */
  icon?: ReactNode;
  /** Title area (dark text), may differ open vs collapsed. */
  header: ReactNode;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`overflow-hidden rounded-3xl bg-white shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ${t.ring} transition-shadow duration-300 hover:shadow-[0_10px_34px_-14px_rgba(12,42,71,0.26)]`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors sm:px-5 ${
          open ? t.tintOpen : "hover:bg-ink/[0.015]"
        }`}
      >
        {icon && (
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${t.chip}`}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">{header}</div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.04] text-ink/40 transition-colors group-hover:bg-ink/[0.08] group-hover:text-ink/60">
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
          <div className="px-4 pb-5 pt-1 sm:px-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
