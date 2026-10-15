"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessagesSquare, SendHorizontal } from "lucide-react";
import { CHAT_MAX, ROLE_WORD, clockLabel, dayLabel, watDay, type ChatMessage } from "@/lib/chat";

/** How often an open chat looks for new messages. Only while it is on screen. */
const POLL_MS = 5000;

type Loaded = { messages?: ChatMessage[]; canSend?: boolean; waiting?: boolean; ready?: boolean; error?: string };

/**
 * The conversation itself, shared by the patient's Chat tab, the hospital
 * patient page and the Premium dietitian's inbox. Text only (founder,
 * 2026-10-15). It asks the server for newer messages every few seconds while
 * it is visible, and not at all when it is hidden, so an idle tab costs
 * nothing.
 *
 * `viewer` decides the sides: a patient's own messages sit on the right; on
 * the care team's screens every team message sits on the right, with who
 * wrote it.
 */
export default function ChatWindow({
  getUrl,
  postUrl,
  postBody,
  viewer,
  active = true,
  canSend: canSendProp,
  emptyTitle,
  emptyText,
  placeholder = "Type your message",
  heightClass = "h-[min(58vh,520px)]",
  onData,
  seed,
  className = "",
  suggestions = [],
}: {
  getUrl: (after: number) => string;
  postUrl: string;
  postBody: (extra: Record<string, unknown>) => Record<string, unknown>;
  viewer: "patient" | "staff";
  /** False while the tab holding it is hidden: no polling then. */
  active?: boolean;
  canSend?: boolean;
  emptyTitle: string;
  emptyText: string;
  placeholder?: string;
  heightClass?: string;
  onData?: (d: Loaded) => void;
  /** Text to add to the message box (n changes each time it is pressed). */
  seed?: { text: string; n: number } | null;
  /** Classes on the outer box (e.g. "flex-1" to fill a full-height card). */
  className?: string;
  /** Tap-to-fill starters, shown while the chat is empty. */
  suggestions?: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [canSend, setCanSend] = useState<boolean>(canSendProp ?? true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const lastId = useRef(0);
  // Bumped by every send: a poll that started before a send finished may
  // answer with the old state ("waiting"), so its onData is dropped.
  const sends = useRef(0);
  const stick = useRef(true);
  // The callers pass fresh functions on every render; reading them through
  // refs keeps the polling loop from restarting (and refetching) each time.
  const onDataRef = useRef(onData);
  const getUrlRef = useRef(getUrl);
  const postBodyRef = useRef(postBody);
  useEffect(() => {
    onDataRef.current = onData;
    getUrlRef.current = getUrl;
    postBodyRef.current = postBody;
  });

  const merge = useCallback((incoming: ChatMessage[], replace = false) => {
    setMessages((prev) => {
      const base = replace || !prev ? [] : prev;
      const seen = new Set(base.map((m) => m.id));
      const next = [...base, ...incoming.filter((m) => !seen.has(m.id))];
      lastId.current = next.reduce((n, m) => Math.max(n, m.id), lastId.current);
      return next;
    });
  }, []);

  const load = useCallback(
    async (after: number) => {
      const seq = sends.current;
      try {
        const res = await fetch(getUrlRef.current(after), { cache: "no-store", credentials: "same-origin" });
        const j = (await res.json().catch(() => ({}))) as Loaded;
        if (!res.ok) {
          if (after === 0) {
            setErr(j.error ?? "We could not open this chat. Please try again.");
            setMessages((m) => m ?? []);
          }
          return;
        }
        if (typeof j.canSend === "boolean" && canSendProp === undefined) setCanSend(j.canSend);
        merge(j.messages ?? [], after === 0);
        if (seq === sends.current) onDataRef.current?.(j);
      } catch {
        if (after === 0) {
          setErr("We could not open this chat. Check your connection.");
          setMessages((m) => m ?? []);
        }
      }
    },
    [merge, canSendProp],
  );

  // First load, then poll for newer messages while the chat is on screen.
  useEffect(() => {
    if (!active) return;
    void load(lastId.current);
    const tick = () => {
      if (document.visibilityState === "visible") void load(lastId.current);
    };
    const t = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, load]);

  // Keep the newest message in view, unless they scrolled up to read.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (seed?.text) setText((t) => (t.trim() ? `${t.trim()}\n\n${seed.text}` : seed.text));
  }, [seed?.n, seed?.text]);

  // The box grows with the message, up to about five lines.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr("");
    stick.current = true;
    try {
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBodyRef.current({ text: body, after: lastId.current })),
      });
      const j = (await res.json().catch(() => ({}))) as Loaded;
      if (!res.ok) {
        setErr(j.error ?? "This did not send. Please try again.");
      } else {
        setText("");
        sends.current += 1;
        merge(j.messages ?? []);
        onDataRef.current?.(j);
      }
    } catch {
      setErr("This did not send. Check your connection and try again.");
    }
    setSending(false);
  };

  // Group the messages under a line for each day.
  const days: { day: string; items: ChatMessage[] }[] = [];
  for (const m of messages ?? []) {
    const d = watDay(m.createdAt);
    if (days.length === 0 || days[days.length - 1].day !== d) days.push({ day: d, items: [] });
    days[days.length - 1].items.push(m);
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className={`${heightClass} overflow-y-auto bg-[#eef3f8] px-3 py-4 sm:px-5`}
        aria-live="polite"
        aria-label="Messages"
      >
        {messages === null ? (
          <div className="flex h-full items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand/25 border-t-brand" aria-label="Loading" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand shadow-sm ring-1 ring-brand/10">
              <MessagesSquare className="h-7 w-7" strokeWidth={2} />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-ink">{emptyTitle}</p>
            <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-soft">{emptyText}</p>
            {canSend && suggestions.length > 0 && (
              <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setText(s);
                      boxRef.current?.focus();
                    }}
                    className="rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-ink shadow-sm ring-1 ring-brand/10 transition-colors hover:ring-brand/40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {days.map((g) => (
              <div key={g.day} className="space-y-1.5">
                <p className="flex justify-center pb-1">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-ink-soft shadow-sm">{dayLabel(g.day)}</span>
                </p>
                {g.items.map((m, i) => {
                  const prev = g.items[i - 1];
                  const next = g.items[i + 1];
                  const sameAsPrev = !!prev && prev.senderName === m.senderName && prev.mine === m.mine;
                  const sameAsNext = !!next && next.senderName === m.senderName && next.mine === m.mine;
                  // A name only above other people's messages (several people answer
                  // a care-team chat), never "You" above your own.
                  const showName = !sameAsPrev && m.senderName !== "You" && !(viewer === "patient" && m.mine);
                  const role = m.senderRole !== "patient" ? ROLE_WORD[m.senderRole] : null;
                  return (
                    <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"} ${sameAsPrev ? "" : "pt-1.5"}`}>
                      <div className="max-w-[82%] sm:max-w-[70%]">
                        {showName && (
                          <p className={`mb-1 px-2 text-[11px] font-bold text-brand ${m.mine ? "text-right" : ""}`}>
                            {m.senderName}
                            {role && <span className="font-semibold text-ink-soft">, {role}</span>}
                          </p>
                        )}
                        <div
                          className={`flow-root whitespace-pre-wrap break-words px-3.5 pb-1.5 pt-2 text-[15px] leading-relaxed ${
                            m.mine
                              ? `rounded-2xl bg-brand text-white shadow-[0_6px_16px_-10px_rgba(27,95,170,0.8)] ${sameAsNext ? "" : "rounded-br-md"}`
                              : `rounded-2xl bg-white text-ink shadow-sm ${sameAsNext ? "" : "rounded-bl-md"}`
                          }`}
                        >
                          {m.body}
                          <span className={`float-right ml-3 mt-1.5 text-[10px] font-semibold leading-none ${m.mine ? "text-white/70" : "text-ink-soft/70"}`}>
                            {clockLabel(m.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {canSend ? (
        <div className="border-t border-ink/[0.06] bg-white px-3 py-3 sm:px-4">
          {err && <p className="mb-2 px-1 text-sm font-semibold text-verdict-red">{err}</p>}
          <div className="relative">
            <textarea
              ref={boxRef}
              value={text}
              rows={1}
              maxLength={CHAT_MAX}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends on a computer; on a phone the button does.
                if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={placeholder}
              aria-label="Your message"
              className="chat-input block min-h-[52px] w-full resize-none rounded-[26px] border-2 border-line bg-[#f7f9fc] py-3.5 pl-4 pr-14 text-base leading-snug text-ink outline-none transition-colors focus:border-brand focus:bg-white"
            />
            {/* A blinking cursor while the box is empty and untapped, so it reads as "type here" (globals.css). */}
            <span aria-hidden className="chat-caret" />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              aria-label="Send message"
              className="absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-leaf text-white transition-colors hover:bg-leaf-deep disabled:bg-ink/15"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={2.4} />
              )}
            </button>
          </div>
          {text.length > CHAT_MAX - 200 && (
            <p className="mt-1 text-right text-xs text-ink-soft">
              {text.length} / {CHAT_MAX}
            </p>
          )}
        </div>
      ) : (
        err && <p className="border-t border-ink/[0.06] bg-white px-4 py-3 text-sm font-semibold text-verdict-red">{err}</p>
      )}
    </div>
  );
}
