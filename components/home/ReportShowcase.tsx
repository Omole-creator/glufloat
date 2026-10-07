import { MessageCircle, Stethoscope } from "lucide-react";
import Reveal from "@/components/Reveal";

/**
 * The doctor's report and the dietitian, side by side: the two things that
 * happen after the meal. The report rows are the same example as the timeline
 * above, so the page tells one story.
 */
export default function ReportShowcase() {
  const rows = [
    { d: "2 Oct", m: "Beans porridge, eggs", b: 108, a: 132, c: "+24" },
    { d: "4 Oct", m: "Moi moi, pap", b: 104, a: 118, c: "+14" },
    { d: "6 Oct", m: "Eba, okra soup, fish", b: 110, a: 145, c: "+35" },
  ];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
      <Reveal direction="left">
        <div className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_-30px_rgba(12,42,71,0.5)] ring-1 ring-ink/[0.05] sm:p-8">
          <h3 className="font-display text-2xl font-bold leading-tight text-ink">
            Your doctor sees what you ate, and what it did to your sugar.
          </h3>
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            Each meal, how much you ate, and your sugar before and 2 hours after. You send it on
            WhatsApp or save it as a PDF to print.
          </p>

          {/* A small copy of the report itself. */}
          <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-line">
            <div className="flex items-center justify-between bg-brand px-4 py-2.5 text-white">
              <span className="font-display text-sm font-bold">Meal and sugar report</span>
              <span className="text-xs text-white/75">October</span>
            </div>
            <div className="grid grid-cols-[3.2rem_1fr_2.6rem_2.6rem_2.8rem] gap-x-2 px-4 py-2 text-[11px] font-semibold text-ink-soft">
              <span>Date</span>
              <span>Meal</span>
              <span className="text-right">Before</span>
              <span className="text-right">2 hrs</span>
              <span className="text-right">Change</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.d}
                className="grid grid-cols-[3.2rem_1fr_2.6rem_2.6rem_2.8rem] gap-x-2 border-t border-line px-4 py-2.5 text-xs text-ink"
              >
                <span className="text-ink-soft">{r.d}</span>
                <span className="truncate font-semibold">{r.m}</span>
                <span className="text-right tabular-nums">{r.b}</span>
                <span className="text-right tabular-nums">{r.a}</span>
                <span className="text-right font-bold tabular-nums">{r.c}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">An example report. Numbers in mg/dL.</p>
        </div>
      </Reveal>

      <Reveal direction="right" delay={120}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0d3568] to-[#1b5faa] p-6 text-white sm:p-8">
          <div className="dots-light absolute inset-0 opacity-30" aria-hidden />
          <div className="relative">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
              <Stethoscope className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight">Want someone to talk to?</h3>
            <p className="mt-3 text-base leading-relaxed text-white/80">
              On GluFloat Premium you get your own dietitian on WhatsApp. Ask about your meals, your
              report, or the food you love.
            </p>
            <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-inset ring-white/20">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="h-4 w-4 text-leaf-bright" /> Chat with your dietitian
              </p>
              <p className="mt-1 text-xs text-white/70">The same dietitian every time you message.</p>
            </div>
            <a
              href="#pricing"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-brand transition-transform hover:-translate-y-0.5"
            >
              See the plans
            </a>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
