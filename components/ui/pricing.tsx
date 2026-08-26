"use client";

import { motion, type Variants } from "framer-motion";
import { Check, Star } from "lucide-react";
import TrialCta from "@/components/TrialCta";

/**
 * The 3-tier pricing section. Adapted from a generic shadcn pricing block, with
 * these deliberate departures — all correctness-driven, not stylistic:
 *
 *  - No monthly/annual toggle, no confetti, no USD/@number-flow currency
 *    animation. Paystack here is one-time-charge only (no annual billing
 *    exists), so a toggle would advertise something that does not work.
 *  - Prices are the same static "N1,500" style already used everywhere else on
 *    the site, not a currency-formatted number.
 *  - Every button is the SAME <TrialCta/> used elsewhere: access-aware, and
 *    it never links straight to Paystack — /app stays the single paywall
 *    (existing house rule), where the person actually picks a plan to pay for.
 *  - Card entrance reuses the motion.div + whileInView pattern already
 *    established in components/ui/feature-cards.tsx, not <Reveal/>, to avoid
 *    double-animating the same element.
 */

export interface PricingPlan {
  tier: "basic" | "plus" | "dietitian";
  name: string;
  price: string;
  features: string[];
  description: string;
  isPopular: boolean;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.06 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Pricing({
  plans,
  title,
  description,
}: {
  plans: PricingPlan[];
  title: string;
  description?: string;
}) {
  return (
    <div>
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
        {description && (
          <p className="mx-auto mt-4 max-w-xl font-display text-lg leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3"
      >
        {plans.map((plan) => (
          <motion.div
            key={plan.tier}
            variants={card}
            className={`relative flex flex-col overflow-hidden rounded-3xl p-6 text-center transition-all hover:-translate-y-1 ${
              plan.isPopular
                ? // The premium tier gets the SAME deep-blue canvas as the /app
                  // hero meal card, not just a coloured border — a whole card
                  // says "this is the one" more than a badge does.
                  "bg-gradient-to-b from-[#0d3568] via-[#14538f] to-[#1b5faa] shadow-[0_24px_60px_-20px_rgba(12,42,71,0.55)]"
                : "border border-line bg-white shadow-[0_20px_50px_-24px_rgba(12,42,71,0.35)]"
            }`}
          >
            {plan.isPopular && (
              <div
                className="dots-light pointer-events-none absolute inset-x-0 top-0 h-32 opacity-40"
                aria-hidden
              />
            )}
            {plan.isPopular && (
              <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-leaf px-3 py-1">
                <Star className="h-3.5 w-3.5 fill-current text-white" />
                <span className="text-xs font-bold text-white">Most popular</span>
              </div>
            )}

            <p
              className={`relative text-sm font-bold uppercase tracking-widest ${
                plan.isPopular ? "text-white/80" : "text-ink-soft"
              }`}
            >
              {plan.name}
            </p>

            <p
              className={`relative mt-4 font-display text-4xl font-bold ${
                plan.isPopular ? "text-white" : "text-ink"
              }`}
            >
              {plan.price}
              <span
                className={`text-base font-medium ${plan.isPopular ? "text-white/70" : "text-ink-soft"}`}
              >
                /month
              </span>
            </p>

            <ul
              className={`relative mx-auto mt-6 flex-1 space-y-3 text-left text-sm ${
                plan.isPopular ? "text-white" : "text-ink"
              }`}
            >
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      plan.isPopular ? "bg-white/15" : "bg-verdict-green/15"
                    }`}
                  >
                    <Check
                      className={`h-3 w-3 ${plan.isPopular ? "text-white" : "text-leaf-deep"}`}
                    />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <TrialCta
              className={`group relative mt-6 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 ${
                plan.isPopular
                  ? "bg-leaf shadow-[0_14px_30px_-10px_rgba(62,155,79,0.6)] hover:bg-leaf-deep"
                  : "bg-brand shadow-[0_14px_30px_-10px_rgba(27,95,170,0.5)] hover:bg-brand-deep"
              }`}
            />

            <p className={`relative mt-3 text-xs ${plan.isPopular ? "text-white/60" : "text-ink-soft"}`}>
              {plan.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
