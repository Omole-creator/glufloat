"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOut as signOutOfAccount } from "@/lib/account";
import { clearAccessCache, useAccess } from "@/lib/useAccess";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { access } = useAccess();
  const pathname = usePathname();
  const router = useRouter();
  // The app is already open on /app, so the menu offers Sign out there rather than
  // another way in.
  const onApp = pathname === "/app";
  // Signed in at all: the bar is the wordmark and the menu button, at every width.
  // A member does not need How it works or Pricing across the top; they came to open
  // the app. Everything they might still want is inside the sheet and in the footer.
  const menuOnly = access.status !== "anon";
  // Signed in, but the trial or the month has run out. The only thing left to do is
  // pay, so that button stays even on /app.
  const isLocked = access.status === "expired";
  // The social-proof ticker sits above the bar on the home page and /app, so the
  // fixed navbar drops by its height (h-8) there. Every other page has no ticker,
  // so the bar stays flush at the top.
  const offsetTop = pathname === "/" || onApp ? "top-8" : "top-0";
  // The landing hero is a solid deep blue, so at the top of the home page the
  // bar sits ON that blue and has to be white to be readable. Once it scrolls
  // away from the hero the normal white bar with dark text takes over.
  const onDark = pathname === "/" && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = async () => {
    await signOutOfAccount();
    clearAccessCache();
    setMenuOpen(false);
    router.replace("/");
  };

  // Only a visitor with no account gets buttons up here. Everybody else opens the
  // menu. Note the two labels: this pill says "Sign up" while the one inside the
  // sheet says "Start my 3-day free trial", so no two controls ever share a name.
  const actionButtons = menuOnly ? null : (
    <>
      <Link
        href="/signin"
        className={`hidden text-sm font-semibold transition-colors md:block ${
          onDark ? "text-white/80 hover:text-white" : "text-ink-soft hover:text-brand"
        }`}
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-0.5 sm:px-5 ${
          onDark ? "bg-leaf hover:bg-leaf-deep" : "bg-brand hover:bg-brand-deep"
        }`}
      >
        Sign up
      </Link>
    </>
  );

  // What the big pill at the bottom of the menu does, by who is reading it.
  const sheetAction =
    access.status === "trial" || access.status === "subscribed"
      ? { label: "Open app", href: "/app" }
      : access.status === "expired"
        ? { label: "Subscribe for N1,500 a month", href: "/app" }
        : { label: "Start my 3-day free trial", href: "/trial" };

  return (
    <header
      className={`fixed inset-x-0 ${offsetTop} z-50 transition-all duration-300 ${
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
          className={`hidden items-center gap-7 text-sm font-medium ${
            menuOnly ? "" : "md:flex"
          } ${onDark ? "text-white/80" : "text-ink-soft"}`}
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

        <div className="flex items-center gap-4">
          {actionButtons}
          {/* Below md this is the only navigation there is. Signed in, it is the only
              navigation at every width. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={`-mr-1 rounded-lg p-2 transition-colors ${
              menuOnly ? "" : "md:hidden"
            } ${
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
          className={`inset-y-0 left-auto right-0 top-0 h-full max-h-none w-full max-w-sm translate-x-0 translate-y-0 grid-rows-[auto_1fr] gap-0 overflow-y-auto rounded-none border-0 bg-white p-5 shadow-2xl sm:rounded-none ${
            menuOnly ? "" : "md:hidden"
          }`}
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
            <div className="space-y-3 pt-6">
              {!menuOnly && (
                <Link
                  href="/signin"
                  onClick={() => setMenuOpen(false)}
                  className="-mx-3 block rounded-xl px-3 py-3 text-center text-base font-semibold text-ink transition-colors hover:bg-mist"
                >
                  Log in
                </Link>
              )}
              {/* "Open app" is pointless when the app is already open. The expired
                  pill still shows on /app, because paying is the one thing left. */}
              {!(onApp && sheetAction.href === "/app" && !isLocked) && (
                <Link
                  href={sheetAction.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-full bg-leaf px-5 py-3.5 text-center text-base font-bold text-white"
                >
                  {sheetAction.label}
                </Link>
              )}
              {/* Signing out lives here now, because on /app the bar is only the
                  wordmark and this button. */}
              {onApp && (
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border border-line bg-white px-5 py-3 text-base font-semibold text-ink-soft transition-colors hover:border-verdict-red hover:text-verdict-red"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
