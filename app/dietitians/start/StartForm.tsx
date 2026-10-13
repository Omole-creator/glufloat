"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Lock, Mail, Phone, UserRound } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";
import { createClient } from "@/lib/supabase/client";
import { currentUser } from "@/lib/authUser";
import { clearAccessCache } from "@/lib/useAccess";

/**
 * A dietitian starts GluFloat for dietitians (/api/practice/start). Her name
 * as her patients know her, her DCN registration number, her WhatsApp number,
 * and an email + password unless she is already signed in.
 */
export default function StartForm() {
  const router = useRouter();
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [dcn, setDcn] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    void currentUser().then((u) => setMe(u ? u.email ?? "your account" : null));
  }, []);

  const start = async (useSession: boolean) => {
    setBusy(true);
    setErr("");
    setNeedLogin(false);
    const res = await fetch("/api/practice/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dcn, phone, website, ...(useSession ? { useSession: true } : { email, password }) }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      if (j.needLogin) setNeedLogin(true);
      return setErr(j.error ?? "Something went wrong. Please try again.");
    }
    if (j.login) {
      const { error } = await createClient().auth.signInWithPassword({ email: j.login, password });
      if (error) {
        setBusy(false);
        return setErr("Your account is ready. Please log in with your email and password.");
      }
    }
    clearAccessCache();
    router.push("/hospital");
    router.refresh();
  };

  if (me === undefined) return <div className="h-80" />;

  const here = "/dietitians/start";
  const common = (
    <>
      <Field
        label="Your name, as your patients know you"
        icon={UserRound}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
        hint="For example: Dtn. Mary Adeleke. Your patients see this name."
      />
      <Field
        label="Your DCN registration number"
        icon={BadgeCheck}
        value={dcn}
        onChange={(e) => setDcn(e.target.value)}
        required
        autoCapitalize="characters"
        spellCheck={false}
        hint="From the Dietitians Council of Nigeria. We check it."
      />
      <Field
        label="Your WhatsApp number"
        icon={Phone}
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        autoComplete="tel"
        hint="Your patients chat with you on it."
      />
      {/* A box people never see. A bot fills every box it finds. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
    </>
  );

  if (me)
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void start(true);
        }}
        className="relative space-y-4"
      >
        <p className="rounded-2xl bg-mist/70 px-4 py-3.5 text-sm text-ink">
          You are signed in as <span className="font-semibold">{me}</span>.
        </p>
        {common}
        <FormError>{err}</FormError>
        <SubmitButton busy={busy} busyText="Setting you up..." tone="leaf">
          Start my 14 free days
        </SubmitButton>
        <button
          type="button"
          onClick={async () => {
            await createClient().auth.signOut();
            clearAccessCache();
            setMe(null);
          }}
          className="w-full text-center text-sm font-semibold text-brand hover:underline"
        >
          Not you? Use another account
        </button>
      </form>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void start(false);
      }}
      className="relative space-y-4"
    >
      {common}
      <Field
        label="Email"
        ariaLabel="Your email"
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
      />
      <Field
        label="Choose a password"
        ariaLabel="Your password"
        icon={Lock}
        password
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        autoComplete="new-password"
      />
      <FormError>{err}</FormError>
      {needLogin && (
        <Link
          href={`/signin?next=${encodeURIComponent(here)}`}
          className="flex h-12 w-full items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand hover:bg-brand/5"
        >
          Log in, then come back here
        </Link>
      )}
      <div className="pt-1">
        <SubmitButton busy={busy} busyText="Setting you up..." tone="leaf">
          Start my 14 free days
        </SubmitButton>
      </div>
      <p className="text-center text-sm text-ink-soft">
        Already have a GluFloat login?{" "}
        <Link href={`/signin?next=${encodeURIComponent(here)}`} className="font-semibold text-brand hover:underline">
          Log in first
        </Link>
      </p>
    </form>
  );
}
