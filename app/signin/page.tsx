"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, UserRound } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";
import { createClient } from "@/lib/supabase/client";
import { looksLikePhone, phoneLoginEmail } from "@/lib/phoneLogin";

/** Only ever a path on this site, never somewhere else (`//evil.com` included). */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

function SignInForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [who, setWho] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    // A hospital patient with no email logs in with their phone number
    // (lib/phoneLogin.ts). Everybody else types their email, as before.
    const byPhone = looksLikePhone(who);
    const email = byPhone ? phoneLoginEmail(who) : who.trim();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErr(
        byPhone
          ? "That phone number or password did not work. If you made your account with an email, use your email."
          : "That email or password did not work. Please try again.",
      );
      setBusy(false);
      return;
    }
    let to = next ?? "/app";
    if (!next) {
      // Hospital doctors, dietitians and admins go to their dashboard.
      try {
        const res = await fetch("/api/hospital/me", { cache: "no-store" });
        const j = (await res.json()) as { staff?: unknown[] };
        if (Array.isArray(j.staff) && j.staff.length > 0) to = "/hospital";
      } catch {
        /* fall through to the app */
      }
    }
    router.push(to);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field
        label="Email or phone number"
        ariaLabel="Your email or phone number"
        icon={UserRound}
        value={who}
        onChange={(e) => setWho(e.target.value)}
        required
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
      />
      <div>
        <Field
          label="Password"
          ariaLabel="Your password"
          icon={Lock}
          password
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <p className="mt-2 text-right text-sm">
          <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
            Forgot your password?
          </Link>
        </p>
      </div>
      <FormError>{err}</FormError>
      <SubmitButton busy={busy} busyText="Signing you in...">
        Sign in
      </SubmitButton>
      <div className="relative py-1 text-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden />
        <span className="relative bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft/70">New here?</span>
      </div>
      <Link
        href="/signup"
        className="flex h-14 w-full items-center justify-center rounded-full border-2 border-line text-base font-bold text-ink transition-colors hover:border-brand hover:text-brand"
      >
        Start your free trial
      </Link>
    </form>
  );
}

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to open your food checks and your meal builder.">
      {/* useSearchParams needs a Suspense boundary to prerender. */}
      <Suspense fallback={<div className="h-80" />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
