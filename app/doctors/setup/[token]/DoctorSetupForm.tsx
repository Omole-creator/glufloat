"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";
import { createClient } from "@/lib/supabase/client";
import { currentUser } from "@/lib/authUser";
import { clearAccessCache } from "@/lib/useAccess";

export default function DoctorSetupForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    void currentUser().then((u) => setMe(u ? u.email ?? "your account" : null));
  }, []);

  const finish = async (useSession: boolean) => {
    setBusy(true);
    setErr("");
    setNeedLogin(false);
    const res = await fetch("/api/doctors/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(useSession ? { token, useSession: true } : { token, password }),
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
        return setErr("Your login is ready. Please log in with your email and password.");
      }
    }
    clearAccessCache();
    router.push("/hospital");
    router.refresh();
  };

  if (me === undefined) return <div className="h-48" />;
  const here = `/doctors/setup/${token}`;

  if (me)
    return (
      <div className="space-y-5">
        <p className="rounded-2xl bg-mist/70 px-4 py-3.5 text-sm text-ink">
          You are signed in as <span className="font-semibold">{me}</span>.
        </p>
        <FormError>{err}</FormError>
        <button
          onClick={() => finish(true)}
          disabled={busy}
          className="flex h-14 w-full items-center justify-center rounded-full bg-leaf text-base font-bold text-white hover:bg-leaf-deep disabled:opacity-60"
        >
          {busy ? "Setting you up..." : "Open my dashboard"}
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
        void finish(false);
      }}
      className="space-y-4"
    >
      <p className="rounded-2xl bg-mist/70 px-4 py-3.5 text-sm text-ink">
        Your login email is <span className="font-semibold">{email}</span>.
      </p>
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
      <SubmitButton busy={busy} busyText="Setting you up..." tone="leaf">
        Open my dashboard
      </SubmitButton>
    </form>
  );
}
