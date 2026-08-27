"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export interface DashboardTabDef {
  id: string;
  label: string;
  icon: ReactNode;
}

/**
 * The dashboard's own button row: one tap opens one existing section below it.
 * Generalizes the old DoorCard grid (which only ever picked between 2 of the
 * page's sections) to all 5. The sliding highlight is a framer-motion
 * layoutId shared-element transition — framer-motion is already a dependency
 * elsewhere in the app (components/ui/pricing.tsx, feature-cards.tsx,
 * hero-1.tsx), so this needs no new package.
 */
export default function DashboardNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: DashboardTabDef[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={isActive}
            className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl bg-white px-2 py-3.5 text-center ring-1 ring-ink/[0.05] transition-shadow hover:shadow-[0_6px_20px_-12px_rgba(12,42,71,0.25)]"
          >
            {isActive && (
              <motion.span
                layoutId="dashboard-tab-highlight"
                className="absolute inset-0 z-0 bg-brand"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                isActive ? "bg-white/20 text-white" : "bg-mist text-brand"
              }`}
            >
              {t.icon}
            </span>
            <span
              className={`relative z-10 text-xs font-bold leading-tight transition-colors ${
                isActive ? "text-white" : "text-ink-soft"
              }`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
