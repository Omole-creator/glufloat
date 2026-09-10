"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The four screens. Where you are is a filled white-glass pill, so the bar
 * answers "where am I" without being read word by word — same white/15
 * chip-on-blue treatment PersonalizationSettings uses for its section icons.
 *
 * `/admin` is matched exactly. Every other screen lives under it, so a
 * startsWith test would light up the dashboard tab on every page.
 */
const TABS = [
  { href: "/admin", label: "The numbers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/blog", label: "Blog" },
];

export default function AdminTabs() {
  const path = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const here = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={here ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-sm font-bold transition-colors ${
              here
                ? "bg-white/15 text-white ring-1 ring-inset ring-white/25"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
