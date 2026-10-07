import { MessageCircle, Stethoscope } from "lucide-react";
import Reveal from "@/components/Reveal";

/**
 * The doctor's report and the dietitian, side by side: the two things that
 * happen after the meal. The report rows use the same example plates as the
 * day cards above, so the page tells one story.
 */
export default function ReportShowcase() {
  const rows = [
    { d: "2 Oct", m: "Moi moi and eggs", b: 104, a: 118, c: "+14" },
    { d: "4 Oct", m: "Beans porridge, eggs", b: 108, a: 132, c: "+24" },
    { d: "6 Oct", m: "Oat swallow, okra soup", b: 110, a: 128, c: "+18" },
  ];
  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-[1.35fr_1fr]">
      <Reveal direction="left" className="h-full">
        <div className="h-full rounded-[28px] bg-white p-6 text-center shadow-[0_24px_50px_-32px_rgba(11,46,92,0.45)] ring-1 ring-ink/[0.05] sm:p-8">
          <h3 className="mx-auto max-w-md font-display text-2xl font-bold leading-tight text-ink">
            Your Doctor Sees What You Ate, And What It Did To Your Sugar
          </h3>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-soft">
            Each meal, how much you ate, and your sugar before and 2 hours after. Send it on
            WhatsApp or save it as a PDF to print.
          </p>

          {/* A small copy of the report itself. */}
          <div className="mt-7 overflow-hidden rounded-2xl text-left ring-1 ring-ink/[0.07]">
            <div className="flex items-center justify-between bg-[#F4F7FB] px-4 py-3">
              <span className="font-display text-sm font-bold text-ink">Meal and sugar report</span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft ring-1 ring-ink/[0.06]">
                October
              </span>
            </div>
            <div className="grid grid-cols-[1fr_2.4rem_2.4rem_2.8rem] sm:grid-cols-[3.2rem_1fr_2.6rem_2.6rem_2.8rem] gap-x-2 px-4 py-2 text-[11px] font-semibold text-ink-soft">
              <span className="hidden sm:block">Date</span>
              <span>Meal</span>
              <span className="text-right">Before</span>
              <span className="text-right">2 hrs</span>
              <span className="text-right">Change</span>
            </div>
            {rows.map((r) => (
              <div
                key={r.d}
                className="grid grid-cols-[1fr_2.4rem_2.4rem_2.8rem] sm:grid-cols-[3.2rem_1fr_2.6rem_2.6rem_2.8rem] gap-x-2 border-t border-ink/[0.06] px-4 py-2.5 text-xs text-ink"
              >
                <span className="hidden text-ink-soft sm:block">{r.d}</span>
                <span className="truncate font-semibold">{r.m}</span>
                <span className="text-right tabular-nums">{r.b}</span>
                <span className="text-right tabular-nums">{r.a}</span>
                <span className="text-right font-bold tabular-nums text-brand">{r.c}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-soft">An example report. Numbers in mg/dL.</p>
        </div>
      </Reveal>

      <Reveal direction="right" delay={120} className="h-full">
        <div className="relative flex h-full flex-col items-center overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B2E5C] to-[#1B5FAA] p-6 text-center text-white sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-leaf/30 blur-3xl" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
            <Stethoscope className="h-5 w-5" />
          </span>
          <h3 className="relative mt-5 font-display text-2xl font-bold leading-tight">Want Someone To Talk To?</h3>
          <p className="relative mt-3 max-w-xs text-base leading-relaxed text-white/80">
            On GluFloat Premium you get your own dietitian. Ask about your meals, your report, or
            the food you love.
          </p>
          <div className="relative mt-6 w-full rounded-2xl bg-white/10 p-4 ring-1 ring-inset ring-white/20">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold">
              <MessageCircle className="h-4 w-4 text-leaf-bright" /> Chat with your dietitian
            </p>
            <p className="mt-1 text-xs text-white/70">The same dietitian every time you message.</p>
          </div>
          <a
            href="#pricing"
            className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand transition-transform hover:-translate-y-0.5"
          >
            See the plans
          </a>
        </div>
      </Reveal>
    </div>
  );
}
