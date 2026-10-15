"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  Hospital as HospitalIcon,
  LogOut,
  Stethoscope,
  Menu,
  PlayCircle,
  Smartphone,
  Sparkles,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut as signOutOfAccount } from "@/lib/account";
import { clearAccessCache, useAccess } from "@/lib/useAccess";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ProfessionalsMenu from "@/components/ProfessionalsMenu";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#demo", label: "Try it" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/hospitals", label: "For hospitals" },
  { href: "/dietitians", label: "For dietitians" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/app", label: "The app" },
];

/** One icon per link in the phone menu, so each row is easy to find at a glance. */
const LINK_ICON: Record<string, LucideIcon> = {
  "/#how": Sparkles,
  "/#demo": PlayCircle,
  "/#pricing": Tag,
  "/#faq": CircleHelp,
  "/blog": BookOpen,
  "/about": Users,
  "/app": Smartphone,
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { access, hospitalStaff, inbox } = useAccess();
  // A hospital's doctor, dietitian or admin gets their dashboard in the menu.
  const isHospitalStaff = (hospitalStaff?.length ?? 0) > 0;
  // A dietitian running her own practice (GluFloat for dietitians) and nothing else.
  const onlyPractice = isHospitalStaff && hospitalStaff!.every((s) => s.kind === "dietitian");
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
  // The social-proof ticker sits above the bar on the home page only, so the
  // fixed navbar drops by its height (h-8) there. It was taken off /app on
  // 2026-10-07 (founder: the app should not look busy), so the bar is flush
  // there like every other page.
  const offsetTop = pathname === "/" ? "top-8" : "top-0";
  // The landing hero is a solid deep blue, so at the top of the home page the
  // bar sits ON that blue and has to be white to be readable. Once it scrolls
  // away from the hero the normal white bar with dark text takes over.
  // /hospitals opens on the same deep blue, so it gets the same white bar.
  // The sign-in, sign-up and join pages are blue too (components/auth/AuthShell.tsx).
  const blueTop =
    pathname === "/" ||
    pathname === "/hospitals" ||
    pathname === "/dietitians" ||
    pathname === "/dietitians/start" ||
    pathname === "/dietitians/paid" ||
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/j" ||
    pathname.startsWith("/j/") ||
    pathname.startsWith("/hospital/join/");
  const onDark = blueTop && !scrolled;

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
  // menu.
  //
  // On a phone there is room for ONE, and it is Log in, not Sign up: somebody
  // coming back already has an account and wants the way in, right where their
  // thumb is. Somebody new is served by the trial button in the hero and by the
  // big pill in the menu, both of which name the offer properly. So this is a
  // single Log in link that wears a pill on a phone and plain text on a desktop
  // (one element, two looks) rather than two elements sharing a name.
  const actionButtons = menuOnly ? null : (
    <>
      <Link
        href="/signin"
        className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors lg:px-3 ${
          onDark
            ? "bg-leaf hover:bg-leaf-deep lg:bg-transparent lg:text-white/85 lg:hover:bg-white/10 lg:hover:text-white"
            : "bg-brand hover:bg-brand-deep lg:bg-transparent lg:text-ink lg:hover:bg-mist"
        }`}
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className={`hidden rounded-full px-5 py-2 text-sm font-bold text-white transition-colors lg:block ${
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
        : { label: "Start my 7-day free trial", href: "/trial" };

  return (
    <header className={`fixed inset-x-0 ${offsetTop} z-50 px-3 pt-2 sm:px-5`}>
      {/* Redesigned 2026-10-12 (founder: the old bar "looks archaic"): one
          floating, rounded bar. Frosted white on light pages; on the deep-blue
          hero it is see-through glass until the page scrolls. Same 64px of
          height as before (8px gap + 48px bar), so every page offset holds. */}
      <nav
        className={`mx-auto flex h-12 max-w-6xl items-center justify-between rounded-full pl-3 pr-1.5 transition-all duration-300 sm:pl-4 ${
          onDark
            ? "bg-white/10 ring-1 ring-inset ring-white/20 backdrop-blur-md"
            : "bg-white/90 shadow-[0_10px_30px_-14px_rgba(12,45,77,0.35)] ring-1 ring-ink/[0.06] backdrop-blur-md"
        }`}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* On blue, the blue mark needs a white tile or it vanishes. */}
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${onDark ? "bg-white" : ""}`}>
            <Image src="/logo-mark.png" alt="Glufloat" width={onDark ? 24 : 30} height={onDark ? 24 : 30} priority />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
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

        <div className={`hidden items-center gap-0.5 text-sm font-semibold ${menuOnly ? "" : "lg:flex"}`}>
          {LINKS.map((l) => {
            // Hospitals and dietitians share one drop-down up here, so the bar
            // stays on one line at laptop width. The phone menu lists both.
            if (l.href === "/dietitians") return null;
            if (l.href === "/hospitals") return <ProfessionalsMenu key="pros" onDark={onDark} pathname={pathname} />;
            const here = !l.href.includes("#") && pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={here ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                  onDark
                    ? here
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                    : here
                      ? "bg-brand/10 text-brand"
                      : "text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {actionButtons}
          {/* Below lg this is the only navigation there is. Signed in, it is the
              only navigation at every width. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${menuOnly ? "" : "lg:hidden"} ${
              onDark ? "text-white hover:bg-white/10" : "text-ink hover:bg-mist"
            }`}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        {/* The phone menu, redesigned 2026-10-12 (founder: "archaic"). A panel
            that slides in from the right: a blue header, the links as big rows
            with an icon each, a card for hospitals, and the one action that
            matters for this reader pinned at the bottom. */}
        <DialogContent
          hideClose
          className={`menu-in inset-y-0 left-auto right-0 top-0 flex h-[100dvh] max-h-none w-[88%] max-w-sm translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-l-[28px] rounded-r-none border-0 bg-[#f3f6fa] p-0 shadow-2xl ${
            menuOnly ? "" : "lg:hidden"
          }`}
        >
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0b2e59] via-[#124A8C] to-brand px-5 pb-6 pt-5 text-white">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <Image src="/logo-mark.png" alt="" width={24} height={24} />
                </span>
                GLUFLOAT
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="relative mt-4 text-sm text-white/75">Know what to eat for your diabetes.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
            <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink/[0.05]">
              {/* Try it and FAQ are left out of the menu (founder, 2026-10-13). */}
              {LINKS.filter((l) => !["/hospitals", "/dietitians", "/#demo", "/#faq"].includes(l.href)).map((l, i) => {
                const Icon = LINK_ICON[l.href] ?? ChevronRight;
                const here = !l.href.includes("#") && pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={here ? "page" : undefined}
                    className={`flex items-center gap-3.5 px-4 py-3.5 text-base font-semibold transition-colors hover:bg-mist ${
                      i > 0 ? "border-t border-[#eef2f7]" : ""
                    } ${here ? "text-brand" : "text-ink"}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${here ? "bg-brand text-white" : "bg-brand/[0.08] text-brand"}`}>
                      <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    <span className="flex-1">{l.label}</span>
                    <ChevronRight className="h-4 w-4 text-ink-soft/40" />
                  </Link>
                );
              })}
            </div>

            <Link
              href="/hospitals"
              onClick={() => setMenuOpen(false)}
              className="mt-3 flex items-center gap-3.5 rounded-3xl bg-white p-4 ring-1 ring-ink/[0.05] transition-colors hover:bg-mist"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-leaf/10 text-leaf-deep">
                <HospitalIcon className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="flex-1">
                <span className="block text-base font-bold text-ink">For hospitals</span>
                <span className="block text-sm text-ink-soft">Care for your patients between visits</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-soft/40" />
            </Link>
            <Link
              href="/dietitians"
              onClick={() => setMenuOpen(false)}
              className="mt-3 flex items-center gap-3.5 rounded-3xl bg-white p-4 ring-1 ring-ink/[0.05] transition-colors hover:bg-mist"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Stethoscope className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="flex-1">
                <span className="block text-base font-bold text-ink">For dietitians</span>
                <span className="block text-sm text-ink-soft">Support your patients beyond the clinic</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-soft/40" />
            </Link>
          </div>

          <div className="shrink-0 space-y-2.5 border-t border-line bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {/* Log in is not repeated here: it already sits in the bar at every
                width, and two controls with one name break strict mode. */}
            {/* "Open app" is pointless when the app is already open. The expired
                pill still shows on /app, because paying is the one thing left. */}
            {!(onApp && sheetAction.href === "/app" && !isLocked) && (
              <Link
                href={sheetAction.href}
                onClick={() => setMenuOpen(false)}
                className="flex h-13 items-center justify-center rounded-full bg-leaf px-5 py-3.5 text-center text-base font-bold text-white shadow-[0_12px_26px_-12px_rgba(62,155,79,0.9)]"
              >
                {sheetAction.label}
              </Link>
            )}
            {isHospitalStaff && (
              <Link
                href="/hospital"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center rounded-full bg-brand px-5 py-3.5 text-center text-base font-bold text-white"
              >
                {onlyPractice ? "My dietitian dashboard" : "Hospital dashboard"}
              </Link>
            )}
            {inbox && (
              <Link
                href="/inbox"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center rounded-full bg-brand px-5 py-3.5 text-center text-base font-bold text-white"
              >
                My dietitian inbox
              </Link>
            )}
            {/* Signing out lives here on EVERY page, not only /app: signed in,
                the bar is just the wordmark and this menu, so this is the one
                place it can be found from anywhere on the site. */}
            {menuOnly && (
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-line bg-white px-5 py-3 text-base font-semibold text-ink-soft transition-colors hover:border-verdict-red hover:text-verdict-red"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
