"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TrafficLight from "@/components/TrafficLight";
import HeroDemo from "@/components/ui/hero-demo";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

function RotatingWord() {
  const words = useMemo(() => ["a food", "a meal", "a snack"], []);
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setTimeout(
      () => setI((n) => (n === words.length - 1 ? 0 : n + 1)),
      1900,
    );
    return () => clearTimeout(t);
  }, [i, words]);

  return (
    <span className="relative inline-grid overflow-hidden pb-[0.08em] align-bottom text-leaf-deep">
      {words.map((w, idx) => (
        <motion.span
          key={w}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={false}
          animate={
            i === idx
              ? { y: "0%", opacity: 1 }
              : { y: i > idx ? "-115%" : "115%", opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 60, damping: 13 }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-mist via-white to-white pb-16 pt-24 sm:pt-28">
      <div
        className="dots pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-leaf-bright/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-brand-bright/10 blur-3xl"
        aria-hidden
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex max-w-6xl flex-col items-center px-4 text-center sm:px-6"
      >
        <motion.div
          variants={item}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 text-sm font-medium text-ink-soft shadow-sm backdrop-blur"
        >
          <span className="h-2 w-2 rounded-full bg-leaf-bright" />
          For Nigerians living with diabetes
        </motion.div>

        <motion.h1
          variants={item}
          className="mt-6 font-display text-[1.9rem] font-bold leading-[1.12] tracking-tight text-ink sm:text-4xl lg:text-[2.9rem]"
        >
          Know if <RotatingWord /> is right for your diabetes,
          <br className="hidden sm:block" />{" "}
          <span className="text-brand">before you eat it.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-xl text-balance font-display text-lg leading-relaxed text-ink-soft"
        >
          Check any Nigerian food before you cook or buy it. In seconds you see
          if it is safe for your sugar, and the simple way to make it better.
        </motion.p>

        <motion.div variants={item} className="mt-8">
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
        </motion.div>

        <motion.div variants={item} className="relative mt-12 w-full max-w-md">
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-gradient-to-tr from-brand-bright/10 to-leaf-bright/15 blur-2xl"
            aria-hidden
          />
          <HeroDemo />

          <div className="float-slow absolute -left-1 top-8 rounded-2xl bg-white/95 p-2.5 shadow-xl backdrop-blur sm:-left-4 sm:top-10">
            <TrafficLight size="sm" active="cycle" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export { Hero };
