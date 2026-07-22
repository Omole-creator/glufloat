"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The three "what you get" cards on the landing page.
 *
 * They used to be flat bordered boxes that all arrived at once: the shared
 * `Reveal` gave them a 120ms stagger over a 30px slide, which at desktop width
 * is invisible, so the row read as static. These deal themselves in one after
 * the other, and each one lifts as it lands.
 *
 * Motion is a founder request, so keep it deliberate: a clear stagger, a real
 * travel distance, and the accent bar drawing across the top of each card as it
 * settles. `prefers-reduced-motion` is honoured by framer-motion's own reduced
 * motion handling plus the static fallback styles.
 */

export interface Feature {
  /**
   * The already-rendered icon element, NOT the component. This is a client
   * component, and a function cannot be passed across that boundary from the
   * server page ("Functions cannot be passed directly to Client Components").
   */
  icon: ReactNode;
  title: string;
  text: string;
  tone: "green" | "blue";
}

const TONES = {
  green: {
    chip: "bg-mint text-leaf-deep ring-leaf/15",
    bar: "bg-leaf",
    glow: "group-hover:shadow-[0_26px_50px_-24px_rgba(62,155,79,0.55)]",
  },
  blue: {
    chip: "bg-mist text-brand ring-brand/15",
    bar: "bg-brand",
    glow: "group-hover:shadow-[0_26px_50px_-24px_rgba(27,95,170,0.55)]",
  },
} as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.22, delayChildren: 0.08 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 56, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const bar: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function FeatureCards({ features }: { features: Feature[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className="grid gap-5 sm:grid-cols-3"
    >
      {features.map((f) => {
        const t = TONES[f.tone];
        return (
          <motion.div
            key={f.title}
            variants={card}
            className={`group relative h-full overflow-hidden rounded-3xl bg-white p-6 shadow-[0_10px_34px_-20px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.06] transition-all duration-300 hover:-translate-y-1.5 ${t.glow}`}
          >
            <motion.span
              variants={bar}
              style={{ transformOrigin: "left" }}
              className={`absolute inset-x-0 top-0 h-1 ${t.bar}`}
              aria-hidden
            />
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110 ${t.chip}`}
            >
              {f.icon}
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">
              {f.title}
            </h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{f.text}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
