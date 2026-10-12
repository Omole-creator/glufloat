"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Phone, UserRound } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";
import { createClient } from "@/lib/supabase/client";
import { clearAccessCache } from "@/lib/useAccess";

export default function StaffJoinForm({
  token,
  name: givenName,
  phone: givenPhone,
  email: givenEmail,
  hospital,
}: {
  token: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  hospital: string;
}) {
  const router = useRouter();
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState(givenName ?? "");
  const [phone, setPhone] = useState(givenPhone ?? "");
  const [email, setEmail] = useState(givenEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setMe(data.user ? data.user.email ?? "your account" : null));
  }, []);

  const accept = async (useSession: boolean) => {
    setBusy(true);
    setErr("");
    setNeedLogin(false);
    const res = await fetch("/api/hospital/staff/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(useSession ? { token, useSession: true, name, phone } : { token, name, phone, email, password }),
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
        return setErr("Your login is ready. Please sign in with your email and password.");
      }
    }
    clearAccessCache();
    router.push("/hospital");
    router.refresh();
  };

  const here = `/hospital/join/${token}`;

  if (me === undefined) return <div className="h-72" />;

  if (me)
    return (
      <div className="space-y-5">
        <p className="rounded-2xl bg-mist/70 px-4 py-3.5 text-sm text-ink">
          You are signed in as <span className="font-semibold">{me}</span>.
        </p>
        <Field label="Your WhatsApp number" icon={Phone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Patients may chat with you on it." />
        <FormError>{err}</FormError>
        <button
          onClick={() => accept(true)}
          disabled={busy}
          className="flex h-14 w-full items-center justify-center rounded-full bg-leaf text-base font-bold text-white hover:bg-leaf-deep disabled:opacity-60"
        >
          {busy ? "Joining..." : `Join ${hospital}`}
        </button>
        <button
          onClick={async () => {
            await createClient().auth.signOut();
            setMe(null);
          }}
          className="w-full text-center text-sm font-semibold text-brand hover:underline"
        >
          Not you? Use another account
        </button>
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void accept(false);
      }}
      className="space-y-4"
    >
      <Field label="Your name" icon={UserRound} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
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
        label="Your WhatsApp number"
        icon={Phone}
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        autoComplete="tel"
        hint="Patients may chat with you on it."
      />
      <Field
        label="Choose a password"
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
          Join {hospital}
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
