import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import TrafficLight from "@/components/TrafficLight";
import SearchPanel from "@/components/SearchPanel";
import FAQ from "@/components/FAQ";
import { NESTUGE_URL } from "@/lib/access";

const MARQUEE_FOODS: { name: string; v: "green" | "yellow" | "red" }[] = [
  { name: "Eba", v: "yellow" },
  { name: "Egusi soup", v: "green" },
  { name: "Jollof rice", v: "yellow" },
  { name: "Moi moi", v: "green" },
  { name: "Dodo", v: "red" },
  { name: "Pepper soup", v: "green" },
  { name: "Pounded yam", v: "yellow" },
  { name: "Suya", v: "green" },
  { name: "Agege bread", v: "red" },
  { name: "Ofada rice", v: "yellow" },
  { name: "Efo riro", v: "green" },
  { name: "Puff puff", v: "red" },
  { name: "Boiled unripe plantain", v: "green" },
  { name: "Amala", v: "yellow" },
  { name: "Zobo (no sugar)", v: "green" },
  { name: "Soft drinks", v: "red" },
  { name: "Okra soup", v: "green" },
  { name: "Semovita", v: "yellow" },
];

const DOT = {
  green: "bg-verdict-green",
  yellow: "bg-verdict-yellow",
  red: "bg-verdict-red",
} as const;

export default function Home() {
  return (
    <>
      <Navbar />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mist via-white to-white pb-16 pt-28 sm:pt-32">
        <div className="dots absolute inset-x-0 top-0 h-72 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="rise text-xs font-bold uppercase tracking-[0.2em] text-leaf-deep" style={{ ["--rise-delay" as string]: "0ms" }}>
                For Nigerians living with diabetes, and the people who cook for them
              </p>
              <h1
                className="rise mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
                style={{ ["--rise-delay" as string]: "120ms" }}
              >
                Know if a food is right for your diabetes,{" "}
                <span className="text-brand">before you eat it.</span>
              </h1>
              <p
                className="rise mt-6 max-w-xl text-lg leading-relaxed text-ink-soft"
                style={{ ["--rise-delay" as string]: "240ms" }}
              >
                Search any Nigerian food, or build your full plate. Eba, egusi,
                fish. Glufloat answers in one tap: green, yellow, or red. And
                when it is not green, it shows you the exact fix that turns it
                green.
              </p>
              <div
                className="rise mt-8 flex flex-wrap items-center gap-4"
                style={{ ["--rise-delay" as string]: "360ms" }}
              >
                <Link
                  href="/trial"
                  className="rounded-full bg-brand px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-1 hover:bg-brand-deep hover:shadow-[0_18px_36px_-10px_rgba(27,95,170,0.8)]"
                >
                  Start my 7-day free trial
                </Link>
                <Link
                  href="#demo"
                  className="rounded-full border-2 border-line bg-white px-7 py-[14px] text-base font-semibold text-ink transition-all hover:-translate-y-1 hover:border-leaf hover:text-leaf-deep"
                >
                  Try 3 checks free
                </Link>
              </div>
              <p
                className="rise mt-4 text-sm text-ink-soft"
                style={{ ["--rise-delay" as string]: "440ms" }}
              >
                7 days free, no card needed. Then N1,500 a month, about N50 a
                day. Cancel any time.
              </p>
            </div>

            {/* hero visual */}
            <div
              className="rise relative mx-auto w-full max-w-md"
              style={{ ["--rise-delay" as string]: "300ms" }}
            >
              <div className="relative overflow-hidden rounded-3xl shadow-[0_30px_60px_-20px_rgba(12,45,77,0.45)]">
                <Image
                  src="/img/swallow.jpg"
                  alt="A small swallow mould beside a bowl of vegetable soup"
                  width={720}
                  height={480}
                  priority
                  className="h-72 w-full object-cover sm:h-80"
                />
              </div>

              <div className="float-slow absolute -left-4 top-6 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur sm:-left-8">
                <TrafficLight size="sm" active="cycle" />
              </div>

              <div className="float-slower absolute -bottom-5 -right-2 w-56 rounded-2xl bg-white p-4 shadow-xl sm:-right-6">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-verdict-yellow" />
                  <p className="text-xs font-bold text-ink">Eba + efo riro + fish</p>
                </div>
                <p className="mt-2 text-[11px] leading-snug text-ink-soft">
                  Cut the eba to one small mould and this plate turns{" "}
                  <span className="font-bold text-leaf-deep">green</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="marquee mt-16 overflow-hidden border-y border-line bg-white py-3">
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
      </section>

      {/* ============ STORY LEAD ============ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal direction="left">
              <div className="relative">
                <div className="overflow-hidden rounded-3xl">
                  <Image
                    src="/img/market.jpg"
                    alt="A market stall full of fresh vegetables and fruit"
                    width={800}
                    height={533}
                    className="h-80 w-full object-cover transition-transform duration-700 hover:scale-105 sm:h-96"
                  />
                </div>
                <div className="absolute -bottom-6 left-6 rounded-2xl bg-ink p-5 text-white shadow-2xl">
                  <p className="font-display text-3xl font-bold">8 years</p>
                  <p className="mt-1 text-xs text-white/70">
                    of hearing the same question
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal direction="right" delay={120}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                Why Glufloat exists
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                It started with one question. <br />
                <span className="text-leaf-deep">&ldquo;What can I eat?&rdquo;</span>
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
                <p>
                  Our founder&apos;s mum has lived with diabetes for more than
                  eight years. And for eight years she has asked him the same
                  question, meal after meal.
                </p>
                <p>
                  It is not that she does not care about her health. It is that
                  nobody could tell her, plate by plate, what was safe. So she
                  lived on unripe plantain and food with no taste. Food that
                  gave her no joy, only fear.
                </p>
                <p>
                  Having diabetes should not mean giving up the food you grew
                  up eating. It should just mean knowing how to eat it the
                  right way. That is the gap Glufloat closes, for her and for
                  every Nigerian asking the same question tonight.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ VILLAIN ============ */}
      <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-24">
        <div className="grain absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-verdict-yellow">
              It is not your fault
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              The advice out there was never built for your plate.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 text-left sm:grid-cols-3">
            <Reveal delay={0}>
              <div className="lift h-full rounded-2xl bg-white/5 p-6 backdrop-blur">
                <p className="text-2xl">🌍</p>
                <h3 className="mt-3 font-display text-lg font-semibold">
                  Foreign apps
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  The big food trackers were built on Western food lists. None
                  of them know what eba, amala, or ofada rice does to blood
                  sugar, or that swallow is eaten with soup, in a mould.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="lift h-full rounded-2xl bg-white/5 p-6 backdrop-blur">
                <p className="text-2xl">📄</p>
                <h3 className="mt-3 font-display text-lg font-semibold">
                  Static meal plans
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Blog posts, ebooks, and PDF plans tell you what to eat once,
                  then never adjust to what is actually on your plate today.
                </p>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="lift h-full rounded-2xl bg-white/5 p-6 backdrop-blur">
                <p className="text-2xl">🚫</p>
                <h3 className="mt-3 font-display text-lg font-semibold">
                  The blunt &ldquo;no&rdquo;
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  &ldquo;Avoid rice. Avoid swallow. Avoid everything.&rdquo;
                  So people either give up the food they love, or eat blind and
                  deal with the spike after.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <p className="mx-auto mt-12 max-w-2xl text-lg leading-relaxed text-white/85">
              So you end up choosing between fear and flavour. Glufloat was
              built so you never have to make that choice again.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ MECHANISM ============ */}
      <section id="how" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
              How Glufloat works
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
              A traffic light that answers{" "}
              <span className="text-brand">how to eat</span>, not just whether.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
              Most foods are not simply good or bad. What matters is three
              levers, and Glufloat hands you all three on every food.
            </p>
          </Reveal>

          <div className="mt-14 grid items-center gap-12 lg:grid-cols-[auto_1fr]">
            <Reveal direction="left" className="mx-auto">
              <TrafficLight size="lg" active="cycle" />
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-3">
              <Reveal delay={0}>
                <div className="lift h-full rounded-2xl border border-line bg-mist p-6">
                  <p className="font-display text-4xl font-bold text-brand">1</p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                    Portion
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    One small fist-size mould of eba is a different food from a
                    mountain of it. Every answer states the safe portion.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="lift h-full rounded-2xl border border-line bg-mint p-6">
                  <p className="font-display text-4xl font-bold text-leaf">2</p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                    Pairing
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    Vegetable soup and protein slow how fast starch turns to
                    sugar. Glufloat tells you exactly what to put beside it.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={240}>
                <div className="lift h-full rounded-2xl border border-line bg-mist p-6">
                  <p className="font-display text-4xl font-bold text-brand">3</p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-ink">
                    Frequency
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    Some foods are fine daily. Some are a once-in-a-while
                    treat. You will always know which is which.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>

          {/* the fix, dramatized */}
          <Reveal delay={100}>
            <div className="mt-16 overflow-hidden rounded-3xl border border-line bg-gradient-to-r from-mist to-mint">
              <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2">
                <div>
                  <h3 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                    And when a meal is not green? You get the fix, never a dead
                    end.
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-ink-soft">
                    Build your plate the way you would really eat it. Glufloat
                    scores the combination, then shows the moves that change
                    the verdict. Shrink the swallow. Add a protein. Swap the
                    drink. Watch yellow turn green in front of you.
                  </p>
                  <Link
                    href="/app"
                    className="mt-6 inline-block rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(62,155,79,0.8)] transition-all hover:-translate-y-0.5 hover:bg-leaf-deep"
                  >
                    Open the Meal Builder
                  </Link>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
                    Example plate
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
                      <span className="text-ink">Pounded yam (normal)</span>
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
                  <div className="mt-4 rounded-xl bg-mint p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-leaf-deep">
                      The fix
                    </p>
                    <p className="mt-1.5 text-sm text-ink">
                      Make the pounded yam a half portion, and this whole plate
                      goes <span className="font-bold text-leaf-deep">GREEN</span>.
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-leaf-deep">
              Feel it work, right now
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
              Check a food. No sign-up. 3 free checks.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-ink-soft">
              Type a food you ate today and watch the answer come back before
              you finish typing.
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
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                Why nothing else compares
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                Global apps track calories. <br /> Glufloat understands{" "}
                <span className="text-leaf-deep">your food.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-ink-soft">
                GoCoCo, SNAQ, Glucose Buddy, Undermyfork. Fine tools, built on
                global food databases. Ask any of them about eba and soup in a
                mould, and they go quiet. Glufloat was built from day one
                around 143 Nigerian foods, how they are cooked, and how they
                are actually eaten. And it is the only one that always hands
                you the fix.
              </p>

              <div className="relative mt-8 overflow-hidden rounded-3xl">
                <Image
                  src="/img/jollof.jpg"
                  alt="A Nigerian spread of jollof rice, grilled fish, and peppered skewers"
                  width={800}
                  height={533}
                  className="h-56 w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            </Reveal>

            <Reveal direction="right" delay={120}>
              <div className="overflow-hidden rounded-3xl border border-line shadow-[0_20px_50px_-24px_rgba(12,45,77,0.4)]">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-ink text-xs font-bold uppercase tracking-wider text-white">
                  <div className="px-4 py-3.5"></div>
                  <div className="px-2 py-3.5 text-center text-white/60">
                    Global apps
                  </div>
                  <div className="bg-brand px-2 py-3.5 text-center">Glufloat</div>
                </div>
                {[
                  ["Knows eba, amala, ofada", "✗", "✓"],
                  ["Scores your full plate, not one item", "✗", "✓"],
                  ["Hands you the fix, never a flat no", "✗", "✓"],
                  ["Portion advice in moulds and fists", "✗", "✓"],
                  ["Built for Nigerian pockets", "✗", "✓"],
                  ["Naira pricing, local payment", "✗", "✓"],
                ].map(([row, them, us], i) => (
                  <div
                    key={row}
                    className={`grid grid-cols-[1.4fr_1fr_1fr] text-sm ${
                      i % 2 ? "bg-mist/60" : "bg-white"
                    }`}
                  >
                    <div className="px-4 py-3.5 font-medium text-ink">{row}</div>
                    <div className="px-2 py-3.5 text-center font-bold text-verdict-red/70">
                      {them}
                    </div>
                    <div className="bg-mint/70 px-2 py-3.5 text-center font-bold text-leaf-deep">
                      {us}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ TRUST BAND ============ */}
      <section className="border-y border-line bg-mist py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Built with care, because you act on these answers.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                stat: "143",
                label: "Nigerian foods curated one by one, growing monthly",
              },
              {
                stat: "Rx",
                label:
                  "Founded by a pharmacist who has lived this question at home for 8 years",
              },
              {
                stat: "10s",
                label:
                  "from typing a food to a clear answer. Faster than dishing the plate",
              },
              {
                stat: "13k+",
                label:
                  "members already in our team's existing community, launching with us",
              },
            ].map((t, i) => (
              <Reveal key={t.stat + i} delay={i * 100}>
                <div className="lift h-full rounded-2xl border border-line bg-white p-6 text-center">
                  <p className="font-display text-4xl font-bold text-brand">
                    {t.stat}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {t.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-ink-soft">
              Glufloat is educational food information, not medical advice. Our
              founder is a Tony Elumelu Foundation grantee whose work has been
              recognised by Today Africa and the African Impact Challenge.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
              Simple pricing
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
              Less than one bottle of malt a week.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
              One clinic consultation costs more than a whole year of Glufloat.
              And the malt drink? That one is red anyway.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-12 max-w-lg overflow-hidden rounded-3xl border-2 border-brand/20 bg-white shadow-[0_30px_60px_-25px_rgba(27,95,170,0.45)]">
              <div className="bg-gradient-to-r from-brand to-leaf px-8 py-5 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-white">
                  Glufloat Membership
                </p>
              </div>
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-leaf-deep">
                  First 7 days: N0. No card needed.
                </p>
                <p className="mt-2 font-display text-5xl font-bold text-ink">
                  N1,500
                  <span className="text-lg font-medium text-ink-soft">
                    {" "}
                    / month after
                  </span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">About N50 a day.</p>

                <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left text-sm text-ink">
                  {[
                    "Unlimited food checks on all 143 foods, growing monthly",
                    "The full Meal Builder with the fix on every plate",
                    "Portion, pairing, and frequency guidance on everything",
                    "Works on any smartphone browser, instantly",
                    "Cancel any time in two taps. No questions, no calls",
                  ].map((b) => (
                    <li key={b} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-verdict-green/15 text-xs font-bold text-leaf-deep">
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/trial"
                  className="mt-8 block rounded-full bg-brand px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-1 hover:bg-brand-deep"
                >
                  Start my 7-day free trial
                </Link>
                <p className="mt-3 text-xs text-ink-soft">
                  Nothing is charged during the trial. When your week ends,
                  subscribe in minutes through our secure Nestuge checkout.
                  Already tried it?{" "}
                  <a
                    href={NESTUGE_URL}
                    className="font-semibold text-brand hover:underline"
                  >
                    Subscribe now
                  </a>
                  .
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
              Questions, answered straight
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
              Everything people ask before they start.
            </h2>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <FAQ />
          </Reveal>
        </div>
      </section>

      {/* ============ TWO PATHS CLOSE ============ */}
      <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-24">
        <div className="grain absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              Tonight, there will be food on your table. <br />
              You can guess. Or you can know.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/75">
              One path is the same guessing, the same fear, the same quiet
              spike after dinner. The other is a 10-second check and a plate
              you feel sure about. The trial is free for 7 days. The only thing
              you risk by trying is one less worry.
            </p>
            <Link
              href="/trial"
              className="mt-8 inline-block rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] transition-all hover:-translate-y-1 hover:bg-leaf-deep"
            >
              Start my 7-day free trial
            </Link>
            <p className="mt-4 text-sm text-white/60">
              7 days free, no card needed. Then N1,500 a month. Cancel any
              time.
            </p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  );
}
