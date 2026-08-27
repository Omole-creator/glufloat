"use client";

import type { ReactNode } from "react";

export interface DashboardTabDef {
  id: string;
  label: string;
  icon: ReactNode;
}

/**
 * The shared row: icon chip + label, a left accent bar when active. Used by
 * both DashboardSidebar (desktop, wrapped in the collapsible aside chrome)
 * and DashboardNav (mobile, wrapped in a plain card) so the two surfaces
 * share one visual identity instead of two different-looking navs.
 */
export function DashboardNavItems({
  tabs,
  active,
  onSelect,
  compact = false,
}: {
  tabs: DashboardTabDef[];
  active: string;
  onSelect: (id: string) => void;
  /** Icon only, no label — the desktop sidebar's collapsed rail. */
  compact?: boolean;
}) {
  return (
    <div className="space-y-1">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={isActive}
            title={compact ? t.label : undefined}
            className={`flex h-11 w-full items-center gap-3 rounded-xl border-l-2 px-2.5 text-left transition-colors ${
              isActive
                ? "border-brand bg-brand/10 text-brand"
                : "border-transparent text-ink-soft hover:bg-mist hover:text-ink"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">{t.icon}</span>
            {!compact && <span className="truncate text-sm font-semibold">{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
