"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Handshake, PenLine, ExternalLink, LogOut } from "lucide-react";

/**
 * The admin screens. Navigation only: anything a page can DO (download, pick a
 * period) lives in the page, never here.
 *
 * `/admin` is matched exactly. Every other screen lives under it, so a
 * startsWith test would light up the dashboard on every page.
 */
const TABS = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/blog", label: "Blog", icon: PenLine },
];

function useHere() {
  const path = usePathname();
  return (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
}

async function logOut() {
  await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
  window.location.href = "/admin";
}

/** The left sidebar, from `lg` up. */
export function AdminSidebarNav() {
  const here = useHere();
  return (
    <nav className="flex flex-col gap-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const on = here(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-sm font-semibold transition-colors ${
              on ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            {on && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-leaf" />}
            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The foot of the sidebar: back to the site, and log out. */
export function AdminSidebarFoot() {
  return (
    <div className="space-y-3">
      <a
        href="/"
        className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white"
      >
        <ExternalLink className="h-3.5 w-3.5" /> View live site
      </a>
      <button
        onClick={logOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/15"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}

/** Under `lg`: one row of tabs you can swipe, and a small log-out link. */
export function AdminMobileNav() {
  const here = useHere();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5">
      {TABS.map(({ href, label, icon: Icon }) => {
        const on = here(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold transition-colors ${
              on ? "bg-white/15 text-white ring-1 ring-inset ring-white/25" : "text-white/70"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminMobileLogOut() {
  return (
    <button onClick={logOut} className="text-xs font-bold text-white/80 hover:text-white">
      Log out
    </button>
  );
}
