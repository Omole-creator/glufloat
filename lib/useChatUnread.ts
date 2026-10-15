"use client";

import { useEffect, useState } from "react";

/** Fired by the open chat once the patient has seen the newest message. */
export const CHAT_READ = "gf:chat-read";

/** How often the red dot looks for a reply while the app is open. */
const PEEK_MS = 60_000;

/**
 * Is there a reply in the patient's chat they have not opened yet? Drives the
 * red dot on the Chat tab. One small request when the app opens, then once a
 * minute and whenever the app comes back to the front. `enabled` is false for
 * anyone without a chat, so they never ask.
 */
export function useChatUnread(enabled: boolean): boolean {
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const peek = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/chat?peek=1", { cache: "no-store", credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { unread?: boolean } | null) => alive && setUnread(!!j?.unread))
        .catch(() => {});
    };
    const read = () => setUnread(false);
    peek();
    const t = window.setInterval(peek, PEEK_MS);
    document.addEventListener("visibilitychange", peek);
    window.addEventListener(CHAT_READ, read);
    return () => {
      alive = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", peek);
      window.removeEventListener(CHAT_READ, read);
    };
  }, [enabled]);
  return unread;
}
