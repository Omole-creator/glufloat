"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

/** Send one test alert to glufloat@gmail.com and show Mailyte's own answer. */
export default function TestEmail() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          const res = await fetch("/api/admin/hospitals/test-email", { method: "POST" });
          const j = await res.json().catch(() => ({}));
          setBusy(false);
          setMsg(
            j.ok
              ? { ok: true, text: `Sent to ${j.to}. Check that inbox (and Spam).` }
              : { ok: false, text: `Not sent. Mailyte said: ${j.detail ?? "no answer"}${j.status ? ` (${j.status})` : ""}` },
          );
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink hover:border-brand disabled:opacity-50"
      >
        <Mail className="h-4 w-4" /> {busy ? "Sending..." : "Send a test email"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}
    </div>
  );
}
