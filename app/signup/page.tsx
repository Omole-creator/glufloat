"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Hospital, Lock, Mail, Phone, UserRound } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";
import { createClient } from "@/lib/supabase/client";
import { partnerCode, sourcePost } from "@/lib/attribution";
import { SIGNUP_CHOICES, type UserType } from "@/lib/userType";
import { normalizePhone } from "@/lib/phone";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";

/**
 * Redesigned 2026-10-12 (founder: the old page "looks archaic"). The look
 * changed; what it asks and what it saves did NOT: name, email, phone,
 * password, then the "What are you?" drop-down LAST (founder's call, twice),
 * carried into the account exactly as before so the sign-up trigger
 * (handle_new_user) gets the same six things.
 */
export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType | "">("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // The two doors (founder, 2026-10-12): a person, or a hospital. The hospital
  // door is a choice at the very top, not a small link under the form.
  const [path, setPath] = useState<"me" | "hospital">("me");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    // A health worker looking at the app and a person living with diabetes are
    // two different numbers. Mixed together they tell you nothing, so this one
    // is not optional.
    if (!userType) {
      setErr("Please tap which one you are.");
      return;
    }
    // We ring or WhatsApp people to help them, so the number has to be real.
    // Count only the digits, so spaces, +234 and 0 all pass.
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setErr("Please put a phone number we can reach you on.");
      return;
    }
    // The stand-in addresses for phone-only hospital patients are made on the
    // server only (lib/phoneLogin.ts). Nobody may claim one from here.
    if (isPhoneLoginEmail(email)) {
      setErr("Please use your own email address.");
      return;
    }
    setBusy(true);
    setErr("");
    const supabase = createClient();
    // Carry whatever brought them here into the account: a blog post, a partner's
    // referral link, or neither. The database trigger copies both onto their
    // profile. Both are empty for someone who arrived any other way, and that
    // person signs up exactly as they always did.
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          // Stored in one shape (08132097317), never as typed. Four ways of
          // writing one number are four different strings, and then the same
          // handset can hold any number of accounts without it ever showing.
          phone: normalizePhone(phone),
          source_post: sourcePost(),
          partner_code: partnerCode(),
          user_type: userType,
        },
      },
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
    <AuthShell
      title={path === "me" ? "Start your free trial" : "GluFloat for your hospital"}
      subtitle={
        path === "me"
          ? "Make a quick account so your 7 days, and your food, stay yours on any phone. No card needed."
          : "Give your diabetes patients GluFloat, and see their meals and sugar tests from one place."
      }
    >
      <div role="tablist" aria-label="Who is this account for?" className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-mist p-1">
        {[
          { id: "me" as const, label: "For me or my family", icon: UserRound },
          { id: "hospital" as const, label: "For a hospital or clinic", icon: Hospital },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={path === t.id}
            onClick={() => setPath(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-bold leading-tight transition-all sm:text-sm ${
              path === t.id ? "bg-white text-ink shadow-[0_4px_14px_-6px_rgba(12,42,71,0.35)]" : "text-ink-soft hover:text-ink"
            }`}
          >
            <t.icon className="h-4 w-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>

      {path === "hospital" ? (
        <div className="space-y-4">
          <ul className="space-y-2.5 text-[15px] text-ink">
            {[
              "Your patients get everything in GluFloat Premium",
              "Your doctors and dietitians see their meals and sugar tests",
              "Free for 30 days, for 20 patients",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/hospitals?pilot=1"
            className="flex h-14 w-full items-center justify-center rounded-full bg-leaf text-base font-bold text-white shadow-[0_14px_30px_-14px_rgba(62,155,79,0.9)] transition-transform hover:-translate-y-0.5"
          >
            Start my free pilot
          </Link>
          <Link href="/hospitals" className="block text-center text-sm font-semibold text-brand hover:underline">
            See plans and prices
          </Link>
        </div>
      ) : (
      <>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Your name"
          icon={UserRound}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
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
          label="Phone number"
          ariaLabel="Your phone number"
          icon={Phone}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
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
          hint="6 or more letters or numbers."
        />
        <label className="block">
          <span className="text-sm font-semibold text-ink">What are you?</span>
          <span className="relative mt-1.5 block">
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value as UserType | "")}
              required
              aria-label="What are you?"
              className={`h-14 w-full appearance-none rounded-2xl border-2 border-line bg-[#fbfcfe] pl-4 pr-12 text-base outline-none transition-colors focus:border-brand focus:bg-white ${
                userType ? "text-ink" : "text-ink-soft/70"
              }`}
            >
              <option value="">Tap to choose</option>
              {SIGNUP_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft/60" />
          </span>
        </label>

        <FormError>{err}</FormError>
        <div className="pt-1">
          <SubmitButton busy={busy} busyText="Creating your account..." tone="leaf">
            Create account and start
          </SubmitButton>
        </div>
        <p className="text-center text-xs text-ink-soft">No card needed · 7 days free · Stop any time</p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/signin" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>

      </>
      )}
    </AuthShell>
  );
}
