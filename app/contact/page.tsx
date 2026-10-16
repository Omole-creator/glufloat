import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | Glufloat",
  description: "Call, WhatsApp or email GluFloat, or send us a message. We are happy to help.",
  alternates: { canonical: "/contact" },
};

// The founder's numbers and addresses (2026-10-16). Change them only on his word.
const PHONES = ["09048744395", "09042445171"];
const EMAILS = ["glufloat@gmail.com", "support@glufloat.com"];
const ADDRESS = "11 Idris Ogunlaja Drive, Majek, Lagos, Nigeria";

const pretty = (n: string) => `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
const intl = (n: string) => `234${n.slice(1)}`;

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-mist via-white to-white pb-16 pt-28 sm:pt-32">
          <div className="dots pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60" aria-hidden />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf/10 px-3 py-1 text-sm font-semibold text-leaf-deep">
                Contact us
              </span>
              <h1 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-5xl">
                We Are Here To Help
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">Call us, chat with us on WhatsApp, email us, or send a message below.</p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-4">
                <div className="rounded-3xl bg-white p-6 shadow-[0_18px_50px_-24px_rgba(12,42,71,0.35)] ring-1 ring-brand/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Phone className="h-5 w-5" />
                    </span>
                    <h2 className="font-display text-lg font-bold text-ink">Call or WhatsApp</h2>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {PHONES.map((p) => (
                      <li key={p} className="flex flex-wrap items-center justify-between gap-2">
                        <a href={`tel:+${intl(p)}`} className="font-display text-xl font-bold text-ink hover:text-brand">
                          {pretty(p)}
                        </a>
                        <span className="flex gap-2">
                          <a
                            href={`tel:+${intl(p)}`}
                            aria-label={`Call ${pretty(p)}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-bold text-ink hover:border-brand"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${intl(p)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp ${pretty(p)}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-sm font-bold text-white hover:brightness-95"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-[0_18px_50px_-24px_rgba(12,42,71,0.35)] ring-1 ring-brand/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf-deep">
                      <Mail className="h-5 w-5" />
                    </span>
                    <h2 className="font-display text-lg font-bold text-ink">Email</h2>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {EMAILS.map((e) => (
                      <li key={e}>
                        <a href={`mailto:${e}`} className="break-all font-display text-lg font-bold text-brand hover:underline">
                          {e}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-[0_18px_50px_-24px_rgba(12,42,71,0.35)] ring-1 ring-brand/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <h2 className="font-display text-lg font-bold text-ink">Address</h2>
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-ink">{ADDRESS}</p>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-[0_18px_50px_-24px_rgba(12,42,71,0.35)] ring-1 ring-brand/10 sm:p-8">
                <h2 className="font-display text-xl font-bold text-ink">Send us a message</h2>
                <p className="mt-1 text-sm text-ink-soft">We reply by email or phone.</p>
                <div className="mt-5">
                  <ContactForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
