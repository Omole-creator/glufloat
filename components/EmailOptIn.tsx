"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { readEmailConsent, saveEmailConsent } from "@/lib/emailConsent";
import { showToast } from "./Toast";

/**
 * "Can we email you?" on the My details tab. MailerLite (and the law) only
 * let us email people who said yes, and sign-up never asked. /admin/email
 * sends only the people who tapped yes here. Renders nothing until the SQL
 * (supabase/email-consent-schema.sql) has been run.
 */
export default function EmailOptIn() {
  const [value, setValue] = useState<boolean | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    void readEmailConsent().then((c) => setValue(c.state === "ok" ? c.value : undefined));
  }, []);

  if (value === undefined) return null;

  const choose = async (v: boolean) => {
    setBusy(true);
    setProblem(false);
    const ok = await saveEmailConsent(v);
    setBusy(false);
    if (!ok) {
      setProblem(true);
      return;
    }
    setValue(v);
    showToast("Saved");
  };

  const btn =
    "rounded-full px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50";

  return (
    <div className="mt-4 rounded-3xl bg-white p-5 shadow-[0_10px_30px_-18px_rgba(12,42,71,0.35)] ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Mail className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-ink">Get GluFloat tips by email</h3>
          {value === null && (
            <p className="mt-1 text-sm text-ink-soft">
              Food tips, new things in the app, and news. You can stop any time.
            </p>
          )}
          {value === true && (
            <p className="mt-1 text-sm text-ink-soft">You will get our emails. Every email has a link to stop them.</p>
          )}
          {value === false && <p className="mt-1 text-sm text-ink-soft">We will not send you emails.</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {value !== true && (
          <button type="button" disabled={busy} onClick={() => choose(true)} className={`${btn} bg-leaf text-white hover:bg-leaf-deep`}>
            Yes, email me
          </button>
        )}
        {value === null && (
          <button type="button" disabled={busy} onClick={() => choose(false)} className={`${btn} text-ink-soft ring-1 ring-line hover:text-ink`}>
            No, thanks
          </button>
        )}
        {value === true && (
          <button type="button" disabled={busy} onClick={() => choose(false)} className={`${btn} text-ink-soft ring-1 ring-line hover:text-ink`}>
            Stop the emails
          </button>
        )}
      </div>
      {problem && (
        <p className="mt-3 text-sm font-semibold text-verdict-red">This did not save. Check your internet and try again.</p>
      )}
    </div>
  );
}
