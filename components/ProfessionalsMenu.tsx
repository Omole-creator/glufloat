"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Hospital, Stethoscope } from "lucide-react";

const ITEMS = [
  { href: "/hospitals", label: "For hospitals", sub: "Care for your patients between visits", icon: Hospital },
  { href: "/dietitians", label: "For dietitians", sub: "Support your patients beyond the clinic", icon: Stethoscope },
];

/**
 * "For professionals" in the desktop top bar: one drop-down holding the
 * hospital and dietitian pages (founder, 2026-10-13). Two separate links made
 * the bar wrap onto two lines at laptop width. The phone menu shows them as
 * two cards instead (components/Navbar.tsx).
 */
export default function ProfessionalsMenu({ onDark, pathname }: { onDark: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const here = ITEMS.some((i) => pathname === i.href);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
          onDark
            ? here || open
              ? "bg-white/15 text-white"
              : "text-white/80 hover:bg-white/10 hover:text-white"
            : here || open
              ? "bg-brand/10 text-brand"
              : "text-ink-soft hover:bg-mist hover:text-ink"
        }`}
      >
        For professionals <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_24px_60px_-20px_rgba(12,42,71,0.45)] ring-1 ring-ink/[0.06]">
          {ITEMS.map(({ href, label, sub, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={pathname === href ? "page" : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-mist"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
                <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{label}</span>
                <span className="block text-xs font-normal text-ink-soft">{sub}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
