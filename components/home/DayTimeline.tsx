import { Check, Clock, Droplet, FileText, Sunrise, Timer } from "lucide-react";
import Reveal from "@/components/Reveal";

/**
 * "How GluFloat Fits Into Your Day": what happens around every meal, in four
 * cards, in the order it happens. The order is the content, so the cards are a
 * sequence; each carries a small picture of the screen a person sees then.
 *
 * It covers breakfast, lunch and dinner (founder: a visitor must not think we
 * only plan lunch). The three plates in the first card are ones the app really
 * suggests (lib/nextMeal.ts). It describes what the app hands you, never the
 * food method (no sizes, pairings or how-often), per CLAUDE.md.
 */

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl bg-[#F4F7FB] p-3 text-left ring-1 ring-ink/[0.05]">{children}</div>
  );
}

const MEALS = [
  ["Breakfast", "Moi moi and eggs"],
  ["Lunch", "Beans porridge and boiled eggs"],
  ["Dinner", "Oat swallow and okra soup"],
];

const STEPS: {
  when: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  screen: React.ReactNode;
  note?: string;
}[] = [
  {
    when: "Before each meal",
    icon: <Sunrise className="h-3.5 w-3.5" />,
    title: "Know What To Eat",
    text: "GluFloat picks your breakfast, lunch and dinner. Or check any food you already have.",
    screen: (
      <Screen>
        <div className="space-y-1.5">
          {MEALS.map(([meal, plate]) => (
            <div key={meal} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-verdict-green" />
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{meal}</span>
                <span className="block text-xs font-semibold leading-snug text-ink">{plate}</span>
              </span>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    when: "When you start eating",
    icon: <Droplet className="h-3.5 w-3.5" />,
    title: "Test, Then Eat",
    text: 'Tap "I\'m about to eat it". If you have a strip, test your sugar before the first bite.',
    screen: (
      <Screen>
        <p className="text-[11px] font-semibold text-ink-soft">Your sugar before eating</p>
        <div className="mt-1.5 rounded-xl border-2 border-brand bg-white px-3 py-2 font-display text-lg font-bold text-ink">
          108
        </div>
        <div className="mt-2 rounded-full bg-leaf py-2 text-center text-[11px] font-bold text-white">Start my meal</div>
      </Screen>
    ),
  },
  {
    when: "2 hours later",
    icon: <Timer className="h-3.5 w-3.5" />,
    title: "See What The Meal Did",
    text: "GluFloat reminds you to test again. You see your sugar before and after, side by side.",
    screen: (
      <Screen>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-leaf-deep">
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Meal test complete
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {[
            ["Before", "108"],
            ["2 hours", "132"],
            ["Change", "+24"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white px-1 py-2 shadow-sm">
              <p className="text-[10px] font-semibold text-ink-soft">{k}</p>
              <p className="font-display text-sm font-bold text-ink">{v}</p>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    when: "Clinic day",
    icon: <Clock className="h-3.5 w-3.5" />,
    title: "Show Your Doctor",
    text: "Send one report with your meals and your sugar tests, straight to WhatsApp.",
    note: "NOTE: Testing your sugar is always up to you.",
    screen: (
      <Screen>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand">
          <FileText className="h-3.5 w-3.5" /> Your report
        </p>
        <div className="mt-2 space-y-1.5">
          {[
            ["Moi moi and eggs", "+14"],
            ["Beans porridge", "+24"],
            ["Oat swallow, okra", "+18"],
          ].map(([m, c]) => (
            <div key={m} className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5 text-[11px] shadow-sm">
              <span className="truncate text-ink">{m}</span>
              <span className="font-bold text-ink">{c}</span>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
];

export default function DayTimeline() {
  return (
    <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <li key={s.title}>
          <Reveal delay={i * 110} className="h-full">
            <div className="flex h-full flex-col rounded-[28px] bg-white p-6 text-center shadow-[0_24px_50px_-32px_rgba(11,46,92,0.45)] ring-1 ring-ink/[0.05] transition-transform duration-300 hover:-translate-y-1">
              <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-brand/[0.07] px-3 py-1 text-[11px] font-bold text-brand">
                {s.icon}
                {s.when}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              <div className="mt-auto">
                {s.screen}
                {s.note && <p className="mt-4 text-xs font-semibold text-ink">{s.note}</p>}
              </div>
            </div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
