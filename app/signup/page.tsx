"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    // Email confirmation is off, so we are signed in now. Go start the trial.
    router.push("/trial");
    router.refresh();
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
          <h1 className="text-center font-display text-2xl font-bold text-ink">
            Start your free trial
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
            Make a quick account so your 3 days, and your food, stay yours on any
            phone. No card needed.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              autoComplete="name"
              className="w-full rounded-xl border-2 border-line px-4 py-3 text-base text-ink outline-none transition-colors focus:border-brand"
              aria-label="Your name"
            />
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
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                type={showPw ? "text" : "password"}
                placeholder="Choose a password (6+ letters)"
                autoComplete="new-password"
                className="w-full rounded-xl border-2 border-line px-4 py-3 pr-12 text-base text-ink outline-none transition-colors focus:border-brand"
                aria-label="Choose a password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/60 transition-colors hover:text-ink"
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {err && (
              <p className="text-sm font-medium text-verdict-red">{err}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-gradient-to-r from-brand to-leaf px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(27,95,170,0.8)] transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy ? "Creating your account..." : "Create account and start"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft">
            Already have an account?{" "}
            <Link href="/signin" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
