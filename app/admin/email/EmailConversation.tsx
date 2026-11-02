"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, CornerUpLeft, MessageCircleReply, Paperclip, Send, X } from "lucide-react";
import RichEditor from "./RichEditor";
import SentPopup from "./SentPopup";
import { MAX_TOTAL_BYTES, fileProblem, mb, newSendKey } from "@/lib/directEmail";
import { replyRecipient, waitingForUs, type ThreadMessage } from "@/lib/emailThread";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export type ConversationEmail = {
  id: string;
  from_email: string;
  to_name: string;
  to_email: string;
  subject: string;
  replied_at?: string | null;
  reply_from?: string | null;
  reply_snippet?: string | null;
  done_at?: string | null;
  thread?: ThreadMessage[];
};

/** Is this email waiting for an answer from us? Same rule as the job's list. */
export function isWaiting(e: ConversationEmail): boolean {
  const t = e.thread ?? [];
  return t.length ? waitingForUs(t, e.done_at) : !!e.replied_at && !e.done_at;
}

/**
 * The conversation under one email on /admin/email (2026-11-02): their
 * replies and our answers, oldest first, and a Reply box that answers from
 * the same address in the same thread (/api/admin/email/reply).
 */
export default function EmailConversation({ e, threadReady }: { e: ConversationEmail; threadReady: boolean }) {
  const router = useRouter();
  const thread = e.thread ?? [];
  const waiting = isWaiting(e);
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const [empty, setEmpty] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [popup, setPopup] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const sendKey = useRef("");
  useEffect(() => {
    sendKey.current = newSendKey();
  }, [html, files]);

  const fileError = fileProblem(files);
  const to = replyRecipient(e.to_email, thread);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    setFiles(next);
    if (picker.current) picker.current.value = "";
  };

  const send = async () => {
    if (!window.confirm(`Send your answer to ${to}, from ${e.from_email}?`)) return;
    setBusy(true);
    setMsg(null);
    const body = new FormData();
    body.set("emailId", e.id);
    body.set("html", html);
    body.set("sendKey", sendKey.current);
    for (const f of files) body.append("files", f, f.name);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120_000);
    try {
      const res = await fetch("/api/admin/email/reply", { method: "POST", body, signal: ctrl.signal });
      const out = await res.json().catch(() => ({}));
      if (res.ok) {
        setPopup(out.message ?? "Your answer has gone.");
        setMsg(out.saved ? null : { ok: true, text: `${out.message} It went, but could not be added to the conversation here.` });
        setHtml("");
        setEmpty(true);
        setFiles([]);
        setResetKey((k) => k + 1);
        setOpen(false);
        router.refresh();
      } else {
        setMsg({
          ok: false,
          text: res.status === 413 ? `The files are too big. Keep them under ${mb(MAX_TOTAL_BYTES)} in total.` : (out.error ?? "It did not send. Try again."),
        });
      }
    } catch (err) {
      setMsg({
        ok: false,
        text:
          err instanceof Error && err.name === "AbortError"
            ? "This took too long, so we stopped waiting. Press Send again: the same answer will not go twice."
            : "The connection dropped. Press Send again: the same answer will not go twice.",
      });
    }
    clearTimeout(timer);
    setBusy(false);
  };

  const setDone = async (done: boolean) => {
    try {
      const res = await fetch("/api/admin/email/replies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: e.id, done }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok) router.refresh();
      else setMsg({ ok: false, text: out.error ?? "Could not change it." });
    } catch {
      setMsg({ ok: false, text: "No connection. Try again." });
    }
  };

  // Before #39 runs, or a reply marked by hand: only the first lines exist.
  const legacy = !thread.some((m) => m.direction === "in") && e.replied_at;

  return (
    <div className="mt-2 space-y-2">
      {waiting && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-verdict-yellow/25 px-3 py-1 text-xs font-bold text-ink">
          <MessageCircleReply className="h-3.5 w-3.5" aria-hidden />
          They replied. Waiting for your answer.
        </p>
      )}

      {legacy && (
        <div className="rounded-xl bg-leaf/10 px-3 py-2 text-xs text-ink ring-1 ring-inset ring-leaf/20">
          <p className="font-bold text-leaf-deep">
            Replied {when(e.replied_at as string)}
            {e.reply_from ? ` by ${e.reply_from}` : ""}.
          </p>
          {e.reply_snippet && <p className="mt-1 text-ink-soft">&ldquo;{e.reply_snippet}&rdquo;</p>}
        </div>
      )}

      {thread.length > 0 && (
        <ol className="space-y-2">
          {thread.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl px-3 py-2 text-sm ${m.direction === "in" ? "bg-leaf/10 ring-1 ring-inset ring-leaf/20" : "ml-6 bg-brand/[0.06] ring-1 ring-inset ring-brand/15"}`}
            >
              <p className="text-xs font-bold text-ink">
                {m.direction === "in" ? (m.from_name ? `${m.from_name} (${m.from_email})` : m.from_email) : `You, from ${m.from_email}`}
                <span className="font-normal text-ink-soft"> · {when(m.at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-ink">{m.body_text}</p>
            </li>
          ))}
        </ol>
      )}

      {threadReady && !open && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Reply: ${e.subject} to ${e.to_name}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${waiting ? "bg-leaf text-white hover:bg-leaf-deep" : "text-brand ring-1 ring-line hover:bg-mist"}`}
          >
            <CornerUpLeft className="h-3.5 w-3.5" aria-hidden />
            Reply
          </button>
          {waiting ? (
            <button
              type="button"
              onClick={() => setDone(true)}
              aria-label={`No answer needed: ${e.subject} to ${e.to_name}`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-ink-soft ring-1 ring-line hover:bg-mist"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              No answer needed
            </button>
          ) : (
            e.done_at &&
            thread.length > 0 && (
              <button
                type="button"
                onClick={() => setDone(false)}
                aria-label={`Show as waiting again: ${e.subject} to ${e.to_name}`}
                className="text-xs font-semibold text-ink-soft underline"
              >
                Show as waiting again
              </button>
            )
          )}
        </div>
      )}

      {open && (
        <div className="space-y-3 rounded-xl border border-line bg-white p-3">
          <p className="text-xs text-ink-soft">
            Answer to <span className="font-semibold text-ink">{to}</span>, from <span className="font-semibold text-ink">{e.from_email}</span>. It goes in the
            same conversation, under your first email.
          </p>
          <RichEditor
            resetKey={resetKey}
            initialHtml=""
            onChange={(h, isEmpty) => {
              setHtml(h);
              setEmpty(isEmpty);
            }}
          />
          <input ref={picker} type="file" multiple className="hidden" onChange={(ev) => addFiles(ev.target.files)} aria-label="Choose files for the answer" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => picker.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-mist"
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              Attach files
            </button>
            {files.map((f, i) => (
              <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-xs text-ink">
                {f.name} · {mb(f.size)}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {fileError && <p className="text-xs font-semibold text-verdict-red">{fileError}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={send}
              disabled={busy || empty || !!fileError}
              className="inline-flex items-center gap-1.5 rounded-full bg-leaf px-4 py-2 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden />
              {busy ? "Sending..." : "Send answer"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm font-bold text-ink ring-1 ring-line hover:bg-mist"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {msg && <p className={`text-xs font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}
      {popup && <SentPopup text={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}
