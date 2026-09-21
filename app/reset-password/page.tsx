"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkBad, setLinkBad] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // The reset link puts a one-time recovery session in the URL. supabase-js
    // reads it automatically on load and fires this event once it has. If no
    // recovery session ever shows up, the link was already used or has expired.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const timer = setTimeout(() => {
      setReady((r) => {
        if (!r) setLinkBad(true);
        return r;
      });
    }, 2500);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 6) {
      setErr("Your password must be at least 6 letters.");
      return;
    }
    if (password !== confirm) {
      setErr("Those two passwords do not match.");
      return;
    }
    setBusy(true);
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErr("That did not work. Check your connection and try again.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/app");
      router.refresh();
    }, 1500);
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
          {linkBad ? (
            <>
              <h1 className="text-center font-display text-2xl font-bold text-ink">
                This link no longer works
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
                It may have already been used, or it has expired. Ask for a new
                one below.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 block w-full rounded-full bg-brand px-6 py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-brand-deep"
              >
                Send a new link
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="text-center font-display text-2xl font-bold text-ink">
                Password changed
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
                Taking you to your app now.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-center font-display text-2xl font-bold text-ink">
                Choose a new password
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-soft">
                Type a new password for your account.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-3">
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    type={showPw ? "text" : "password"}
                    placeholder="New password (6+ letters)"
                    autoComplete="new-password"
                    disabled={!ready}
                    className="w-full rounded-xl border-2 border-line px-4 py-3 pr-12 text-base text-ink outline-none transition-colors focus:border-brand disabled:opacity-60"
                    aria-label="New password"
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
                <div className="relative">
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    type={showPw ? "text" : "password"}
                    placeholder="Type it again"
                    autoComplete="new-password"
                    disabled={!ready}
                    className="w-full rounded-xl border-2 border-line px-4 py-3 pr-12 text-base text-ink outline-none transition-colors focus:border-brand disabled:opacity-60"
                    aria-label="Type your new password again"
                  />
                </div>
                {err && (
                  <p className="text-sm font-medium text-verdict-red">{err}</p>
                )}
                <button
                  type="submit"
                  disabled={busy || !ready}
                  className="w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
                >
                  {!ready ? "Checking your link..." : busy ? "Saving..." : "Save new password"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
