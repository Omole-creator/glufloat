"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { abs } from "@/lib/site";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: abs("/reset-password"),
    });
    setBusy(false);
    if (error) {
      setErr("That did not work. Check your connection and try again.");
      return;
    }
    setSent(true);
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
          {sent ? (
            <>
              <h1 className="text-center font-display text-2xl font-bold text-ink">
                Check your email
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
                We sent a link to <span className="font-semibold text-ink">{email}</span>.
                Open it on this phone or computer to choose a new password.
              </p>
              <p className="mt-5 text-center text-sm text-ink-soft">
                Did not get it? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-semibold text-brand hover:underline"
                >
                  try again
                </button>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="text-center font-display text-2xl font-bold text-ink">
                Forgot your password?
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
                Type the email you signed up with. We will send you a link to
                choose a new password.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-3">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="Your email"
                  autoComplete="email"
                  className="w-full rounded-xl border-2 border-line px-4 py-3 text-base text-ink outline-none transition-colors focus:border-brand"
                  aria-label="Your email"
                />
                {err && (
                  <p className="text-sm font-medium text-verdict-red">{err}</p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
                >
                  {busy ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          )}

          <p className="mt-5 text-center text-sm text-ink-soft">
            <Link href="/signin" className="font-semibold text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
