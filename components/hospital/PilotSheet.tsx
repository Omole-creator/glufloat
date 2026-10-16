"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Hospital, Mail, MapPin, MessageCircle, Phone, UserRound, Users, X } from "lucide-react";
import { Field, FormError } from "@/components/auth/Field";

/**
 * The free-pilot / quote request as THREE STEPS on a full screen (founder's
 * choice, 2026-10-12), built like the save-a-meal sheet patients already know:
 * a blue band with the step and the question, the boxes for that step only,
 * and one button pinned at the bottom. It slides up on a phone and in from the
 * right on a laptop.
 *
 * Opened by any <PilotButton/> on the page, or by /hospitals?pilot=1 (the
 * hospital choice on /signup links there). Mounted ONCE, through a portal onto
 * <body>, so no animated card can trap it.
 */

const OPEN_EVENT = "gf-open-pilot";
type Mode = "pilot" | "quote";

export function openPilot(mode: Mode = "pilot") {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: mode }));
}

export function PilotButton({ mode = "pilot", className, children }: { mode?: Mode; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => openPilot(mode)} className={className}>
      {children}
    </button>
  );
}

const EMPTY = {
  hospital: "",
  city: "",
  state: "",
  patients: "",
  contactName: "",
  contactRole: "",
  phone: "",
  email: "",
  message: "",
  website: "",
};

export default function PilotSheet() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("pilot");
  const [step, setStep] = useState(0);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  // A pilot starts at once and its setup link is emailed (founder, 2026-10-16).
  const [emailed, setEmailed] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setErr("");
    setF({ ...f, [k]: e.target.value });
  };

  useEffect(() => {
    const onOpen = (e: Event) => {
      setMode(((e as CustomEvent).detail as Mode) ?? "pilot");
      setStep(0);
      setErr("");
      setSent(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    // From the hospital choice on /signup.
    if (new URLSearchParams(window.location.search).get("pilot") === "1") setOpen(true);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy]);

  if (!open) return null;

  const steps = [
    { title: "Tell us about your hospital", icon: Hospital },
    { title: "Who should we talk to?", icon: UserRound },
    { title: mode === "quote" ? "What do you need?" : "Anything else?", icon: MessageCircle },
  ];
  const digits = f.phone.replace(/\D/g, "");
  const canNext =
    step === 0
      ? f.hospital.trim().length > 1
      : step === 1
        ? f.contactName.trim().length > 1 && digits.length >= 10 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())
        : true;

  const send = async () => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/hospitals/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, kind: mode }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Something went wrong. Please try again.");
    setEmailed(j.emailed === true);
    setSent(true);
  };

  const next = () => {
    if (!canNext) {
      setErr(step === 0 ? "Please put the name of your hospital or clinic." : "Please put your name, WhatsApp number and email.");
      return;
    }
    setErr("");
    if (step < 2) setStep(step + 1);
    else void send();
  };

  const Icon = steps[step].icon;
  // "Dr Chidi Eze" is greeted as Chidi, never as "Dr".
  const first = f.contactName.trim().replace(/^(dr|dtn|mr|mrs|ms|miss|prof|pharm|nurse|matron)\.?\s+/i, "").split(/\s+/)[0];

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="fade-in absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => !busy && setOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "quote" ? "Ask for a quote" : "Start your free pilot"}
        className="sheet-in relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f3f6fa] shadow-2xl sm:max-w-md"
      >
        <header
          className={`relative shrink-0 overflow-hidden px-5 pb-8 pt-3 text-white ${
            sent ? "bg-gradient-to-br from-[#1f7a3a] via-[#2e9b4f] to-[#3eb35f]" : "bg-gradient-to-br from-[#0B2E5C] via-[#124A8C] to-[#1B5FAA]"
          }`}
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex h-11 items-center justify-between">
            {step > 0 && !sent ? (
              <button
                type="button"
                onClick={() => {
                  setErr("");
                  setStep(step - 1);
                }}
                aria-label="Go back a step"
                className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <span className="h-11 w-11" />
            )}
            {!sent && <span className="text-xs font-bold uppercase tracking-widest text-white/70">Step {step + 1} of 3</span>}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {!sent && (
            <div className="relative mt-3 flex h-1.5 gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`flex-1 rounded-full ${i <= step ? "bg-white" : "bg-white/25"}`} />
              ))}
            </div>
          )}
          <div className="relative mt-6 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25">
              {sent ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                {mode === "quote" ? "Ask for a quote" : "Free 30-day pilot"}
              </p>
              <p className="font-display text-xl font-bold leading-tight">{sent ? "Thank you" : steps[step].title}</p>
            </div>
          </div>
        </header>

        <div className="relative -mt-4 flex-1 overflow-y-auto rounded-t-3xl bg-[#f3f6fa] px-5 pb-6 pt-6">
          {sent ? (
            mode === "pilot" && emailed ? (
              <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-ink/[0.04]">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf/15 text-leaf-deep">
                  <Mail className="h-7 w-7" />
                </span>
                <p className="mt-4 font-display text-lg font-bold text-ink">Check your email</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  {first ? `${first}, your` : "Your"} free pilot has started. We sent a link to{" "}
                  <span className="font-semibold text-ink">{f.email}</span>. Open it to set up your dashboard.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  Cannot find it? Look in your spam or promotions folder. Or call us on 0813 209 7317.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-ink/[0.04]">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/15 text-[#1DA851]">
                  <MessageCircle className="h-7 w-7" />
                </span>
                <p className="mt-4 font-display text-lg font-bold text-ink">We got your request</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  {first ? `${first}, we` : "We"} will chat with you on WhatsApp at <span className="font-semibold text-ink">{f.phone}</span>{" "}
                  {mode === "quote" ? "with your quote." : "to send your setup link."}
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {step === 0 && (
                <>
                  <Field label="Hospital or clinic name" icon={Hospital} value={f.hospital} onChange={set("hospital")} autoComplete="organization" autoFocus />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" icon={MapPin} value={f.city} onChange={set("city")} />
                    <Field label="State" value={f.state} onChange={set("state")} />
                  </div>
                  <Field
                    label="About how many patients with diabetes?"
                    icon={Users}
                    inputMode="numeric"
                    value={f.patients}
                    onChange={set("patients")}
                    placeholder="e.g. 80"
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <Field label="Your name" icon={UserRound} value={f.contactName} onChange={set("contactName")} autoComplete="name" autoFocus />
                  <Field label="Your role" value={f.contactRole} onChange={set("contactRole")} placeholder="e.g. Medical Director" />
                  <Field
                    label="Your WhatsApp number"
                    ariaLabel="Your phone number"
                    icon={Phone}
                    type="tel"
                    inputMode="tel"
                    value={f.phone}
                    onChange={set("phone")}
                    autoComplete="tel"
                    hint="We will chat with you here."
                  />
                  <Field label="Email" ariaLabel="Your work email" icon={Mail} type="email" value={f.email} onChange={set("email")} autoComplete="email" />
                </>
              )}
              {step === 2 && (
                <>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">
                      {mode === "quote" ? "How many patients, and how many branches?" : "Anything you want us to know? (you can skip this)"}
                    </span>
                    <textarea
                      value={f.message}
                      onChange={set("message")}
                      rows={4}
                      autoFocus
                      className="mt-1.5 w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-brand"
                    />
                  </label>
                  <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-ink/[0.05]">
                    <p className="font-bold text-ink">Check your details</p>
                    <dl className="mt-2 space-y-1 text-ink-soft">
                      <div className="flex justify-between gap-3"><dt>Hospital</dt><dd className="text-right font-semibold text-ink">{f.hospital}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Name</dt><dd className="text-right font-semibold text-ink">{f.contactName}</dd></div>
                      <div className="flex justify-between gap-3"><dt>WhatsApp</dt><dd className="text-right font-semibold text-ink">{f.phone}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Email</dt><dd className="truncate text-right font-semibold text-ink">{f.email}</dd></div>
                    </dl>
                  </div>
                </>
              )}
              <input tabIndex={-1} autoComplete="off" aria-hidden value={f.website} onChange={set("website")} className="hidden" name="website" />
              <FormError>{err}</FormError>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-line bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {sent ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setF(EMPTY);
              }}
              className="flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-bold text-white hover:bg-brand-deep"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={busy}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-leaf text-base font-bold text-white shadow-[0_14px_30px_-14px_rgba(62,155,79,0.9)] hover:bg-leaf-deep disabled:opacity-60"
            >
              {busy ? "Sending..." : step < 2 ? "Next" : "Send my request"}
              {!busy && step < 2 && <ArrowRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
