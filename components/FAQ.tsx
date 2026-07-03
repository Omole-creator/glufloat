"use client";

import { useState } from "react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Glufloat medical advice?",
    a: "No. Glufloat gives general information about food for people living with diabetes. It does not diagnose, treat, cure, or reverse anything, and it does not replace your doctor, pharmacist, or dietitian. Keep taking your medicine as prescribed, and talk to your doctor before big changes to how you eat.",
  },
  {
    q: "How does the 7-day free trial work?",
    a: "Tap the trial button and everything unlocks on your device for 7 full days. No card, no sign-up, nothing to pay. If Glufloat is not for you, just stop using it. Nothing is ever charged during the trial.",
  },
  {
    q: "What happens after the 7 days?",
    a: "Your free access pauses, and you choose. If you want to keep going, membership is N1,500 a month, about N50 a day, paid through our secure Nestuge checkout. The moment you pay, you get an access code that unlocks everything again.",
  },
  {
    q: "Can I cancel easily?",
    a: "Yes. The trial needs no cancelling at all, since no card was collected. A paid membership cancels in a few taps from your Nestuge account, and you keep access until the end of the period you already paid for.",
  },
  {
    q: "Will my food actually be in the app?",
    a: "The database covers 143 Nigerian foods today: swallows, rice dishes, soups, proteins, snacks, drinks, fruits, and more. Eba, amala, jollof, moi moi, suya, zobo, they are all there. And the list grows from what people search, so missing foods get added.",
  },
  {
    q: "I use insulin. Is this still for me?",
    a: "Yes. If you have Type 1, or Type 2 on insulin, the answers work as carb and speed information, not hard bans. You can cover more carbs by dosing, while portion and pairing still help you avoid sharp spikes.",
  },
  {
    q: "I cook for someone with diabetes. Will this help me?",
    a: "Very much. Caregivers are half the reason Glufloat exists. Check foods while you shop or cook, and serve meals you feel sure about instead of guessing.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Glufloat runs in the browser on any smartphone, no big download needed. Search answers come back instantly.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-md"
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-ink sm:text-base">
                {f.q}
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-brand transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">
                  {f.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
