import type { Metadata } from "next";
import Image from "next/image";
import { Eye, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import TrialCta from "@/components/TrialCta";

export const metadata: Metadata = {
  title: "About Us | Glufloat",
  description:
    "GluFloat is a digital health startup helping people living with diabetes make better food choices without giving up the meals they love.",
};

// The founders' own words (2026-10-09). Change them only on their say.
const FOUNDERS = [
  {
    name: "Omole Usuangbon",
    photo: "/img/founder.jpg",
    bio: "Omole Usuangbon is a pharmacist, entrepreneur, and one of the founders of GluFloat. Drawing on his pharmacy background and passion for digital health, he co-founded GluFloat to make diabetes nutrition simple and practical for Africans. He is also the founder of JobMingle, a career development platform that has helped thousands of people access digital skills and employment opportunities.",
  },
  {
    name: "Favour Chiamaka",
    photo: "/img/cofounder-favour.jpg",
    bio: "Favour Chiamaka is a registered dietitian with four years of practice and one of the founders of GluFloat. Drawing on her expertise in nutrition and diabetes care, she helps people living with diabetes enjoy familiar African foods while making smarter food choices. Through GluFloat, she helps users make practical, personalised food decisions that support steadier blood sugar without giving up the meals they grew up eating.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* About GluFloat */}
        <section className="relative overflow-hidden bg-gradient-to-b from-mist via-white to-white pb-16 pt-28 sm:pt-32">
          <div className="dots pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf/10 px-3 py-1 text-sm font-semibold text-leaf-deep">
                About GluFloat
              </span>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-5xl">
                Helping people eat well, without giving up the food they love.
              </h1>
            </Reveal>
            <Reveal delay={240}>
              <p className="mx-auto mt-6 max-w-2xl font-display text-lg leading-relaxed text-ink-soft">
                GluFloat is a digital health startup helping people living with
                diabetes make better food choices without giving up the meals
                they love. We provide practical, culturally relevant guidance
                that simplifies diabetes nutrition, empowering users to manage
                their blood sugar with confidence through easy-to-understand
                tools, education, and technology.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Mission and vision. A brand-blue band, so the page is not one long
            white scroll and these two lines carry the weight they should. */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0d3568] via-[#14538f] to-[#1b5faa] py-16 sm:py-20">
          <div className="dots-light absolute inset-0 opacity-40" aria-hidden />
          <div className="grain absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl bg-white/10 p-7 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
                  <Target className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <h2 className="mt-4 font-display text-xl font-bold text-white">
                  Our mission
                </h2>
                <p className="mt-2 text-lg leading-relaxed text-white/80">
                  To help people living with diabetes eat with confidence, every
                  single day.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="h-full rounded-3xl bg-white/10 p-7 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
                  <Eye className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <h2 className="mt-4 font-display text-xl font-bold text-white">
                  Our vision
                </h2>
                <p className="mt-2 text-lg leading-relaxed text-white/80">
                  To become the world&apos;s most trusted nutrition companion for
                  people living with diabetes.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Meet the founders */}
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-5xl space-y-16 px-4 sm:px-6 sm:space-y-20">
            <Reveal>
              <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">
                Meet the Founders
              </h2>
            </Reveal>
            {FOUNDERS.map((f, i) => (
              <div
                key={f.name}
                className={
                  i % 2
                    ? "grid items-center gap-10 md:grid-cols-[1fr_320px]"
                    : "grid items-center gap-10 md:grid-cols-[320px_1fr]"
                }
              >
                <Reveal
                  direction={i % 2 ? "right" : "left"}
                  className={i % 2 ? "mx-auto md:order-2" : "mx-auto"}
                >
                  <div className="overflow-hidden rounded-3xl shadow-[0_24px_50px_-20px_rgba(12,42,71,0.45)]">
                    <Image
                      src={f.photo}
                      alt={`${f.name}, one of the founders of GluFloat`}
                      width={320}
                      height={366}
                      className="h-auto w-72 object-cover"
                    />
                  </div>
                </Reveal>

                <Reveal direction={i % 2 ? "left" : "right"} delay={120}>
                  <h3 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                    {f.name}
                  </h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
                    {f.bio}
                  </p>
                </Reveal>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-mist py-16">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <Reveal>
              <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                Ready to know your food?
              </h2>
              <TrialCta className="group mt-6 inline-flex items-center gap-2 rounded-full bg-leaf px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] hover:bg-leaf-deep transition-all hover:-translate-y-1" />
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
