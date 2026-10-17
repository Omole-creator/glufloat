import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FileText,
  HeartHandshake,
  MessageCircle,
  QrCode,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GLUFLOAT_SHARE, naira, PATIENT_FREE_DAYS, PATIENT_PRICE_MIN } from "@/lib/patientPays";
import EarningsCalculator from "@/components/dietitian/EarningsCalculator";

export const metadata: Metadata = {
  title: "GluFloat for Dietitians | Support Your Diabetes Patients Between Visits",
  description:
    "Give your patients GluFloat Premium and see every meal and sugar test they save. Set your own price: your patients pay you inside GluFloat.",
  alternates: { canonical: "/dietitians" },
};

/**
 * GluFloat for dietitians, the page a dietitian lands on (2026-10-13). Same
 * design language as /hospitals. Static: no client island, every button is a
 * link to /dietitians/start or down the page.
 *
 * The promise this page makes and the product keeps: her patients chat only
 * with her (lib/hospitalServer.ts chatContacts), see only HER price, never
 * GluFloat's plans (lib/account.ts, `practice` on "expired"), and pay her
 * inside the app at the price she sets, with GluFloat keeping N2,000 of each
 * payment (lib/patientPays.ts, founder 2026-10-17). Every number on this
 * page is read from lib/patientPays.ts.
 */

const H2 = "mx-auto mt-4 max-w-3xl text-balance text-center font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.5rem]";
const LEAD = "mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-ink-soft";
const PANEL =
  "relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0B2E5C] via-[#124A8C] to-[#1B5FAA] px-6 py-14 sm:px-12 sm:py-16";
const START = "/dietitians/start";

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

/** A picture of her dashboard, drawn in HTML and marked as an example. */
function DashboardPreview() {
  const rows = [
    { name: "Mrs Ngozi A.", used: "Today", meals: 34, last: "128 mg/dL" },
    { name: "Mr Tunde O.", used: "Yesterday", meals: 29, last: "171 mg/dL" },
    { name: "Mrs Halima S.", used: "Today", meals: 40, last: "119 mg/dL" },
    { name: "Mr Emeka N.", used: "8 days ago", meals: 5, last: "196 mg/dL", quiet: true },
  ];
  return (
    <div className="relative rounded-3xl bg-white p-4 text-ink shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] ring-1 ring-white/30 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">My patients</p>
        <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">Example</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["Patients", "8"],
          ["Used this week", "7"],
          ["Meals saved", "312"],
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

export default function DietitiansPage() {
  const promises = [
    {
      icon: HeartHandshake,
      title: "Your patients stay yours",
      text: "They chat with you inside GluFloat, and only you. While they are with you, GluFloat never offers them another dietitian.",
    },
    {
      icon: Wallet,
      title: "You set the price",
      text: `Choose what each patient pays you every month. GluFloat keeps ${naira(GLUFLOAT_SHARE)} of each payment, and the rest is paid to your bank every week.`,
    },
    {
      icon: Stethoscope,
      title: "You see between visits",
      text: "Before each visit, open a patient and see what they ate, their sugar tests and their month report.",
    },
  ];
  const steps = [
    { icon: BadgeCheck, title: "Start free", text: "Give your name, your DCN registration number and your WhatsApp number. It takes 2 minutes." },
    { icon: UserPlus, title: "Invite your patients", text: "Send each patient their own link on WhatsApp, or share your QR code. They join with their phone number." },
    { icon: ClipboardList, title: "Review before each visit", text: `Each patient gets ${PATIENT_FREE_DAYS} free days, then pays you inside GluFloat. Open any patient to see every meal and sugar test.` },
  ];
  const patientGets = [
    { icon: Utensils, text: "A meal picked for them for breakfast, lunch and dinner" },
    { icon: Search, text: "Check over 1,500 Nigerian foods to see if they are good to eat" },
    { icon: ClipboardList, text: "A place to save their sugar tests, next to what they ate" },
    { icon: MessageCircle, text: "Chat with you in the app, and a button to call you if something is urgent" },
  ];
  const youGet = [
    { icon: Users, text: "See all your patients in one list, and the last day each one used GluFloat" },
    { icon: FileText, text: "A report for each patient every month, ready to print, with their sugar and weight as graphs" },
    { icon: ShieldCheck, text: "A mark on any patient with a very low or very high sugar test, so you know who to check first" },
    { icon: Stethoscope, text: "Each patient's medicine, weight and how active they are" },
    { icon: Wallet, text: "What each patient paid you, and your money sent to your bank every week" },
    { icon: MessageCircle, text: "Read and answer your patients' messages. New ones are marked. Only you and the patient can see them" },
    { icon: ClipboardList, text: "Write a note that your patient sees at the top of their app" },
    { icon: QrCode, text: "Your own QR code and links to invite patients" },
    { icon: HeartHandshake, text: "Only you can see your patients' records" },
  ];
  const faqs = [
    {
      q: "Who pays?",
      a: `Your patients pay you, inside GluFloat, at the price you set. You pay GluFloat nothing. GluFloat keeps ${naira(GLUFLOAT_SHARE)} of each payment and sends the rest to your bank every week.`,
    },
    {
      q: "How much can I charge?",
      a: `Any price from ${naira(PATIENT_PRICE_MIN)} a month. You can change it any time. A new price starts at each patient's next payment.`,
    },
    {
      q: `What happens after a patient's ${PATIENT_FREE_DAYS} free days?`,
      a: "They pay you one month at a time, by card, bank transfer or USSD, inside GluFloat. If they do not pay, GluFloat asks them to pay you before they can keep going. It never offers them another plan.",
    },
    {
      q: "Who pays Paystack's fee?",
      a: `GluFloat does, out of its ${naira(GLUFLOAT_SHARE)}. You always get your price minus ${naira(GLUFLOAT_SHARE)}.`,
    },
    {
      q: "Do my patients need an email address?",
      a: "No. A patient can join with only their phone number and a password.",
    },
    {
      q: "Who can see my patients' records?",
      a: "Only you. Your patients are told, when they join, that you can see their meals and sugar tests.",
    },
    {
      q: "Does GluFloat tell my patient if a sugar test is good or bad?",
      a: "No. GluFloat shows the number as it is and leaves the judgement to you. If a number is very low or very high, it tells the patient to contact their doctor.",
    },
    {
      q: "What if I stop?",
      a: "Your patients keep their own GluFloat account. Anyone who was paying GluFloat before they joined you gets their unused days back.",
    },
    {
      q: "Why do you ask for my DCN number?",
      a: "Your patients trust you with their health records. We check that every dietitian on GluFloat is registered with the Dietitians Council of Nigeria.",
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
              <Label dark>GluFloat for dietitians</Label>
              <h1 className="mt-5 text-balance font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Double Your Monthly Income While Supporting Your Diabetes Patients With GluFloat
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
                Give your patients a simple way to follow your food advice every day. You see their meals and sugar tests
                from your own dashboard.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={START}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-leaf px-7 text-base font-bold text-white shadow-[0_16px_34px_-14px_rgba(62,155,79,0.9)] transition-transform hover:-translate-y-0.5"
                >
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#plans"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-white/10 px-7 text-base font-bold text-white ring-1 ring-inset ring-white/25 hover:bg-white/15"
                >
                  See what you earn
                </a>
              </div>
              <p className="mt-5 text-sm text-white/70">
                No payment to start · You set your price · Each patient gets {PATIENT_FREE_DAYS} free days
              </p>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* The promise */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl text-center">
            <Label>Your practice</Label>
            <h2 className={H2}>Your Patients. Your Practice. Better Support Between Visits.</h2>
            <p className={LEAD}>GluFloat does the daily work with your patients. You stay in charge of their care.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {promises.map((s) => (
              <div key={s.title} className="rounded-[28px] bg-white p-7 shadow-[0_24px_60px_-36px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.04]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <s.icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl text-center">
            <Label>How it works</Label>
            <h2 className={H2}>Three Steps To Get Started</h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-[28px] bg-[#F4F7FB] p-7 ring-1 ring-ink/[0.04]">
                <span className="absolute right-6 top-6 font-display text-5xl font-bold text-brand/10">{i + 1}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm">
                  <s.icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What each side gets */}
        <section className="px-4 py-20 sm:px-6">
          <div className={PANEL}>
            <Glow />
            <div className="relative text-center">
              <Label dark>What you get</Label>
              <h2 className="mx-auto mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-[2.5rem]">
                Premium For Every Patient, A Dashboard For You
              </h2>
            </div>
            <div className="relative mt-10 grid gap-5 lg:grid-cols-2">
              {[
                { title: "Each patient gets", sub: "Everything in GluFloat Premium (N4,500 a month on its own)", items: patientGets },
                { title: "You get", sub: "Your own dashboard", items: youGet },
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
            <Label>Your money</Label>
            <h2 className={H2}>See What You Earn</h2>
            <p className={LEAD}>
              Your patients pay you inside GluFloat. GluFloat keeps {naira(GLUFLOAT_SHARE)} of each payment. The rest is yours, paid to
              your bank every week.
            </p>
          </div>
          <EarningsCalculator />
        </section>

        {/* FAQ */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <Label>Questions</Label>
              <h2 className={H2}>Things Dietitians Ask Us</h2>
            </div>
            <div className="mt-10 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl bg-white px-5 py-4 open:shadow-[0_18px_40px_-28px_rgba(12,42,71,0.4)] open:ring-1 open:ring-ink/[0.05]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold text-ink">
                    {f.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F7FB] text-brand ring-1 ring-brand/15 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="px-4 pb-20 sm:px-6">
          <div className={PANEL}>
            <Glow />
            <div className="relative text-center">
              <h2 className="mx-auto max-w-3xl text-balance font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-[2.5rem]">
                GluFloat Provides The Technology. You Provide The Care.
              </h2>
              <Link
                href={START}
                className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-leaf px-8 text-base font-bold text-white shadow-[0_16px_34px_-14px_rgba(62,155,79,0.9)] transition-transform hover:-translate-y-0.5"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-sm text-white/70">No payment to start</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
