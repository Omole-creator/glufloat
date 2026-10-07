"use client";

import { useMemo, useState } from "react";
import { Eye, PenLine, Send, FlaskConical } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

type Sender = { id: string; name: string; email: string };
type List = { key: string; label: string; yes: number };

const field =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand";

/** Write an email and send it to one or more lists, from the admin. */
export default function Compose({ senders, lists }: { senders: Sender[]; lists: List[] }) {
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const [groups, setGroups] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("omole@glufloat.com");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"" | "test" | "send">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const people = lists.filter((l) => groups.includes(l.key)).reduce((s, l) => s + l.yes, 0);
  const html = useMemo(() => (preview ? renderMarkdown(body) : ""), [preview, body]);

  const toggle = (k: string) => setGroups((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));

  const go = async (action: "test" | "send") => {
    if (action === "send" && !window.confirm(`Send "${subject}" to ${people} ${people === 1 ? "person" : "people"}?`)) return;
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mailyte/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, senderId, subject, body, groups, testEmail }),
      });
      const out = await res.json();
      setMsg(res.ok ? { ok: true, text: out.message } : { ok: false, text: out.error ?? "It did not work." });
      if (res.ok && action === "send") {
        setSubject("");
        setBody("");
        setGroups([]);
      }
    } catch {
      setMsg({ ok: false, text: "No connection. Try again." });
    }
    setBusy("");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">From</span>
          <select className={field} value={senderId} onChange={(e) => setSenderId(e.target.value)} aria-label="Send from">
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-semibold text-ink">To</span>
          <div className="flex flex-wrap gap-1.5">
            {lists.map((l) => {
              const on = groups.includes(l.key);
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => toggle(l.key)}
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${
                    on ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:text-ink"
                  }`}
                >
                  {l.label} · {l.yes}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">Subject</span>
        <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Email subject" />
      </label>

      <div className="text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-semibold text-ink">Message</span>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-1 text-xs font-bold text-leaf-deep hover:underline"
          >
            {preview ? <PenLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? "Write" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div
            className="min-h-[220px] rounded-xl border border-line bg-white px-4 py-3"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <textarea
            className={`${field} min-h-[220px] font-mono`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Email message"
            placeholder={"Hello,\n\n**Bold**, [a link](https://www.glufloat.com), ## a heading"}
          />
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">Test to</span>
          <input
            className={`${field} w-64`}
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            aria-label="Test email address"
          />
        </label>
        <button
          type="button"
          onClick={() => go("test")}
          disabled={!!busy || !senderId || !subject || !body}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-ink ring-1 ring-line hover:bg-mist disabled:opacity-50"
        >
          <FlaskConical className="h-4 w-4" />
          {busy === "test" ? "Sending test..." : "Send a test"}
        </button>
        <button
          type="button"
          onClick={() => go("send")}
          disabled={!!busy || !senderId || !subject || !body || people === 0}
          className="inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {busy === "send" ? "Sending..." : `Send to ${people}`}
        </button>
      </div>
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}
    </div>
  );
}
