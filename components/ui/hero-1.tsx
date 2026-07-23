"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/**
 * The landing hero: ONE solid brand colour, not a faint wash on white.
 *
 * The canvas is deep brand blue (--blue-deep to --blue) with white type, and
 * GREEN is spent on one thing only: the button you are meant to press. That is
 * the whole reason it reads as ours. The reference this was built from painted
 * two big clip-path gradient blobs on white; both are gone on purpose, and so is
 * its own <header> — the shared components/Navbar.tsx carries the navigation,
 * the auth state and the sign-out swap, and two navigation bars on one page
 * would fight.
 *
 * Typography follows the reference: the body font (Inter), semibold, tight
 * tracking, balanced. Inter is already loaded as --font-body, so nothing extra
 * is downloaded and every other heading on the site keeps Geist.
 */

interface AnnouncementBanner {
  text: string;
  icon?: ReactNode;
}

interface CallToAction {
  text: string;
  href: string;
  variant: "primary" | "secondary";
}

export interface HeroLandingProps {
  title: string;
  description: string;
  announcementBanner?: AnnouncementBanner;
  callToActions?: CallToAction[];
  /** The small print under the buttons. */
  reassurance?: string;
  /** The product picture (the looping demo device). */
  media?: ReactNode;
  titleSize?: "small" | "medium" | "large";
  className?: string;
}

const TITLE_SIZE = {
  small: "text-2xl sm:text-3xl md:text-4xl",
  medium: "text-3xl sm:text-4xl md:text-5xl",
  large: "text-4xl sm:text-5xl md:text-6xl",
} as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export function HeroLanding({
  title,
  description,
  announcementBanner,
  callToActions,
  reassurance,
  media,
  titleSize = "large",
  className,
}: HeroLandingProps) {
  return (
    <section
      className={`relative isolate overflow-hidden bg-gradient-to-b from-[#0d3568] via-[#14538f] to-[#1b5faa] pb-20 pt-36 sm:pt-40 ${
        className || ""
      }`}
    >
      {/* Light, not colour: two soft white glows and a fine dot grid, so the
          blue has depth without a second hue muddying it. */}
      <div
        className="dots-light pointer-events-none absolute inset-x-0 top-0 h-96 opacity-50"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-56 h-80 w-80 rounded-full bg-leaf-bright/15 blur-3xl"
        aria-hidden
      />
      <div className="grain pointer-events-none absolute inset-0" aria-hidden />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6"
      >
        {announcementBanner && (
          <motion.div
            variants={item}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 ring-1 ring-inset ring-white/25 backdrop-blur"
          >
            {announcementBanner.icon}
            {announcementBanner.text}
          </motion.div>
        )}

        <motion.h1
          variants={item}
          className={`mt-6 text-balance font-sans font-semibold leading-[1.08] tracking-tight text-white ${TITLE_SIZE[titleSize]}`}
        >
          {title}
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/75 sm:text-lg"
        >
          {description}
        </motion.p>

        {callToActions && callToActions.length > 0 && (
          <motion.div
            variants={item}
            className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
          >
            {callToActions.map((cta) =>
              cta.variant === "primary" ? (
                <Link
                  key={cta.text}
                  href={cta.href}
                  className="group inline-flex items-center gap-2 rounded-full bg-leaf px-8 py-4 text-base font-bold text-white shadow-[0_16px_34px_-12px_rgba(70,184,94,0.85)] transition-all hover:-translate-y-1 hover:bg-leaf-deep hover:shadow-[0_22px_44px_-12px_rgba(70,184,94,0.95)]"
                >
                  {cta.text}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link
                  key={cta.text}
                  href={cta.href}
                  className="group inline-flex items-center gap-1.5 text-base font-semibold text-white/85 transition-colors hover:text-white"
                >
                  {cta.text}
                  <span
                    aria-hidden
                    className="transition-transform group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
              ),
            )}
          </motion.div>
        )}

        {reassurance && (
          <motion.p
            variants={item}
            className="mt-5 max-w-md text-sm leading-relaxed text-white/70"
          >
            {reassurance}
          </motion.p>
        )}

        {media && (
          <motion.div variants={item} className="relative mt-14 w-full max-w-md">
            <div
              className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            {media}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

export type { AnnouncementBanner, CallToAction };
