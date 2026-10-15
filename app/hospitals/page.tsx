import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Hospital,
  MessageCircle,
  QrCode,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  Utensils,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HospitalPricing from "@/components/hospital/HospitalPricing";
import PilotSheet, { PilotButton } from "@/components/hospital/PilotSheet";
import { PILOT_DAYS, PILOT_SEATS } from "@/lib/hospitalPlans";

export const metadata: Metadata = {
  title: "GluFloat for Hospitals and Clinics | Diabetes Food Care in Nigeria",
  description:
    "Give your diabetes patients GluFloat Premium and see every meal and sugar test they save, from one dashboard. Free 30-day pilot for 20 patients.",
  alternates: { canonical: "/hospitals" },
};

/**
 * GluFloat for hospitals, the page a hospital lands on (2026-10-12). Same
 * design language as the home page: Title Case centred headings, a cool
 * off-white canvas, white cards, deep-blue panels set into the page. Static,
 * with two small client islands (the plan switch and the pilot form).
 *
 * The money pitch ("charge your patients and keep the difference") belongs in
 * the PDF proposal the founder sends, not on this public page.
 */

const H2 = "mx-auto mt-4 max-w-3xl text-balance text-center font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.5rem]";
const LEAD = "mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-ink-soft";
const PANEL =
  "relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0B2E5C] via-[#124A8C] to-[#1B5FAA] px-6 py-14 sm:px-12 sm:py-16";

function Label({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
        dark ? "bg-white/10 text-white ring-1 ring-inset ring-white/20" : "bg-white text-brand ring-1 ring-brand/15 shadow-sm"
      }`}
    >
      {children}
    </span>
  );
}

function Glow() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#2C7BE5]/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-leaf/30 blur-3xl" />
    </>
  );
}

/** A picture of the dashboard, drawn in HTML and marked as an example. */
function DashboardPreview() {
  const rows = [
    { name: "Mrs Adaeze O.", used: "Today", meals: 41, tests: 18, last: "132 mg/dL" },
    { name: "Mr Musa B.", used: "Yesterday", meals: 37, tests: 9, last: "164 mg/dL" },
    { name: "Mrs Funke A.", used: "Today", meals: 52, tests: 24, last: "118 mg/dL" },
    { name: "Mr Chidi E.", used: "9 days ago", meals: 6, tests: 1, last: "201 mg/dL", quiet: true },
  ];
  return (
    <div className="relative rounded-3xl bg-white p-4 text-ink shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] ring-1 ring-white/30 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">Patients</p>
        <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">Example</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["Places used", "46 of 50"],
          ["Used this week", "39"],
          ["Meals saved", "1,284"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[#f3f6fa] px-2.5 py-2">
            <p className="text-[10px] font-semibold text-ink-soft">{k}</p>
            <p className="font-display text-base font-bold">{v}</p>
          </div>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-[#eef2f7] text-xs">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
              {r.name.split(" ")[1][0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{r.name}</span>
              <span className={r.quiet ? "font-semibold text-verdict-red" : "text-ink-soft"}>{r.used}</span>
            </span>
            <span className="hidden w-14 text-right text-ink-soft sm:block">{r.meals} meals</span>
            <span className="w-16 text-right font-semibold">{r.last}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HospitalsPage() {
  const steps = [
    {
      icon: UserPlus,
      title: "Add your patients",
      text: "Type them in, paste a list from Excel, or let them scan your QR code. Patients join with their phone number. No email needed.",
    },
    {
      icon: Utensils,
      title: "They use GluFloat every day",
      text: "Each patient gets everything in GluFloat Premium: what to eat, how much and how often, for Nigerian food, and a place to save each sugar test.",
    },
    {
      icon: Stethoscope,
      title: "Your team sees everything",
      text: "Your doctors and dietitians open any patient and see every meal, every sugar test, their HbA1c, weight and medicine, and the full month report.",
    },
  ];
  const patientGets = [
    { icon: Utensils, text: "A meal picked for them for breakfast, lunch and dinner" },
    { icon: Search, text: "Check any of over 1,500 Nigerian foods and meals" },
    { icon: ClipboardList, text: "Their sugar tests saved next to what they ate" },
    { icon: MessageCircle, text: "Chat with your own doctors and dietitians inside GluFloat" },
  ];
  const teamGets = [
    { icon: Users, text: "Every patient on one list, with when they last used it" },
    { icon: FileText, text: "A month report for each patient, as a PDF" },
    { icon: Stethoscope, text: "Logins for all your doctors and dietitians, free" },
    { icon: MessageCircle, text: "Every patient's chat in one place. Any of your doctors or dietitians can answer" },
    { icon: ClipboardList, text: "Each doctor and dietitian can leave a note on top of a patient's meal card" },
    { icon: QrCode, text: "Your own QR code for patients to join" },
  ];
  const faqs = [
    {
      q: "Who pays?",
      a: "Your hospital pays GluFloat one price for the plan. Your patients do not pay GluFloat anything. How you charge your patients for the programme is up to you.",
    },
    {
      q: "Do our patients need an email address?",
      a: "No. A patient can join with only their phone number and a password. If they forget the password, your hospital admin sets a new one from the dashboard.",
    },
    {
      q: "Who can see a patient's record?",
      a: "Only the doctors, dietitians and admins your hospital adds. Your admin adds and removes them at any time.",
    },
    {
      q: "Does GluFloat tell the patient if a sugar test is good or bad?",
      a: "No. GluFloat shows the number as it is and leaves the judgement to your doctors. If a number is very low or very high, it tells the patient to contact their doctor.",
    },
    {
      q: "What happens after the free pilot?",
      a: `The pilot gives ${PILOT_SEATS} patients ${PILOT_DAYS} days of everything. Then you choose a plan, we send you an invoice, and you pay by bank transfer. If you do not continue, your patients keep their own GluFloat account.`,
    },
    {
      q: "We have more than 200 patients, or several branches.",
      a: "Choose Care Custom and tell us how many patients you have. We will send you a quote.",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="bg-[#F4F7FB]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0d3568] via-[#14538f] to-[#1b5faa] pb-20 pt-32 text-white sm:pt-36">
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 left-10 h-96 w-96 rounded-full bg-leaf/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <Label dark>GluFloat for hospitals and clinics</Label>
              <h1 className="mt-5 text-balance font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Care For Your Diabetes Patients Between Visits
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
                Your patients get GluFloat Premium to guide every meal. Your doctors and dietitians see every meal and sugar
                test they save, from one dashboard.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PilotButton className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-leaf px-7 text-base font-bold text-white shadow-[0_16px_34px_-14px_rgba(62,155,79,0.9)] transition-transform hover:-translate-y-0.5">
                  Start a free 30-day pilot <ArrowRight className="h-4 w-4" />
                </PilotButton>
                <a
                  href="#plans"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-white/10 px-7 text-base font-bold text-white ring-1 ring-inset ring-white/25 hover:bg-white/15"
                >
                  See the plans
                </a>
              </div>
              <p className="mt-5 text-sm text-white/70">
                {PILOT_SEATS} patients free for {PILOT_DAYS} days · No payment to start · Pay by bank transfer
              </p>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl text-center">
            <Label>How it works</Label>
            <h2 className={H2}>Three Steps From Clinic To Kitchen</h2>
            <p className={LEAD}>Between two clinic visits, your patients eat many meals on their own. Now your team can see them.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-[28px] bg-white p-7 shadow-[0_24px_60px_-36px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.04]">
                <span className="absolute right-6 top-6 font-display text-5xl font-bold text-brand/10">{i + 1}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <s.icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What each side gets */}
        <section className="px-4 pb-20 sm:px-6">
          <div className={PANEL}>
            <Glow />
            <div className="relative text-center">
              <Label dark>What you get</Label>
              <h2 className="mx-auto mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-[2.5rem]">
                Premium For Every Patient, Free For Your Team
              </h2>
            </div>
            <div className="relative mt-10 grid gap-5 lg:grid-cols-2">
              {[
                { title: "Each patient gets", sub: "Everything in GluFloat Premium (N4,500 a month on its own)", items: patientGets },
                { title: "Your team gets", sub: "Your hospital's own dashboard", items: teamGets },
              ].map((col) => (
                <div key={col.title} className="rounded-3xl bg-white/[0.07] p-6 ring-1 ring-inset ring-white/15 sm:p-7">
                  <p className="font-display text-xl font-bold text-white">{col.title}</p>
                  <p className="mt-1 text-sm text-white/65">{col.sub}</p>
                  <ul className="mt-5 space-y-3.5">
                    {col.items.map((it) => (
                      <li key={it.text} className="flex items-center gap-3 text-white/90">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-inset ring-white/20">
                          <it.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                        </span>
                        {it.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl text-center">
            <Label>Plans</Label>
            <h2 className={H2}>One Price For Your Whole Clinic</h2>
            <p className={LEAD}>
              Every plan includes everything. Pick the number of patients. Pay for a year and get 2 months free.
            </p>
          </div>
          <HospitalPricing />
        </section>

        {/* Pilot: one panel, three steps, one button that opens the 3-step form. */}
        <section id="pilot" className="scroll-mt-24 px-4 py-20 sm:px-6">
          <div className={PANEL}>
            <Glow />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <Label dark>Free pilot</Label>
                <h2 className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-[2.5rem]">
                  Try It With {PILOT_SEATS} Patients For {PILOT_DAYS} Days
                </h2>
                <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/80">
                  No payment to start. If you like it, choose a plan. If not, your patients keep their own GluFloat account.
                </p>
                <PilotButton className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-leaf px-8 text-base font-bold text-white shadow-[0_16px_34px_-14px_rgba(62,155,79,0.9)] transition-transform hover:-translate-y-0.5">
                  Start my free pilot <ArrowRight className="h-4 w-4" />
                </PilotButton>
                <p className="mt-4 flex items-center gap-2 text-sm text-white/70">
                  <ShieldCheck className="h-4 w-4" /> Only your own staff see your patients&apos; records
                </p>
              </div>
              <ol className="space-y-3">
                {[
                  { icon: Hospital, title: "Tell us about your hospital", text: "Three short steps. It takes about 2 minutes." },
                  { icon: MessageCircle, title: "We chat with you on WhatsApp", text: "We set up your dashboard and send your login." },
                  { icon: QrCode, title: "Add your patients", text: "Type them in, or let them scan your QR code." },
                ].map((st, i) => (
                  <li key={st.title} className="flex items-start gap-4 rounded-3xl bg-white/[0.08] p-5 ring-1 ring-inset ring-white/15">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand">
                      <st.icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">Step {i + 1}</p>
                      <p className="font-display text-lg font-bold text-white">{st.title}</p>
                      <p className="mt-0.5 text-sm text-white/75">{st.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <Label>Questions</Label>
              <h2 className={H2}>Things Hospitals Ask Us</h2>
            </div>
            <div className="mt-10 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl bg-[#F4F7FB] px-5 py-4 open:bg-white open:shadow-[0_18px_40px_-28px_rgba(12,42,71,0.4)] open:ring-1 open:ring-ink/[0.05]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold text-ink">
                    {f.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand ring-1 ring-brand/15 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PilotSheet />
      <Footer />
    </>
  );
}
