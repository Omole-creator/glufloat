import { Check, Clock, Droplet, FileText } from "lucide-react";
import Reveal from "@/components/Reveal";

/**
 * "How GluFloat fits into your day": one lunch, told by the clock.
 *
 * The times are the structure because the product runs on them: the meal is
 * picked before you eat, the first sugar test is at the first bite, the second
 * is 2 hours later. Each stop carries a small picture of the screen a person
 * actually sees at that moment.
 *
 * It describes what the app hands you, never the food method itself (no sizes,
 * no pairings, no how-often), per the landing-page rule in CLAUDE.md. The
 * numbers are one example meal, and the section says so.
 */

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl bg-white p-3.5 shadow-[0_14px_34px_-18px_rgba(12,42,71,0.45)] ring-1 ring-ink/[0.06]">
      {children}
    </div>
  );
}

const STOPS: {
  time: string;
  title: string;
  text: string;
  screen: React.ReactNode;
}[] = [
  {
    time: "12:30pm",
    title: "Know what to eat",
    text: "Open GluFloat and see the lunch picked for you. Or check the food you already have.",
    screen: (
      <Screen>
        <div className="rounded-xl bg-gradient-to-b from-[#0d3568] to-[#1b5faa] p-3 text-white">
          <p className="text-[11px] font-semibold text-white/75">Today&apos;s lunch</p>
          <p className="mt-0.5 font-display text-sm font-bold leading-snug">Beans porridge and boiled eggs</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
            <Check className="h-3 w-3 text-leaf-bright" strokeWidth={3} /> Good to eat
          </span>
        </div>
      </Screen>
    ),
  },
  {
    time: "1:00pm",
    title: "Test, then eat",
    text: 'Tap "I\'m about to eat it". If you have a strip, test your sugar before the first bite.',
    screen: (
      <Screen>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand">
          <Droplet className="h-3.5 w-3.5" /> Your sugar before eating
        </p>
        <div className="mt-2 rounded-xl border-2 border-brand px-3 py-2 font-display text-lg font-bold text-ink">108</div>
        <div className="mt-2 rounded-full bg-leaf py-1.5 text-center text-[11px] font-bold text-white">Start my meal</div>
      </Screen>
    ),
  },
  {
    time: "3:00pm",
    title: "See what the meal did",
    text: "GluFloat reminds you to test again. You see your sugar before and after, side by side.",
    screen: (
      <Screen>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-leaf-deep">
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Meal test complete
        </p>
        <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-xl bg-mist text-center">
          {[
            ["Before", "108"],
            ["2 hours", "132"],
            ["Change", "+24"],
          ].map(([k, v]) => (
            <div key={k} className="px-1 py-2">
              <p className="text-[10px] font-semibold text-ink-soft">{k}</p>
              <p className="font-display text-sm font-bold text-ink">{v}</p>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    time: "Clinic day",
    title: "Show your doctor",
    text: "Send one report with your meals and your sugar tests, straight to WhatsApp.",
    screen: (
      <Screen>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand">
          <FileText className="h-3.5 w-3.5" /> Your report for October
        </p>
        <div className="mt-2 space-y-1.5">
          {[
            ["Beans porridge", "+24"],
            ["Eba, okra soup", "+35"],
            ["Moi moi, pap", "+14"],
          ].map(([m, c]) => (
            <div key={m} className="flex items-center justify-between rounded-lg bg-mist px-2.5 py-1.5 text-[11px]">
              <span className="text-ink">{m}</span>
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
    <div className="mt-14">
      <div className="relative">
      {/* The line the day runs along: down the side on a phone, across on a laptop. */}
      <div aria-hidden className="absolute bottom-0 left-[1.15rem] top-2 w-px bg-line lg:hidden" />
      <div aria-hidden className="absolute left-0 right-0 top-[1.15rem] hidden h-px bg-line lg:block" />

      <ol className="grid gap-10 lg:grid-cols-4 lg:gap-6">
        {STOPS.map((s, i) => (
          <li key={s.time} className="relative pl-12 lg:pl-0">
            {/* Outside the fade-in wrapper on purpose: its transform would
                otherwise become the badge's anchor and drop it onto the text. */}
            <span className="absolute left-0 top-0 flex h-[2.3rem] items-center lg:static">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold tabular-nums text-brand ring-1 ring-brand/25 shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{s.time}</span>
              </span>
            </span>
            <Reveal delay={i * 120}>
              <p className="pt-2 text-xs font-bold tabular-nums text-brand lg:hidden">{s.time}</p>
              <h3 className="mt-1 font-display text-lg font-bold text-ink lg:mt-4">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              {s.screen}
            </Reveal>
          </li>
        ))}
      </ol>
      </div>
      <p className="mt-6 text-center text-xs text-ink-soft lg:text-left">
        The numbers above are one example meal, in mg/dL. Testing your sugar is always up to you.
      </p>
    </div>
  );
}
