import Image from "next/image";
import { ClipboardList, ShieldCheck, Utensils, Stethoscope, Users, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * The frame every sign-in, sign-up and join screen shares (redesigned
 * 2026-10-12, founder: the old single grey card "looks archaic").
 *
 * Wide screens: the form on a calm white side, and a deep-blue brand side with
 * real food and three plain reasons. Phones: the blue side shrinks to a short
 * band above the form, so the form is still the first thing a thumb reaches.
 * The Navbar and Footer stay (the footer carries the legal line once per screen).
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
  /** Overrides the big line on the blue side (e.g. the hospital's name). */
  sideTitle?: string;
}) {
  const points =
    side === "hospital"
      ? [
          { icon: Users, text: "See every patient's meals and sugar tests in one place" },
          { icon: FileText, text: "Open a full report before each clinic visit" },
          { icon: Stethoscope, text: "Free for your doctors and dietitians" },
        ]
      : [
          { icon: Utensils, text: "Know what to eat, how much and how often" },
          { icon: ShieldCheck, text: "Built for Nigerian food, checked by dietitians" },
          { icon: ClipboardList, text: "A report to show your doctor" },
        ];
  const big = sideTitle ?? (side === "hospital" ? "Your patients, between visits." : "Defy Diabetes. Enjoy Food Again.");

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-[#f3f6fa] px-3 pb-16 pt-24 sm:px-6 sm:pt-28">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-40px_rgba(12,42,71,0.45)] ring-1 ring-ink/[0.05] lg:grid-cols-[1.05fr_1fr]">
          {/* Brand side */}
          <aside className="relative overflow-hidden bg-gradient-to-br from-[#0b2e59] via-[#0f3d75] to-brand px-6 py-7 text-white sm:px-10 lg:order-2 lg:py-12">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-leaf/25 blur-3xl" />
            <div className="relative">
              <p className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">{big}</p>
              <ul className="mt-5 hidden space-y-3.5 sm:block lg:mt-8">
                {points.map((p) => (
                  <li key={p.text} className="flex items-center gap-3 text-[15px] text-white/90">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/20">
                      <p.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    {p.text}
                  </li>
                ))}
              </ul>
              <div className="relative mt-10 hidden lg:block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-white/20">
                  <Image
                    src="/img/hero-jollof-fish.jpg"
                    alt="A dish of jollof rice with grilled fish, tomatoes and peppers"
                    fill
                    sizes="(min-width: 1024px) 480px, 0px"
                    className="object-cover"
                  />
                </div>
                {/* The app's own answer, as it really looks: a colour and what it means. */}
                <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)]">
                  <span aria-hidden className="flex flex-col gap-1 rounded-lg bg-ink px-1.5 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-verdict-green shadow-[0_0_10px_rgba(46,204,113,0.9)]" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-ink-soft">{side === "hospital" ? "Every meal, on record" : "Your answer"}</span>
                    <span className="block font-display text-sm font-bold">Green. Good to eat.</span>
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Form side */}
          <section className="px-5 py-8 sm:px-10 sm:py-12 lg:order-1 lg:px-14">
            <div className="mx-auto w-full max-w-md">
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
              {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
