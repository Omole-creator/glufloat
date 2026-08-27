"use client";

import { DashboardNavItems, type DashboardTabDef } from "./DashboardNavItems";

export type { DashboardTabDef };

/**
 * The mobile dashboard nav: the same row style as the desktop sidebar
 * (DashboardSidebar), just without the collapsible-aside chrome — a plain
 * white card holding the rows, since there is no room to save on a phone by
 * collapsing it. Both surfaces render via the shared DashboardNavItems, so
 * the phone reflects the desktop UI instead of a differently-styled grid.
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
    <div className="rounded-3xl bg-white p-3 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.05]">
      <DashboardNavItems tabs={tabs} active={active} onSelect={onSelect} />
    </div>
  );
}
