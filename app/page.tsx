import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import TrafficLight from "@/components/TrafficLight";
import SearchPanel from "@/components/SearchPanel";
import FAQ from "@/components/FAQ";
import { Hero } from "@/components/ui/animated-hero";
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
      <Navbar />

      <Hero />

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
              For most food, three simple things make it safe. We give you all
              three, in plain words.
            </p>
          </Reveal>

          <div className="mt-14 grid items-center gap-10 lg:grid-cols-[auto_1fr]">
            <Reveal direction="scale" className="mx-auto">
              <TrafficLight size="lg" active="cycle" />
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-3">
              <Reveal delay={0}>
                <div className="lift h-full rounded-2xl border border-line bg-mist p-6">
                  <p className="font-display text-4xl font-bold text-brand">1</p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                    How much to eat
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">
                    Eat a smaller size. We show the size in things you can see,
                    like the size of your fist, half a cup, or one handful.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="lift h-full rounded-2xl border border-line bg-mint p-6">
                  <p className="font-display text-4xl font-bold text-leaf">2</p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                    What to eat it with
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">
                    Add vegetable soup and some meat, fish, or egg. This slows
                    the sugar down so it does not rise fast.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={240}>
                <div className="lift h-full rounded-2xl border border-line bg-mist p-6">
                  <p className="font-display text-4xl font-bold text-brand">3</p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                    How often to eat it
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">
                    Some food is fine every day. Some is only for now and then.
                    We tell you which is which.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>

          {/* the fix, made plain */}
          <Reveal delay={100}>
            <div className="mt-16 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-mist via-white to-mint">
              <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2">
                <div>
                  <h3 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                    When your food is not green, we do not just say no.
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-ink-soft">
                    We show you what to change to make it good. Eat a smaller
                    size. Add soup. Add fish. Then watch the colour change to
                    green, right in front of you.
                  </p>
                  <Link
                    href="/trial"
                    className="group mt-6 inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(62,155,79,0.8)] transition-all hover:-translate-y-0.5 hover:bg-leaf-deep"
                  >
                    Build a meal and see it work
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
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
                      Eat a smaller size of the pounded yam, like the size of
                      your fist. Now the whole food is{" "}
                      <span className="font-bold text-leaf-deep">green</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ LIVE DEMO ============ */}
      <section id="demo" className="relative overflow-hidden bg-mist py-20 sm:py-24">
        <div className="dots absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Label>See it work</Label>
            <h2 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">
              Type a food you eat. Get the answer now.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-display text-lg text-ink-soft">
              Try a few for free, right here. The answer comes back before you
              finish typing.
            </p>
          </Reveal>

          <Reveal delay={150} className="mt-8">
            <SearchPanel />
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
                  src="/img/jollof.jpg"
                  alt="Jollof rice with fish and pepper on the side"
                  width={800}
                  height={533}
                  className="h-56 w-full object-cover transition-transform duration-700 hover:scale-105"
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
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-bright to-leaf py-16 text-white">
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
              { end: 200, suffix: "+", unit: "checks a minute", label: "by people just like you" },
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
                  src="/img/joy-kitchen.jpg"
                  alt="A woman laughing happily in her kitchen, surrounded by food"
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
                className="group mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-leaf px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-1"
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
              <div className="bg-gradient-to-r from-brand to-leaf px-8 py-5 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-white">
                  Glufloat membership
                </p>
              </div>
              <div className="p-8 text-center">
                <p className="text-base font-semibold text-leaf-deep">
                  Your first 3 days are free. You do not need a card.
                </p>
                <p className="mt-3 font-display text-5xl font-bold text-ink">
                  N1,500
                  <span className="text-lg font-medium text-ink-soft">
                    {" "}
                    a month after that
                  </span>
                </p>
                <p className="mt-1 text-ink-soft">That is about N50 a day.</p>

                <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left text-ink">
                  {[
                    "Check as many foods as you want, all 1,400+ of them",
                    "Build a full meal and get the fix that makes it green",
                    "See the safe size, what to eat it with, and how often",
                    "Works on any phone, right away",
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
                  className="group mt-8 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-leaf px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-1"
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
