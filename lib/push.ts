"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Turning on a meal-time reminder for THIS device. The subscription (an address
 * the browser gives us, plus two keys) is written straight to Supabase under the
 * person's own row, exactly like a meal check. The send route later reads them
 * with the service-role key and posts the reminder.
 *
 * Everything here is best-effort and guarded: a phone that cannot do push (older
 * Android, an iPhone not added to the home screen) just gets `false` back, and
 * the in-app greeting still carries the ritual.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/** True only when a VAPID public key is set, so the opt-in can hide otherwise. */
export function pushConfigured(): boolean {
  return !!PUBLIC_KEY;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Where this device stands: has it already said yes, no, or not been asked. */
export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

/** VAPID public key (base64url) to the byte array the Push API wants. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "not-configured" | "denied" | "error" };

/** Ask for permission, register the worker, and store the subscription. */
export async function enablePush(): Promise<EnableResult> {
  try {
    if (!pushSupported()) return { ok: false, reason: "unsupported" };
    if (!PUBLIC_KEY) return { ok: false, reason: "not-configured" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast: the Push API wants a BufferSource; TS types our typed array as a
      // generic Uint8Array<ArrayBufferLike> which it will not narrow on its own.
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) as BufferSource,
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: "error" };
    }

    const supabase = createClient();
    // ignoreDuplicates so a device that re-subscribes does not need an update
    // policy: the same endpoint simply stays as it is.
    await supabase.from("push_subscriptions").upsert(
      {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint", ignoreDuplicates: true },
    );

    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
