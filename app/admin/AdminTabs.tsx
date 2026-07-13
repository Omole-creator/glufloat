"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The four screens. Where you are is underlined, so the bar answers "where am I"
 * without being read word by word.
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
            className={`relative whitespace-nowrap rounded-lg px-3 py-2 font-display text-sm font-bold transition-colors ${
              here
                ? "text-brand"
                : "text-ink-soft hover:bg-mist hover:text-ink"
            }`}
          >
            {t.label}
            {here && (
              <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
