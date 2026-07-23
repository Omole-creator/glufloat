import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Search,
  ShieldCheck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SocialProofTicker from "@/components/SocialProofTicker";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import TrafficLight from "@/components/TrafficLight";
import FAQ from "@/components/FAQ";
import { HeroLanding } from "@/components/ui/hero-1";
import FeatureCards, { type Feature } from "@/components/ui/feature-cards";
import HeroDemo from "@/components/ui/hero-demo";
import { Testimonials } from "@/components/ui/testimonial-v2";
import CountUp from "@/components/CountUp";

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

// What the app hands you. NOT the food method itself: the size, the pairing and
// the frequency are experienced inside /app, never taught for free out here.
const ICON = "h-6 w-6";
const WHAT_YOU_GET: Feature[] = [
  {
    icon: <UtensilsCrossed className={ICON} strokeWidth={2.2} />,
    title: "Get Meal Recommendations",
    text: "Personalized breakfast, lunch, and dinner suggestions based on your health profile.",
    tone: "green",
  },
  {
    icon: <Search className={ICON} strokeWidth={2.2} />,
    title: "Search & Build Your Own Meals",
    text: "Look up any meal, see if it's right for you, and create meals your way.",
    tone: "blue",
  },
  {
    icon: <FileText className={ICON} strokeWidth={2.2} />,
    title: "Share with Your Doctor",
    text: "Generate a comprehensive food report to support better conversations during appointments.",
    tone: "green",
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-leaf/10 px-3 py-1 text-sm font-semibold text-leaf-deep">
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
        description="Get personalized meal recommendations, search any food you're craving, or build your own meals. GluFloat keeps track of everything and generates food reports for your doctor."
        announcementBanner={{
          text: "Reviewed by 6 registered dietitians",
          icon: <ShieldCheck className="h-4 w-4 text-leaf-bright" />,
        }}
        callToActions={[
          {
            text: "Start my 3-day free trial",
            href: "/trial",
            variant: "primary",
          },
        ]}
        reassurance="3 days free. You do not need a card. After that it is N1,500 a month, and you can stop any time."
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
      <section id="how" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Label>How it works</Label>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
              You do not have to give up your food. You just have to eat it the
              right way.
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-display text-lg leading-relaxed text-ink-soft">
              For almost any food there is a simple way to make it work for you.
              Glufloat finds it and shows it to you in plain words, so you never
              have to guess at your plate again.
            </p>
          </Reveal>

          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[auto_1fr]">
            <Reveal direction="scale" className="mx-auto">
              <TrafficLight size="lg" active="cycle" />
            </Reveal>

            <FeatureCards features={WHAT_YOU_GET} />
          </div>

          {/* The picture that closes the three cards: this is what the whole
              thing is for. Sits directly under "Share with Your Doctor". */}
          <Reveal delay={120}>
            <div className="mt-12 overflow-hidden rounded-3xl shadow-[0_28px_60px_-28px_rgba(12,42,71,0.5)]">
              <Image
                src="/img/family-meal.jpg"
                alt="An older couple laughing together over a meal of grilled chicken, brown rice, fish and vegetables"
                width={1400}
                height={980}
                className="h-auto w-full object-cover"
              />
            </div>
          </Reveal>

          {/* the fix, made plain */}
          <Reveal delay={100}>
            <div className="mt-16 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-mist via-white to-mint">
              <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2">
                <div>
                  <h3 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                    When your food is not green, we do not just say no.
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                    We show you the one small change that makes it good, and you
                    watch the colour turn to green right in front of you. There
                    is nothing for you to work out on your own, because Glufloat
                    has already done it for you.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-lg">
                  <p className="text-sm font-semibold text-ink-soft">
                    Your food tonight
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
                      <span className="text-ink">Pounded yam, normal size</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-verdict-yellow" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
                      <span className="text-ink">Egusi soup</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-verdict-green" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
                      <span className="text-ink">Goat meat</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-verdict-green" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-mint p-4">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-leaf-deep" />
                    <p className="text-sm text-ink">
                      Make the small change Glufloat shows you and the whole
                      meal turns{" "}
                      <span className="font-bold text-leaf-deep">green</span>.
                      That is your dinner sorted, with no worry after you eat.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ TRY IT (sign-up CTA) ============
          A second full brand-blue section, so the page is not one coloured hero
          on a white page. Same canvas as the hero, same rule: white type, and
          green only on the button. */}
      <section
        id="demo"
        className="relative overflow-hidden bg-gradient-to-b from-[#0d3568] via-[#14538f] to-[#1b5faa] py-20 sm:py-24"
      >
        <div className="dots-light absolute inset-0 opacity-40" aria-hidden />
        <div className="grain absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white ring-1 ring-inset ring-white/25">
              Try it free
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
              Ready to check your first food?
            </h2>
            <p className="mx-auto mt-4 max-w-md font-display text-lg leading-relaxed text-white/75">
              Make a free account, then check any food you eat for the next 3
              days. No card needed.
            </p>
          </Reveal>

          <Reveal delay={150} className="mt-8">
            <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl bg-white p-8 shadow-[0_30px_60px_-24px_rgba(6,26,50,0.6)]">
              <ul className="mb-7 grid w-full gap-3 text-left text-ink sm:grid-cols-2">
                {[
                  "No card needed",
                  "Free for 3 days",
                  "Stop any time",
                  "Checked by 6 dietitians",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm font-medium">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-verdict-green/15">
                      <Check className="h-3 w-3 text-leaf-deep" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <Link
                href="/trial"
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] hover:bg-leaf-deep transition-all hover:-translate-y-1"
              >
                Start my 3-day free trial
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-3 text-center text-sm text-ink-soft">
                You sign up first, then check any food you eat.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ DIFFERENTIATION ============ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal direction="left">
              <Label>Why Glufloat</Label>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                Other apps do not know our food. <br /> Glufloat was made for it.
              </h2>
              <p className="mt-5 font-display text-lg leading-relaxed text-ink-soft">
                The popular food apps were built abroad. They do not know
                jollof, eba, or amala, and they do not know we eat with soup.
                Glufloat knows over 1,400 of our own foods, and it always shows
                you how to make a food safe.
              </p>

              <div className="relative mt-8 overflow-hidden rounded-3xl">
                <Image
                  src="/img/nigerian-table.jpg"
                  alt="A woman smiling behind a full Nigerian table: jollof rice, efo riro, swallow, fried plantain and stew"
                  width={1000}
                  height={700}
                  className="h-72 w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </Reveal>

            <Reveal direction="right" delay={120}>
              <div className="overflow-hidden rounded-3xl border border-line shadow-[0_20px_50px_-24px_rgba(12,42,71,0.4)]">
                <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-ink text-sm font-bold text-white">
                  <div className="px-4 py-4"></div>
                  <div className="px-2 py-4 text-center text-white/60">
                    Other apps
                  </div>
                  <div className="bg-brand px-2 py-4 text-center">Glufloat</div>
                </div>
                {[
                  "Knows jollof, eba, and amala",
                  "Checks your whole food, not one part",
                  "Shows you how to fix it, never just no",
                  "Gives the size in things you can see",
                  "Made for how we really eat",
                  "Price and payment in naira",
                ].map((row, i) => (
                  <div
                    key={row}
                    className={`group grid grid-cols-[1.5fr_1fr_1fr] text-sm transition-colors hover:bg-mint/50 ${
                      i % 2 ? "bg-mist/50" : "bg-white"
                    }`}
                  >
                    <div className="px-4 py-4 font-medium text-ink">{row}</div>
                    <div className="flex items-center justify-center py-4">
                      <X className="h-5 w-5 text-verdict-red/60" />
                    </div>
                    <div className="flex items-center justify-center bg-mint/60 py-4 transition-transform group-hover:scale-110">
                      <Check className="h-5 w-5 text-leaf-deep" />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ TRUST BAND (dynamic, coloured) ============ */}
      {/* Solid brand blue. It used to fade blue into green, which is the kind of
          two-colour blend the founder ruled out: it is one colour or the other. */}
      <section className="relative overflow-hidden bg-brand py-16 text-white">
        <div className="grain absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Simple, fast, and made for you.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { end: 1400, suffix: "+", unit: "Nigerian foods", label: "and we add more every month" },
              { end: 6, suffix: "", unit: "registered dietitians", label: "reviewed our food guidance" },
              { end: 3, suffix: "", unit: "clear colours", label: "green, yellow, or red. That is all" },
              { end: 10, suffix: " sec", unit: "to an answer", label: "faster than dishing the food" },
            ].map((t, i) => (
              <Reveal key={t.unit} delay={i * 100}>
                <div className="lift h-full rounded-2xl bg-white/12 p-6 text-center backdrop-blur-sm ring-1 ring-white/20">
                  <p className="font-display text-4xl font-bold">
                    <CountUp end={t.end} suffix={t.suffix} />
                  </p>
                  <p className="mt-1 font-display text-sm font-semibold text-white">
                    {t.unit}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {t.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <Testimonials />

      {/* ============ JOY BAND ============ */}
      <section className="bg-white pb-20 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-mint via-mist to-white p-8 shadow-[0_20px_50px_-28px_rgba(12,42,71,0.35)] sm:p-10 lg:grid-cols-2">
            <Reveal direction="left" className="mx-auto">
              <div className="overflow-hidden rounded-3xl shadow-[0_24px_50px_-20px_rgba(12,42,71,0.4)]">
                <Image
                  src="/img/kitchen-joy.jpg"
                  alt="A woman smiling in her kitchen over a bowl of salad, with fish, vegetables and fruit on the counter"
                  width={760}
                  height={720}
                  className="h-[24rem] w-full max-w-sm object-cover object-center"
                />
              </div>
            </Reveal>

            <Reveal direction="right" delay={120}>
              <Label>Your food, your joy</Label>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                This joy can be yours too.
              </h2>
              <p className="mt-5 font-display text-lg leading-relaxed text-ink-soft">
                You do not have to fear your food. Eat what you love, the right
                way, and feel good after every meal. No more guessing, no more
                worry, just your food and your peace of mind.
              </p>
              <Link
                href="/trial"
                className="group mt-7 inline-flex items-center gap-2 rounded-full bg-leaf px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] hover:bg-leaf-deep transition-all hover:-translate-y-1"
              >
                Start my 3-day free trial
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Label>Price</Label>
            <h2 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">
              Less than N50 a day.
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-display text-lg leading-relaxed text-ink-soft">
              One visit to the clinic costs more than a whole year of Glufloat.
              Start free for 3 days and see for yourself.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-12 max-w-lg overflow-hidden rounded-3xl border-2 border-brand/20 bg-white shadow-[0_30px_60px_-25px_rgba(27,95,170,0.45)]">
              <div className="bg-brand px-8 py-5 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-white">
                  Glufloat membership
                </p>
              </div>
              <div className="p-8 text-center">
                <p className="text-base font-semibold text-leaf-deep">
                  Your first 3 days are free. You do not need a card.
                </p>
                {/* The price, and nothing else. The founder cut the "a month
                    after that" tail and the "about N50 a day" line: one number,
                    said once. */}
                <p className="mt-3 font-display text-5xl font-bold text-ink">
                  N1,500
                  <span className="text-lg font-medium text-ink-soft">
                    /month
                  </span>
                </p>

                <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left text-ink">
                  {[
                    "Check any food, all 1,400+ of them",
                    "A safe meal to eat, picked for you every day",
                    "Build your plate and watch it turn green",
                    "Keep a record of your meals for your doctor",
                    "A gentle reminder before each meal",
                    "Stop any time. It is easy",
                  ].map((b) => (
                    <li key={b} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-verdict-green/15">
                        <Check className="h-3 w-3 text-leaf-deep" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/trial"
                  className="group mt-8 flex items-center justify-center gap-2 rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] hover:bg-leaf-deep transition-all hover:-translate-y-1"
                >
                  Start my 3-day free trial
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <p className="mt-3 text-sm text-ink-soft">
                  Nothing is taken from you during the free trial.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="bg-mist py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Label>Questions</Label>
            <h2 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">
              Things people ask before they start.
            </h2>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <FAQ />
          </Reveal>
        </div>
      </section>

      {/* ============ CLOSE ============ */}
      <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-24">
        <div className="grain absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              Tonight there will be food on your table. <br />
              You can guess, or you can know.
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-display text-lg leading-relaxed text-white/75">
              Guessing means the same worry, and the same high sugar after you
              eat. Knowing takes ten seconds and a meal you feel good about. The
              first 3 days are free, so you risk nothing.
            </p>
            <Link
              href="/trial"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] transition-all hover:-translate-y-1 hover:bg-leaf-deep"
            >
              Start my 3-day free trial
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="mt-4 text-sm text-white/60">
              3 days free, no card. Then N1,500 a month. Stop any time.
            </p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  );
}
