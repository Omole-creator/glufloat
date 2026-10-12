import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * The frame every sign-in, sign-up and join screen shares.
 *
 * Founder's choice (2026-10-12, second pass): the whole page is GluFloat's
 * deep blue, like the home hero, with ONE clean white card in the middle that
 * holds the form. Green is spent only on the main button. The Navbar sits on
 * the blue in its glass style (Navbar.tsx lists these paths), and the Footer
 * stays below, because it carries the legal line once per screen.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  side = "patient",
  sideTitle,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  side?: "patient" | "hospital";
  /** A small line above the title, e.g. the hospital's name. */
  sideTitle?: string;
}) {
  const eyebrow = sideTitle ?? (side === "hospital" ? "GluFloat for hospitals" : null);
  return (
    <>
      <Navbar />
      <main className="relative flex-1 overflow-hidden bg-gradient-to-br from-[#0d3568] via-[#14538f] to-[#1b5faa] px-4 pb-16 pt-24 sm:pt-28">
        <div aria-hidden className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-[#2C7BE5]/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-leaf/25 blur-3xl" />

        <div className="relative mx-auto w-full max-w-md">
          <div className="rounded-[28px] bg-white px-6 py-8 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] sm:px-9 sm:py-10">
            <div className="flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/[0.07] ring-1 ring-inset ring-brand/10">
                <Image src="/logo-mark.png" alt="" width={36} height={36} className="h-9 w-9" />
              </span>
            </div>
            {eyebrow && (
              <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
            )}
            <h1 className={`${eyebrow ? "mt-1.5" : "mt-4"} text-center font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink`}>
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-center text-[15px] leading-relaxed text-ink-soft">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-white/75">
            <ShieldCheck className="h-4 w-4" /> Built for Nigerian food, checked by dietitians
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
