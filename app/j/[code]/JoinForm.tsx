"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Lock, Mail, Phone, UserRound } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";
import { createClient } from "@/lib/supabase/client";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import { clearAccessCache } from "@/lib/useAccess";

/**
 * A patient joins their hospital. Name, phone and a password; email only if
 * they have one (founder: many patients do not). Somebody already signed in
 * just taps "Join".
 */
export default function JoinForm({
  code,
  token,
  hospitalName,
  knownName,
  tokenWasBad,
  practice = false,
}: {
  code: string;
  token: string | null;
  hospitalName: string;
  knownName: string | null;
  tokenWasBad: boolean;
  /** A dietitian's practice (GluFloat for dietitians): say "your dietitian", not "your hospital". */
  practice?: boolean;
}) {
  const router = useRouter();
  const [me, setMe] = useState<{ label: string } | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(tokenWasBad ? "This invite has already been used, or it is not right. You can still join below." : "");
  const [needLogin, setNeedLogin] = useState(false);
  const [done, setDone] = useState<"active" | "waiting" | null>(null);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        const e = data.user?.email ?? null;
        if (!data.user) return setMe(null);
        setMe({ label: e && !isPhoneLoginEmail(e) ? e : e ? e.split("@")[0] : "your account" });
      });
  }, []);

  const here = `/j/${code}${token ? `?t=${token}` : ""}`;

  const join = async (useSession: boolean) => {
    setBusy(true);
    setErr("");
    setNeedLogin(false);
    const res = await fetch("/api/hospital/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(useSession ? { code, token, useSession: true } : { code, token, name, phone, email, password }),
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
        return setErr("Your account is ready. Please log in with your phone number and password.");
      }
    }
    clearAccessCache();
    setBusy(false);
    setDone(j.status === "waiting" ? "waiting" : "active");
  };

  if (done)
    return (
      <div className="space-y-5">
        <div className={`flex items-start gap-3 rounded-2xl p-4 ${done === "active" ? "bg-leaf/10" : "bg-verdict-yellow/15"}`}>
          {done === "active" ? (
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-leaf-deep" />
          ) : (
            <Clock className="mt-0.5 h-6 w-6 shrink-0 text-ink" />
          )}
          <div>
            <p className="font-display text-lg font-bold text-ink">{done === "active" ? "You are in" : "You are on the waiting list"}</p>
            <p className="mt-1 text-sm text-ink">
              {done === "active"
                ? practice
                  ? `${hospitalName} now looks after your diabetes on GluFloat. Your dietitian can see your meals and sugar tests.`
                  : `${hospitalName} now looks after your GluFloat. Your doctors and dietitians can see your meals and sugar tests.`
                : practice
                  ? `Every place with ${hospitalName} is in use right now. Your dietitian will give you a place. Until then, you can use GluFloat free for 7 days.`
                  : `Every place at ${hospitalName} is in use right now. Your hospital will give you a place. Until then, you can use GluFloat free for 7 days.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            router.push(done === "active" ? "/app" : "/trial");
            router.refresh();
          }}
          className="flex h-14 w-full items-center justify-center rounded-full bg-leaf text-base font-bold text-white shadow-[0_14px_30px_-14px_rgba(62,155,79,0.9)] hover:bg-leaf-deep"
        >
          {done === "active" ? "Open GluFloat" : "Start my 7 free days"}
        </button>
      </div>
    );

  if (me === undefined) return <div className="h-72" />;

  if (me)
    return (
      <div className="space-y-5">
        <p className="rounded-2xl bg-mist/70 px-4 py-3.5 text-sm text-ink">
          You are signed in as <span className="font-semibold">{me.label}</span>.
        </p>
        <FormError>{err}</FormError>
        <button
          onClick={() => join(true)}
          disabled={busy}
          className="flex h-14 w-full items-center justify-center rounded-full bg-leaf text-base font-bold text-white shadow-[0_14px_30px_-14px_rgba(62,155,79,0.9)] hover:bg-leaf-deep disabled:opacity-60"
        >
          {busy ? "Joining..." : `Join ${hospitalName}`}
        </button>
        <button
          onClick={async () => {
            await createClient().auth.signOut();
            clearAccessCache();
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
        void join(false);
      }}
      className="space-y-4"
    >
      {knownName ? (
        <p className="rounded-2xl bg-mist/70 px-4 py-3 text-sm text-ink">
          Name: <span className="font-semibold">{knownName}</span>
        </p>
      ) : (
        <Field label="Your name" icon={UserRound} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      )}
      <Field
        label="Your phone number"
        icon={Phone}
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        autoComplete="tel"
        hint={knownName ? `The number you gave ${practice ? "your dietitian" : "your hospital"}. You will log in with it.` : "You will log in with this number."}
      />
      <Field
        label="Email (only if you have one)"
        ariaLabel="Your email, if you have one"
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
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
        hint="6 or more letters or numbers. Write it down somewhere safe."
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
        <SubmitButton busy={busy} busyText="Getting you in..." tone="leaf">
          Join {hospitalName}
        </SubmitButton>
      </div>
      <p className="text-center text-sm text-ink-soft">
        Already use GluFloat?{" "}
        <Link href={`/signin?next=${encodeURIComponent(here)}`} className="font-semibold text-brand hover:underline">
          Log in first
        </Link>
      </p>
    </form>
  );
}
