"use client";

import { useEffect, useState } from "react";
import { Send, FlaskConical } from "lucide-react";
import RichEditor from "./RichEditor";
import { EDIT_EMAIL_EVENT, type EditEmailDetail } from "./SentEmails";

type Sender = { id: string; name: string; email: string; verified: boolean };
type List = { key: string; label: string; count: number };

const field =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand";

/** Write an email and send it to one or more lists, from the admin. */
export default function Compose({
  senders,
  lists,
  nameToken,
}: {
  senders: Sender[];
  lists: List[];
  nameToken: string;
}) {
  const [senderId, setSenderId] = useState(senders.find((s) => s.verified)?.id ?? senders[0]?.id ?? "");
  const [groups, setGroups] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [empty, setEmpty] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [testEmail, setTestEmail] = useState("omole@glufloat.com");
  const [busy, setBusy] = useState<"" | "test" | "send">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [initialHtml, setInitialHtml] = useState("");
  const [editingCopy, setEditingCopy] = useState(false);

  // "Edit" on a sent email: fill the form with a copy. A sent email cannot be
  // changed, so sending this makes a new email.
  useEffect(() => {
    const onEdit = (e: Event) => {
      const d = (e as CustomEvent<EditEmailDetail>).detail;
      setSubject(d.subject);
      if (d.senderId && senders.some((s) => s.id === d.senderId)) setSenderId(d.senderId);
      setHtml(d.html);
      setEmpty(!d.html.replace(/<[^>]+>/g, "").trim());
      setInitialHtml(d.html);
      setResetKey((k) => k + 1);
      setEditingCopy(true);
      setMsg(null);
    };
    window.addEventListener(EDIT_EMAIL_EVENT, onEdit);
    return () => window.removeEventListener(EDIT_EMAIL_EVENT, onEdit);
  }, [senders]);

  const people = lists.filter((l) => groups.includes(l.key)).reduce((s, l) => s + l.count, 0);
  const toggle = (k: string) => setGroups((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));
  const ready = !!senderId && !!subject.trim() && !empty;

  const go = async (action: "test" | "send") => {
    if (action === "send" && !window.confirm(`Send "${subject}" to ${people} ${people === 1 ? "person" : "people"}?`)) return;
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mailyte/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, senderId, subject, html, groups, testEmail }),
      });
      const out = await res.json();
      setMsg(res.ok ? { ok: true, text: out.message } : { ok: false, text: out.error ?? "It did not work." });
      if (res.ok && action === "send") {
        setSubject("");
        setHtml("");
        setEmpty(true);
        setGroups([]);
        setInitialHtml("");
        setEditingCopy(false);
        setResetKey((k) => k + 1);
      }
    } catch {
      setMsg({ ok: false, text: "No connection. Try again." });
    }
    setBusy("");
  };

  return (
    <div className="space-y-4">
      {editingCopy && (
        <p className="rounded-xl border-l-4 border-brand bg-brand/[0.07] px-4 py-3 text-sm text-ink">
          You are editing a copy of an email that was already sent. Pick who it goes to, then send it as a new email.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">From</span>
          <select className={field} value={senderId} onChange={(e) => setSenderId(e.target.value)} aria-label="Send from">
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email}){s.verified ? "" : " · not verified"}
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
                  {l.label} · {l.count}
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
        <span className="mb-1 block font-semibold text-ink">Message</span>
        <RichEditor
          resetKey={resetKey}
          initialHtml={initialHtml}
          nameToken={nameToken}
          onChange={(h, isEmpty) => {
            setHtml(h);
            setEmpty(isEmpty);
          }}
        />
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
          disabled={!!busy || !ready}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-ink ring-1 ring-line hover:bg-mist disabled:opacity-50"
        >
          <FlaskConical className="h-4 w-4" />
          {busy === "test" ? "Sending test..." : "Send a test"}
        </button>
        <button
          type="button"
          onClick={() => go("send")}
          disabled={!!busy || !ready || people === 0}
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
