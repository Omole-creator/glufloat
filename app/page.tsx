import Image from "next/image";
import { Check, ShieldCheck, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import SocialProofTicker from "@/components/SocialProofTicker";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import TrafficLight from "@/components/TrafficLight";
import DayTimeline from "@/components/home/DayTimeline";
import ReportShowcase from "@/components/home/ReportShowcase";
import FAQ from "@/components/FAQ";
import { HeroLanding } from "@/components/ui/hero-1";
import HeroDemo from "@/components/ui/hero-demo";
import { Testimonials } from "@/components/ui/testimonial-v2";
import { Pricing, type PricingPlan } from "@/components/ui/pricing";
import CountUp from "@/components/CountUp";
import TrialCta from "@/components/TrialCta";

const PLANS: PricingPlan[] = [
  {
    tier: "basic",
    name: "GluFloat",
    price: "N1,500",
    isPopular: false,
    description: "7 days free. No card needed. Stop anytime.",
    features: [
      "Check any of 1,400+ Nigerian foods before you eat",
      "Get personalized breakfast, lunch, and dinner recommendations every day",
      "Build a meal and get personalized guidance on it",
      "Test your sugar before and 2 hours after a meal, and see the change",
      "Generate a monthly meal report to share with your doctor",
      "Get a gentle reminder before each meal",
    ],
  },
  {
    tier: "plus",
    name: "GluFloat Plus",
    price: "N2,500",
    isPopular: true,
    intro: "Everything in GluFloat, plus:",
    description: "Everything in GluFloat, with meals picked around you.",
    features: [
      "Get meals tailored to your personal goals",
      "Get meal recommendations that fit your lifestyle",
      "See your daily calorie target and recommended meals to help you meet it",
      "Get recommendations based on how you actually eat",
    ],
  },
  {
    tier: "dietitian",
    name: "GluFloat Premium",
    price: "N4,500",
    isPopular: false,
    intro: "Everything in GluFloat Plus, plus:",
    description: "Your own dietitian, plus everything in GluFloat Plus.",
    features: [
      "Get direct, personal access to your own dietitian",
      "Get help making better food choices from the meals you already love",
      "Get nutrition guidance built around Nigerian foods and your lifestyle",
      "Have a dietitian you can turn to when you need help with your meals",
    ],
  },
];

const MARQUEE_FOODS: { name: string; v: "green" | "yellow" | "red" }[] = [
  { name: "Egusi soup", v: "green" },
  { name: "Jollof rice", v: "yellow" },
  { name: "Moi moi", v: "green" },
  { name: "Fried plantain", v: "red" },
  { name: "Pepper soup", v: "green" },
  { name: "Pounded yam", v: "yellow" },
  { name: "Suya", v: "green" },
  { name: "White bread", v: "red" },
  { name: "Ofada rice", v: "yellow" },
  { name: "Efo riro", v: "green" },
  { name: "Puff puff", v: "red" },
  { name: "Boiled plantain", v: "green" },
  { name: "Amala", v: "yellow" },
  { name: "Zobo, no sugar", v: "green" },
  { name: "Soft drinks", v: "red" },
  { name: "Okra soup", v: "green" },
  { name: "Beans", v: "green" },
];

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

/**
 * Design tokens for the body of the page (redesign, 2026-10-07). A cool
 * off-white canvas alternating with white, white cards with long soft shadows,
 * and deep-blue panels set INTO the page rather than full-width slabs. Every
 * section headline is centred and in Title Case (founder instruction).
 */
const H2 = "mx-auto mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.6rem]";
const LEAD = "mx-auto mt-4 max-w-xl text-lg leading-relaxed text-ink-soft";
const PANEL =
  "relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0B2E5C] via-[#124A8C] to-[#1B5FAA] px-6 py-14 sm:px-12 sm:py-16";

/** Soft light in the corners of a deep-blue panel, instead of grain or dots. */
function Glow() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#2C7BE5]/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-leaf/30 blur-3xl" />
    </>
  );
}

function Label({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
        dark ? "bg-white/10 text-white ring-1 ring-inset ring-white/20" : "bg-white text-brand ring-1 ring-brand/15 shadow-sm"
      }`}
    >
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <>
      <SocialProofTicker />
      <Navbar />

      <HeroLanding
        title="Defy Diabetes. Enjoy Food Again."
        description="GluFloat picks your breakfast, lunch and dinner, checks any food you crave, and shows you what each meal does to your sugar. Then it puts it all in one report for your doctor."
        announcementBanner={{
          text: "Reviewed by 7 registered dietitians",
          icon: <ShieldCheck className="h-4 w-4 text-leaf-bright" />,
        }}
        ctaSlot={
          <TrialCta className="group inline-flex items-center gap-2 rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(70,184,94,0.85)] transition-all hover:-translate-y-1 hover:bg-leaf-deep hover:shadow-[0_22px_44px_-12px_rgba(70,184,94,0.95)]" />
        }
        reassurance="7 days free. You do not need a card. After that it is N1,500 a month, and you can stop any time."
        media={
          <>
            <HeroDemo />
            {/* Hidden on a phone: at that width the demo fills the screen and
                the floating light sits on top of the card it is decorating. */}
            <div className="float-slow absolute -left-4 top-10 hidden rounded-2xl bg-white p-2.5 shadow-[0_18px_40px_-14px_rgba(6,26,50,0.6)] ring-1 ring-white/40 sm:block">
              <TrafficLight size="sm" active="cycle" />
            </div>
          </>
        }
      />

      {/* food marquee */}
      <div className="marquee overflow-hidden border-y border-line bg-white py-3">
        <div className="marquee-track flex w-max gap-8">
          {[...MARQUEE_FOODS, ...MARQUEE_FOODS].map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-ink-soft"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[f.v]}`} />
              {f.name}
            </span>
          ))}
        </div>
      </div>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="scroll-mt-24 bg-[#F4F7FB] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Label>How it works</Label>
            <h2 className={H2}>How GluFloat Fits Into Your Day</h2>
            <p className={LEAD}>
              A few taps around each meal. You keep eating the food you love, and you finally see
              what it does to your sugar.
            </p>
          </Reveal>

          <DayTimeline />

          <Reveal delay={120}>
            <div className="mt-14 overflow-hidden rounded-[32px] shadow-[0_30px_70px_-40px_rgba(11,46,92,0.6)]">
              <Image
                src="/img/family-meal.jpg"
                alt="An older couple laughing together over a meal of grilled chicken, brown rice, fish and vegetables"
                width={1400}
                height={980}
                className="h-auto max-h-[520px] w-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ TRY IT (sign-up CTA) ============
          An inset deep-blue panel on a white page, not a full-width slab: same
          blue as the hero, white type, and green only on the button. */}
      <section id="demo" className="scroll-mt-24 bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className={PANEL}>
          <Glow />
          <div className="relative mx-auto max-w-2xl">
            <Reveal className="text-center">
              <Label dark>Try it free</Label>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready To Check Your First Food?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-white/75">
                Make a free account, then use GluFloat for 7 days. No card needed.
              </p>
            </Reveal>

            <Reveal delay={150} className="mt-9">
              <div className="mx-auto flex max-w-md flex-col items-center rounded-[28px] bg-white p-7 shadow-[0_30px_60px_-24px_rgba(6,26,50,0.6)] sm:p-8">
                <ul className="mb-7 grid w-full gap-3 text-left text-ink sm:grid-cols-2">
                  {["No card needed", "Free for 7 days", "Stop any time", "Checked by 7 dietitians"].map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-sm font-medium">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf/15">
                        <Check className="h-3 w-3 text-leaf-deep" strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <TrialCta className="group flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] transition-all hover:-translate-y-0.5 hover:bg-leaf-deep" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ FOR YOUR DOCTOR: report + dietitian ============ */}
      <section className="bg-[#F4F7FB] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mb-12 text-center">
            <Label>For your doctor</Label>
            <h2 className={H2}>Go To Your Next Appointment With A Detailed Report</h2>
          </Reveal>
          <ReportShowcase />
        </div>
      </section>

      {/* ============ DIFFERENTIATION ============ */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Label>Why GluFloat</Label>
            <h2 className={H2}>
              Other Apps Don&apos;t Know Our Food. GluFloat Was Made For It.
            </h2>
            <p className={LEAD}>
              The popular food apps were built abroad. They don&apos;t know jollof, eba or amala,
              and they don&apos;t know we eat with soup. GluFloat knows over 1,400 of our own foods.
            </p>
          </Reveal>

          <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-2">
            <Reveal direction="left" className="h-full">
              <div className="h-full overflow-hidden rounded-[28px]">
                <Image
                  src="/img/nigerian-table.jpg"
                  alt="A woman smiling behind a full Nigerian table: jollof rice, efo riro, swallow, fried plantain and stew"
                  width={1000}
                  height={700}
                  className="h-full min-h-72 w-full object-cover"
                />
              </div>
            </Reveal>

            <Reveal direction="right" delay={120} className="h-full">
              <div className="h-full overflow-hidden rounded-[28px] bg-white ring-1 ring-ink/[0.07] shadow-[0_24px_50px_-32px_rgba(11,46,92,0.45)]">
                <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-ink/[0.06] text-sm font-bold">
                  <div className="px-5 py-4" />
                  <div className="px-2 py-4 text-center text-ink-soft">Other apps</div>
                  <div className="bg-brand px-2 py-4 text-center text-white">GluFloat</div>
                </div>
                {[
                  "Knows jollof, eba and amala",
                  "Checks your whole plate, not one food",
                  "Shows you how to fix it, never just no",
                  "Gives the size in things you can see",
                  "Shows what each meal did to your sugar",
                  "Price and payment in naira",
                ].map((row) => (
                  <div key={row} className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-ink/[0.05] text-sm last:border-b-0">
                    <div className="px-5 py-4 font-medium text-ink">{row}</div>
                    <div className="flex items-center justify-center py-4">
                      <X className="h-4 w-4 text-ink-soft/40" />
                    </div>
                    <div className="flex items-center justify-center bg-brand/[0.05] py-4">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-leaf text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ NUMBERS ============ */}
      <section className="bg-white px-4 pb-20 sm:px-6 sm:pb-28">
        <div className={PANEL}>
          <Glow />
          <div className="relative">
            <Reveal className="text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Simple, Fast, And Made For You
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { end: 1400, suffix: "+", unit: "Nigerian foods", label: "and we add more every month" },
                { end: 7, suffix: "", unit: "registered dietitians", label: "reviewed our food guidance" },
                { end: 3, suffix: "", unit: "clear colours", label: "green, yellow or red" },
                { end: 10, suffix: " sec", unit: "to an answer", label: "faster than dishing the food" },
              ].map((t, i) => (
                <Reveal key={t.unit} delay={i * 100}>
                  <div className="h-full rounded-[22px] bg-white/[0.08] p-6 text-center ring-1 ring-inset ring-white/15 backdrop-blur-sm">
                    <p className="font-display text-4xl font-bold tracking-tight text-white">
                      <CountUp end={t.end} suffix={t.suffix} />
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">{t.unit}</p>
                    <p className="mt-1 text-sm text-white/65">{t.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <Testimonials />

      {/* ============ JOY BAND ============ */}
      <section className="bg-[#F4F7FB] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 rounded-[32px] bg-white p-6 shadow-[0_24px_50px_-32px_rgba(11,46,92,0.45)] ring-1 ring-ink/[0.05] sm:p-10 lg:grid-cols-2">
            <Reveal direction="left">
              <div className="overflow-hidden rounded-[24px]">
                <Image
                  src="/img/kitchen-joy.jpg"
                  alt="A woman smiling in her kitchen over a bowl of salad, with fish, vegetables and fruit on the counter"
                  width={760}
                  height={720}
                  className="h-[22rem] w-full object-cover object-center sm:h-[26rem]"
                />
              </div>
            </Reveal>
            <Reveal direction="right" delay={120} className="text-center">
              <Label>Your food, your joy</Label>
              <h2 className={H2}>This Joy Can Be Yours Too</h2>
              <p className={LEAD}>
                You don&apos;t have to be afraid of your food. Eat what you love, the right way, and
                feel good after your meal.
              </p>
              <TrialCta className="group mt-8 inline-flex items-center gap-2 rounded-full bg-leaf px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] transition-all hover:-translate-y-0.5 hover:bg-leaf-deep" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <Pricing
              plans={PLANS}
              title="Plans And Pricing"
              description="7 days free on every plan. You do not need a card. Stop any time."
            />
          </Reveal>
          <Reveal delay={150} className="mt-8 text-center">
            <p className="text-sm text-ink-soft">
              One visit to the clinic costs more than a whole year of GluFloat.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="scroll-mt-24 bg-[#F4F7FB] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Label>Questions</Label>
            <h2 className={H2}>Things People Ask Before They Start</h2>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <FAQ />
          </Reveal>
        </div>
      </section>

      {/* ============ CLOSE ============ */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className={PANEL}>
          <Glow />
          <Reveal className="relative mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Tonight There Will Be Food On Your Table. You Can Guess, Or You Can Know.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Guessing means the same worry, and the same high sugar after you eat. Knowing takes
              ten seconds. The first 7 days are free, so you have nothing to lose.
            </p>
            <TrialCta className="group mt-8 inline-flex items-center gap-2 rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] transition-all hover:-translate-y-0.5 hover:bg-leaf-deep" />
            <p className="mt-4 text-sm text-white/60">
              7 days free, no card. Then N1,500 a month. Stop any time.
            </p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  );
}
