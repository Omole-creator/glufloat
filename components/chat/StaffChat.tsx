"use client";

import { useState } from "react";
import { CheckCheck, MessageCircle } from "lucide-react";
import ChatWindow from "./ChatWindow";
import ChatAlertsOptIn from "./ChatAlertsOptIn";

/**
 * A patient's chat as their care team sees it: on a hospital patient's page,
 * and in a Premium dietitian's inbox. Every doctor and dietitian at the
 * hospital reads and answers the same chat; each message shows who wrote it.
 * "No reply needed" takes the patient off the waiting list without a message
 * (for a "thank you").
 */
export default function StaffChat({
  firstName,
  apiUrl,
  ids,
  canSend,
  note,
}: {
  firstName: string;
  /** /api/hospital/chat or /api/inbox/chat */
  apiUrl: string;
  /** What identifies the chat to that route: { id, hid } or { thread }. */
  ids: Record<string, string | null>;
  canSend: boolean;
  /** One line under the title. */
  note: string;
}) {
  const [waiting, setWaiting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const qs = new URLSearchParams(Object.entries(ids).filter((e): e is [string, string] => !!e[1])).toString();

  const clear = async () => {
    setClearing(true);
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ids, action: "clear" }),
    }).catch(() => null);
    setClearing(false);
    if (res?.ok) setWaiting(false);
  };

  return (
    <section id="chat" className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#e3e9f1] bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#eef2f7] px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <MessageCircle className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-ink">Chat with {firstName}</h2>
          <p className="text-xs text-ink-soft">{note}</p>
        </div>
        {waiting && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-verdict-red px-2.5 py-1 text-[11px] font-bold text-white">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
              Waiting for a reply
            </span>
            {canSend && (
              <button
                type="button"
                onClick={() => void clear()}
                disabled={clearing}
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-bold text-ink-soft hover:border-ink/40 hover:text-ink disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" /> No reply needed
              </button>
            )}
          </div>
        )}
      </div>
      <ChatWindow
        viewer="staff"
        canSend={canSend}
        getUrl={(after) => `${apiUrl}?${qs}&after=${after}`}
        postUrl={apiUrl}
        postBody={(extra) => ({ ...ids, ...extra })}
        emptyTitle={`No messages with ${firstName} yet`}
        emptyText={canSend ? `Write to ${firstName} here. They get a phone alert if they turned alerts on.` : `${firstName} has not written yet.`}
        placeholder={`Write to ${firstName}`}
        heightClass="h-[min(60vh,480px)]"
        onData={(d) => typeof d.waiting === "boolean" && setWaiting(d.waiting)}
      />
      {canSend && <ChatAlertsOptIn text="Get a phone alert when a patient writes to you." wrapClassName="border-t border-[#eef2f7] p-4" />}
    </section>
  );
}
