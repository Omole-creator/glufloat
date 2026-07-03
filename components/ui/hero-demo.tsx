"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

const STEP_MS = [1500, 2200, 2600, 2400]; // typing, verdict, meal, green

export default function HeroDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(
      () => setStep((s) => (s + 1) % 4),
      STEP_MS[step] ?? 2200,
    );
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="mx-auto w-full max-w-sm rounded-[1.75rem] border border-line bg-white p-4 text-left shadow-[0_30px_70px_-24px_rgba(12,42,71,0.5)] ring-1 ring-white/60">
      {/* app header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold">
            <span className="text-brand">Glu</span>
            <span className="text-leaf">float</span>
          </span>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-ink-soft">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-verdict-green" />
          live
        </span>
      </div>

      {/* search bar */}
      <div className="flex items-center gap-2 rounded-full border-2 border-line bg-mist px-4 py-2.5">
        <svg
          className="h-4 w-4 text-ink-soft/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
          />
        </svg>
        <span className="text-sm font-medium text-ink">
          Jollof rice
          {step === 0 && (
            <motion.span
              className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-brand"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          )}
        </span>
      </div>

      {/* result area */}
      <div className="relative mt-3 min-h-[188px]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="wait"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-[188px] items-center justify-center text-sm text-ink-soft/70"
            >
              Checking your food...
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="rounded-2xl border-2 border-verdict-yellow/50 bg-verdict-yellow/5 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-ink">Jollof rice</p>
                <span className="rounded-full bg-verdict-yellow px-2.5 py-0.5 text-xs font-bold text-ink">
                  Eat with care
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                Turns to sugar fast. Eat a smaller size, and add soup and fish.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-white p-2">
                  <p className="font-bold text-ink/60">How much</p>
                  <p className="mt-0.5 text-ink">Half a plate</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="font-bold text-ink/60">Eat with</p>
                  <p className="mt-0.5 text-ink">Veg and fish</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="font-bold text-ink/60">How often</p>
                  <p className="mt-0.5 text-ink">2 to 3 a week</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="meal"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <p className="mb-2 text-xs font-semibold text-ink-soft">
                Your whole meal
              </p>
              <div className="space-y-1.5">
                {[
                  ["Jollof rice, small size", "yellow"],
                  ["Efo riro soup", "green"],
                  ["Fish", "green"],
                ].map(([name, v]) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center justify-between rounded-lg bg-mist px-3 py-2 text-sm text-ink"
                  >
                    {name}
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        v === "green" ? "bg-verdict-green" : "bg-verdict-yellow"
                      }`}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-mint p-3 text-xs text-ink">
                <span className="font-bold text-leaf-deep">The fix: </span>
                a small size of jollof, with soup and fish.
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="green"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-[188px] flex-col items-center justify-center rounded-2xl bg-verdict-green/10"
            >
              <motion.span
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-verdict-green text-white shadow-lg"
              >
                <Check className="h-9 w-9" strokeWidth={3} />
              </motion.span>
              <p className="mt-3 font-display text-lg font-bold text-ink">
                Good to eat
              </p>
              <p className="text-sm text-ink-soft">This meal is right for you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
