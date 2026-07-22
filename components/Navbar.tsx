"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#demo", label: "Try it" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/app", label: "The app" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // The app is already open on /app, so the top-right button is Sign out there,
  // not "Open app".
  const onApp = pathname === "/app";
  // The landing hero is a solid deep blue, so at the top of the home page the
  // bar sits ON that blue and has to be white to be readable. Once it scrolls
  // away from the hero the normal white bar with dark text takes over.
  const onDark = pathname === "/" && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    createClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(!!data.user));
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace("/");
  };

  const actionButton = signedIn && onApp ? (
    <button
      onClick={signOut}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft shadow-sm transition-colors hover:border-verdict-red hover:text-verdict-red sm:px-5"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  ) : signedIn ? (
    <Link
      href="/app"
      className="rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(62,155,79,0.7)] transition-all hover:-translate-y-0.5 hover:bg-leaf-deep sm:px-5"
    >
      Open app
    </Link>
  ) : (
    <Link
      href="/trial"
      className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-0.5 sm:px-5 ${
        onDark ? "bg-leaf hover:bg-leaf-deep" : "bg-brand hover:bg-brand-deep"
      }`}
    >
      Start free trial
    </Link>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 shadow-[0_8px_30px_-16px_rgba(12,45,77,0.35)] backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt="Glufloat"
            width={38}
            height={38}
            priority
          />
          <span className="font-display text-xl font-bold tracking-tight">
            {onDark ? (
              <span className="text-white">GLUFLOAT</span>
            ) : (
              <>
                <span className="text-brand">GLU</span>
                <span className="text-leaf">FLOAT</span>
              </>
            )}
          </span>
        </Link>

        <div
          className={`hidden items-center gap-7 text-sm font-medium md:flex ${
            onDark ? "text-white/80" : "text-ink-soft"
          }`}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition-colors ${
                onDark ? "hover:text-white" : "hover:text-brand"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {actionButton}
          {/* Until now a phone got no navigation at all: the links were simply
              hidden below md. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={`-mr-1 rounded-lg p-2 transition-colors md:hidden ${
              onDark
                ? "text-white/80 hover:text-white"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          hideClose
          className="inset-y-0 left-auto right-0 top-0 h-full max-h-none w-full max-w-sm translate-x-0 translate-y-0 grid-rows-[auto_1fr] gap-0 overflow-y-auto rounded-none border-0 bg-white p-5 shadow-2xl sm:rounded-none md:hidden"
        >
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <div className="flex items-center justify-between">
            <span className="font-display text-xl font-bold tracking-tight">
              <span className="text-brand">GLU</span>
              <span className="text-leaf">FLOAT</span>
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="rounded-lg p-2 text-ink-soft transition-colors hover:text-ink"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-6 divide-y divide-line">
            <div className="space-y-1 pb-6">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="-mx-3 block rounded-xl px-3 py-3 text-base font-semibold text-ink transition-colors hover:bg-mist"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="pt-6">
              {signedIn ? (
                <Link
                  href="/app"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-full bg-leaf px-5 py-3.5 text-center text-base font-bold text-white"
                >
                  Open app
                </Link>
              ) : (
                <Link
                  href="/trial"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-full bg-leaf px-5 py-3.5 text-center text-base font-bold text-white"
                >
                  Start my 3-day free trial
                </Link>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
