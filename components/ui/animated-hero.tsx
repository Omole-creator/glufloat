"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TrafficLight from "@/components/TrafficLight";

function Hero() {
  const [index, setIndex] = useState(0);
  const foods = useMemo(() => ["rice", "eba", "jollof", "yam", "bread", "beans"], []);

  useEffect(() => {
    const id = setTimeout(() => {
      setIndex((n) => (n === foods.length - 1 ? 0 : n + 1));
    }, 1900);
    return () => clearTimeout(id);
  }, [index, foods]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-mist via-white to-white pb-14 pt-24 sm:pt-28">
      <div
        className="dots pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60"
        aria-hidden
      />
      {/* soft green glow, top right */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-leaf-bright/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* text */}
          <div className="order-2 lg:order-1">
            <div
              className="rise inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 text-sm font-medium text-ink-soft shadow-sm backdrop-blur"
              style={{ ["--rise-delay" as string]: "0ms" }}
            >
              <span className="h-2 w-2 rounded-full bg-leaf-bright" />
              For Nigerians living with diabetes
            </div>

            <h1
              className="rise mt-5 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl"
              style={{ ["--rise-delay" as string]: "120ms" }}
            >
              Know if your
              <span className="relative block h-[1.25em] overflow-hidden pb-1 text-leaf-deep">
                {foods.map((word, i) => (
                  <motion.span
                    key={word}
                    className="absolute left-0 top-0"
                    initial={{ opacity: 0, y: 60 }}
                    transition={{ type: "spring", stiffness: 60, damping: 12 }}
                    animate={
                      index === i
                        ? { y: 0, opacity: 1 }
                        : { y: index > i ? -70 : 70, opacity: 0 }
                    }
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              is okay to eat.
            </h1>

            <p
              className="rise mt-5 max-w-md text-lg leading-relaxed text-ink-soft"
              style={{ ["--rise-delay" as string]: "240ms" }}
            >
              One tap tells you if a food is safe. Green, yellow, or red. And we
              show you how to make it green.
            </p>

            <div
              className="rise mt-8"
              style={{ ["--rise-delay" as string]: "360ms" }}
            >
              <Link
                href="/trial"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-leaf px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_-10px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(27,95,170,0.85)]"
              >
                Start my 7-day free trial
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-4 text-sm text-ink-soft">
                7 days free. You do not need a card. After that it is N1,500 a
                month, and you can stop any time.
              </p>
            </div>
          </div>

          {/* image, seen right away */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="relative order-1 mx-auto w-full max-w-md lg:order-2"
          >
            <div className="relative overflow-hidden rounded-[1.75rem] shadow-[0_30px_70px_-24px_rgba(12,42,71,0.55)] ring-1 ring-white/60">
              <Image
                src="/img/swallow.jpg"
                alt="A plate of eba with vegetable soup"
                width={760}
                height={560}
                priority
                className="h-72 w-full object-cover sm:h-[26rem]"
              />
            </div>

            <div className="float-slow absolute -left-3 top-6 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur sm:-left-6">
              <TrafficLight size="sm" active="cycle" />
            </div>

            <div className="float-slower absolute -bottom-5 right-0 w-60 rounded-2xl bg-white p-4 shadow-xl sm:-right-5">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full bg-verdict-yellow" />
                <p className="text-sm font-bold text-ink">Eba and soup</p>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                Eat a smaller size of eba, add meat or fish, and this food
                becomes <span className="font-bold text-leaf-deep">green</span>.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export { Hero };
