"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Hospital, Lock, Mail, Phone, UserRound } from "lucide-react";
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
      title="Start your free trial"
      subtitle="Make a quick account so your 7 days, and your food, stay yours on any phone. No card needed."
    >
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

      {/* The second door (founder, 2026-10-12): a hospital does not sign up here. */}
      <Link
        href="/hospitals"
        className="mt-6 flex items-center gap-3 rounded-2xl bg-mist/70 px-4 py-3.5 text-sm text-ink ring-1 ring-inset ring-brand/10 transition-colors hover:bg-mist"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand ring-1 ring-inset ring-brand/10">
          <Hospital className="h-4.5 w-4.5" />
        </span>
        <span>
          <span className="block font-semibold">Signing up a hospital or clinic?</span>
          <span className="text-ink-soft">See GluFloat for hospitals</span>
        </span>
      </Link>
    </AuthShell>
  );
}
