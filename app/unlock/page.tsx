"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { hasAccess, tryUnlock, NESTUGE_URL } from "@/lib/access";
import { events } from "@/lib/analytics";

function UnlockInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "bad">("idle");

  useEffect(() => {
    if (hasAccess()) {
      setState("ok");
      return;
    }
    const fromLink = params.get("code");
    if (fromLink) {
      setCode(fromLink);
      setState(tryUnlock(fromLink) ? "ok" : "bad");
    }
  }, [params]);

  useEffect(() => {
    if (state === "ok") {
      events.unlocked();
      const t = setTimeout(() => router.push("/app"), 1800);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setState(tryUnlock(code) ? "ok" : "bad");
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
        {state === "ok" ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verdict-green/15">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-ink">
              You are in. Welcome to Glufloat.
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              The whole app is open now on your phone. Taking you in...
            </p>
            <Link
              href="/app"
              className="mt-6 inline-block rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep"
            >
              Open the app now
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-ink">
              Enter your access code
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Your code is in the message Nestuge sent you right after payment.
            </p>
            <form onSubmit={submit} className="mt-6">
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setState("idle");
                }}
                placeholder="e.g. GLU-XXXX-XXXX"
                className="w-full rounded-full border-2 border-line px-5 py-3 text-center text-base font-semibold tracking-wider text-ink outline-none transition-colors focus:border-brand"
                aria-label="Access code"
              />
              {state === "bad" && (
                <p className="mt-2 text-xs font-medium text-verdict-red">
                  That code did not work. Check the message from Nestuge and
                  try again.
                </p>
              )}
              <button
                type="submit"
                className="mt-4 w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
              >
                Unlock full access
              </button>
            </form>
            <p className="mt-5 text-xs text-ink-soft">
              No code yet?{" "}
              <a
                href={NESTUGE_URL}
                className="font-semibold text-brand hover:underline"
              >
                Subscribe for N1,500 / month
              </a>{" "}
              or{" "}
              <Link
                href="/trial"
                className="font-semibold text-brand hover:underline"
              >
                start a free trial
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function UnlockPage() {
  return (
    <>
      <Navbar />
      <Suspense>
        <UnlockInner />
      </Suspense>
      <Footer />
    </>
  );
}
