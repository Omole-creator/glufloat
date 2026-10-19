"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, X, RotateCcw, Trash2, ChevronDown } from "lucide-react";
import RichEditor from "./RichEditor";
import { MAX_TOTAL_BYTES, fileProblem, mb } from "@/lib/directEmail";

export type DirectFrom = { email: string; name: string; ready: boolean | null };
export type DirectSent = {
  id: string;
  sent_at: string;
  from_email: string;
  to_name: string;
  to_email: string;
  cc: string | null;
  subject: string;
  html: string;
  attachments: string[];
};

const field =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** Write one email, with files, to one person, hospital or HMO, and see what was sent. */
export default function DirectEmail({
  senders,
  sent,
  listReady,
}: {
  senders: DirectFrom[];
  sent: DirectSent[];
  /** False until direct-email-schema.sql (#33) is run. */
  listReady: boolean;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(senders.find((s) => s.ready)?.email ?? senders[0].email);
  const [toName, setToName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [empty, setEmpty] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [initialHtml, setInitialHtml] = useState("");
  const [again, setAgain] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<DirectSent | null>(null);
  const [removing, setRemoving] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const formTop = useRef<HTMLDivElement>(null);

  const sender = senders.find((s) => s.email === from);
  const fileError = fileProblem(files);
  const total = files.reduce((s, f) => s + f.size, 0);
  const ready = !!toName.trim() && !!toEmail.trim() && !!subject.trim() && !empty && !fileError;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next);
    if (picker.current) picker.current.value = "";
  };

  const clear = () => {
    setToName("");
    setToEmail("");
    setCc("");
    setSubject("");
    setHtml("");
    setEmpty(true);
    setFiles([]);
    setInitialHtml("");
    setAgain(null);
    setResetKey((k) => k + 1);
  };

  const send = async () => {
    const fileLine = files.length ? ` with ${files.length} ${files.length === 1 ? "file" : "files"}` : "";
    if (!window.confirm(`Send "${subject}" to ${toName} (${toEmail})${fileLine}, from ${sender?.name}?`)) return;
    setBusy(true);
    setMsg(null);
    const body = new FormData();
    body.set("from", from);
    body.set("toName", toName);
    body.set("toEmail", toEmail);
    body.set("cc", cc);
    body.set("subject", subject);
    body.set("html", html);
    for (const f of files) body.append("files", f, f.name);
    try {
      const res = await fetch("/api/admin/email/direct", { method: "POST", body });
      const out = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({
          ok: true,
          text: out.saved || !listReady ? out.message : `${out.message} It was sent, but it could not be added to the list below.`,
        });
        clear();
        router.refresh();
      } else {
        setMsg({
          ok: false,
          text: res.status === 413 ? `The files are too big. Keep them under ${mb(MAX_TOTAL_BYTES)} in total.` : (out.error ?? "It did not send. Try again."),
        });
      }
    } catch {
      setMsg({ ok: false, text: "No connection. Nothing was sent. Try again." });
    }
    setBusy(false);
  };

  const sendAgain = (e: DirectSent) => {
    if (senders.some((s) => s.email === e.from_email)) setFrom(e.from_email);
    setToName(e.to_name);
    setToEmail(e.to_email);
    setCc(e.cc ?? "");
    setSubject(e.subject);
    setHtml(e.html);
    setEmpty(!e.html.replace(/<[^>]+>/g, "").trim());
    setInitialHtml(e.html);
    setFiles([]);
    setAgain(e.attachments);
    setResetKey((k) => k + 1);
    setMsg(null);
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const remove = async () => {
    if (!pending) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/email/direct?id=${pending.id}`, { method: "DELETE" });
      const out = await res.json().catch(() => ({}));
      if (res.ok) router.refresh();
      else setMsg({ ok: false, text: out.error ?? "Could not remove it." });
    } catch {
      setMsg({ ok: false, text: "No connection. Try again." });
    }
    setRemoving(false);
    setPending(null);
  };

  return (
    <div className="space-y-4" ref={formTop}>
      {again && (
        <p className="rounded-xl border-l-4 border-brand bg-brand/[0.07] px-4 py-3 text-sm text-ink">
          You are sending a copy of an email again.
          {again.length > 0 && <> Attach the files again: {again.join(", ")}.</>}{" "}
          <button type="button" onClick={clear} className="font-bold text-brand hover:underline">
            Start a new email instead
          </button>
        </p>
      )}

      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">From</span>
        <select className={field} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Send the single email from">
          {senders.map((s) => (
            <option key={s.email} value={s.email}>
              {s.name} ({s.email}){s.ready === false ? " · not set up in Mailyte yet" : ""}
            </option>
          ))}
        </select>
        {sender?.ready === false && (
          <span className="mt-1 block text-xs font-semibold text-verdict-red">
            Mailyte will not send from this address until it is added and verified there (Sending, Senders).
          </span>
        )}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">Their name <span className="font-normal text-ink-soft">(a person, hospital or HMO)</span></span>
          <input className={field} value={toName} onChange={(e) => setToName(e.target.value)} aria-label="Name of the person or organisation" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">Their email</span>
          <input
            className={field}
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            aria-label="Their email address"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">
          Copy to <span className="font-normal text-ink-soft">(optional, separate with commas)</span>
        </span>
        <input className={field} value={cc} onChange={(e) => setCc(e.target.value)} aria-label="Copy the email to" />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">Subject</span>
        <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Single email subject" />
      </label>

      <div className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Message</span>
        <RichEditor
          resetKey={resetKey}
          initialHtml={initialHtml}
          onChange={(h, isEmpty) => {
            setHtml(h);
            setEmpty(isEmpty);
          }}
        />
      </div>

      <div className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Files</span>
        <input
          ref={picker}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          aria-label="Choose files to attach"
        />
        <button
          type="button"
          onClick={() => picker.current?.click()}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-ink ring-1 ring-line hover:bg-mist"
        >
          <Paperclip className="h-4 w-4" />
          Attach files
        </button>
        <span className="ml-3 text-xs text-ink-soft">Up to {mb(MAX_TOTAL_BYTES)} in total.</span>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-mist px-3 py-2">
                <span className="min-w-0 truncate text-ink">
                  {f.name} <span className="text-ink-soft">· {mb(f.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.name}`}
                  className="rounded-full p-1 text-ink-soft hover:bg-white hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
            <li className="text-xs text-ink-soft">Total {mb(total)}</li>
          </ul>
        )}
        {fileError && <p className="mt-2 text-xs font-semibold text-verdict-red">{fileError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={send}
          disabled={busy || !ready}
          className="inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {busy ? "Sending..." : toName.trim() ? `Send to ${toName.trim()}` : "Send"}
        </button>
      </div>
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}

      <details className="group border-t border-line pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-ink">
          <span>
            Sent to one person or organisation {listReady && <span className="font-normal text-ink-soft">· {sent.length}</span>}
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        {!listReady ? (
          <p className="mt-3 text-sm text-ink-soft">The list is waiting for the database update (direct-email-schema.sql).</p>
        ) : sent.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nothing sent yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {sent.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{e.subject}</p>
                  <p className="text-xs text-ink-soft">
                    To {e.to_name} ({e.to_email}){e.cc ? `, copy to ${e.cc}` : ""} · from {e.from_email} · {when(e.sent_at)}
                  </p>
                  {e.attachments.length > 0 && (
                    <p className="mt-0.5 text-xs text-ink-soft">
                      <Paperclip className="mr-1 inline h-3 w-3" />
                      {e.attachments.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => sendAgain(e)}
                    aria-label={`Send again: ${e.subject} to ${e.to_name}, ${when(e.sent_at)}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-brand ring-1 ring-line hover:bg-mist"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Send again
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(e)}
                    aria-label={`Delete from list: ${e.subject} to ${e.to_name}, ${when(e.sent_at)}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-verdict-red ring-1 ring-line hover:bg-mist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </details>

      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="font-display text-lg font-bold text-ink">Delete this from the list?</p>
            <p className="mt-2 text-sm text-ink-soft">
              &ldquo;{pending.subject}&rdquo; to {pending.to_name}. This only removes it from the list. The email was already sent and stays in their inbox.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-full px-4 py-2 text-sm font-bold text-ink ring-1 ring-line hover:bg-mist"
              >
                No, keep it
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={removing}
                className="rounded-full bg-verdict-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {removing ? "Deleting..." : "Yes, delete it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
