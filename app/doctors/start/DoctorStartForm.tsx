"use client";

import { useState } from "react";
import { BadgeCheck, MailCheck, Mail, UserRound } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";

/**
 * A doctor signs up (/api/doctors/start): name, email and MDCN folio number.
 * No password here and no phone number. The email carries the link to finish
 * setting up, so nothing waits for anybody to approve it.
 */
export default function DoctorStartForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mdcn, setMdcn] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState<{ emailed: boolean; link: string | null } | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/doctors/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, mdcn, website }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Something went wrong. Please try again.");
    setSent({ emailed: j.emailed !== false, link: j.link ?? null });
  };

  if (sent)
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-leaf/10 p-4">
          <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-leaf-deep" />
          <div>
            <p className="font-display text-lg font-bold text-ink">{sent.emailed ? "Check your email" : "Almost there"}</p>
            <p className="mt-1 text-sm text-ink">
              {sent.emailed
                ? `We sent a link to ${email}. Tap it to choose your password and open your dashboard. Look in Spam if you do not see it.`
                : "We could not send the email just now. Please try again in a few minutes, or call us on 0813 209 7317."}
            </p>
          </div>
        </div>
        {sent.link && (
          <a href={sent.link} className="block break-all text-center text-sm font-semibold text-brand hover:underline">
            Test only: {sent.link}
          </a>
        )}
      </div>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="relative space-y-4"
    >
      <Field
        label="Your name, as your patients know you"
        icon={UserRound}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
        hint="For example: Dr Chidi Okafor. Your patients see this name."
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
        hint="We send your set-up link here."
      />
      <Field
        label="Your MDCN folio number"
        icon={BadgeCheck}
        value={mdcn}
        onChange={(e) => setMdcn(e.target.value)}
        required
        autoCapitalize="characters"
        spellCheck={false}
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
      <FormError>{err}</FormError>
      <div className="pt-1">
        <SubmitButton busy={busy} busyText="Sending..." tone="leaf">
          Send my set-up link
        </SubmitButton>
      </div>
      <p className="text-center text-sm text-ink-soft">
        Already set up?{" "}
        <a href="/signin" className="font-semibold text-brand hover:underline">
          Log in
        </a>
      </p>
    </form>
  );
}
