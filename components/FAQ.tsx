"use client";

import { useState } from "react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is this the same as advice from my doctor or dietitian?",
    a: "No. Glufloat gives you general help about food only. It does not test you, treat you, or cure anything, and it is not your doctor or dietitian. Keep taking your medicine and checking your sugar the way you were told.",
  },
  {
    q: "How does the free trial work?",
    a: "Tap the free trial button and the whole app opens for you for 3 days. You do not give a card, and nothing is taken from you. If you do not like it, just stop. Simple as that.",
  },
  {
    q: "What happens when my free trial ends?",
    a: "The app locks, and you decide. To keep using it, you pay N1,500 a month, about N50 a day, on our secure Paystack page. The moment you pay, you are sent straight back into the app, unlocked.",
  },
  {
    q: "I paid on Paystack. How do I get back in?",
    a: "As soon as you pay, Paystack sends you straight back into the app on your phone, already unlocked. There is nothing else to do. Your month then starts counting down, and we remind you before it ends.",
  },
  {
    q: "Can I stop paying whenever I want?",
    a: "Yes. During the free trial there is nothing to stop, because no card was taken. If you are paying, you can cancel any time, and you keep the app until the month you paid for is finished.",
  },
  {
    q: "Will my own food be in the app?",
    a: "Yes. We have over 1,400 of our foods: eba, amala, jollof, moi moi, suya, zobo, and many more. If yours is not there yet, we add new ones every month.",
  },
  {
    q: "I take insulin. Is this for me too?",
    a: "Yes. The colours tell you how much sugar a food has and how fast it rises. You still choose your insulin the way your doctor said, and the food tips help you keep your sugar steady.",
  },
  {
    q: "I cook for someone with diabetes. Will this help me?",
    a: "Very much. Check a food while you shop or cook, and put food on the table that you feel sure about, instead of guessing.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. It opens in your phone browser, like a website. There is no big app to download, and the answers come back fast.",
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
