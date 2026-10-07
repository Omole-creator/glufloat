"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function SyncButton({ disabled }: { disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mailerlite", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: body.error ?? "It did not work. Try again." });
      } else {
        const parts = [`${body.sent} sent to MailerLite`];
        if (body.stopped) parts.push(`${body.stopped} marked unsubscribed`);
        if (body.failed) parts.push(`${body.failed} failed`);
        setMsg({ ok: !body.failed, text: `Done. ${parts.join(", ")}.` });
      }
    } catch {
      setMsg({ ok: false, text: "No connection. Try again." });
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={disabled || busy}
        className="inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Sending..." : "Send list to MailerLite"}
      </button>
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}
    </div>
  );
}
