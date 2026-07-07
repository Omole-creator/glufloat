"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setErr("That email or password did not work. Please try again.");
      setBusy(false);
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
          <h1 className="text-center font-display text-2xl font-bold text-ink">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
            Sign in to open your food checks and your meal builder.
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
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type={showPw ? "text" : "password"}
                placeholder="Your password"
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-line px-4 py-3 pr-12 text-base text-ink outline-none transition-colors focus:border-brand"
                aria-label="Your password"
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
              className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
            >
              {busy ? "Signing you in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-soft">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand hover:underline">
              Start your free trial
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
