import crypto from "crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "./adminAuth";
import { createAdminClient } from "./supabase/server";
import type { CallSession } from "./recordingTypes";

/** Server-only helpers for the recordings tool. */

export const AUDIO_BUCKET = "call-audio";

/**
 * Supabase's free plan gives 1GB of FILE storage (separate from the 500MB
 * database). Audio is kept under this ceiling by deleting the OLDEST calls'
 * audio first; their transcripts are never touched.
 */
export const AUDIO_CAP_BYTES = 800 * 1024 * 1024;
export const AUDIO_TARGET_BYTES = 700 * 1024 * 1024;

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
}

/**
 * The relay (TURN) servers, from SERVER-ONLY env vars. They are handed to a
 * browser only inside a call: to the admin, or to someone holding a live call
 * link. Never bundled into the site's public JavaScript, where anyone could
 * copy them and use up the free monthly relay allowance.
 */
export function turnServers(): { urls: string[]; username: string; credential: string }[] {
  const urls = (process.env.TURN_URLS ?? "").split(",").map((u) => u.trim()).filter(Boolean);
  const username = process.env.TURN_USERNAME ?? "";
  const credential = process.env.TURN_CREDENTIAL ?? "";
  if (!urls.length || !username || !credential) return [];
  return [{ urls, username, credential }];
}

/**
 * The link's last part, in the founder's chosen shape: the customer's name,
 * then one number and one letter, e.g. "ada-okafor-7k".
 *
 * That short ending gives only 260 links per name, so it is NOT the privacy
 * on its own: a link also stops working once its call has ended, and after
 * LINK_DAYS if nobody ever joined (see linkUsable). The link never changes
 * when the name is edited, because it is already in the customer's WhatsApp.
 */
export function newToken(name: string): string {
  const slug =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/g, "") || "customer";
  const [d, l] = crypto.randomBytes(2);
  const digit = String(d % 10);
  const letter = "abcdefghijklmnopqrstuvwxyz"[l % 26];
  return `${slug}-${digit}${letter}`;
}

/** An unused link stops working after this many days. */
export const LINK_DAYS = 7;

/**
 * Whether a customer may still use this link: the call has not ended, and
 * either they already agreed (a call in progress, or a reload) or the link is
 * less than LINK_DAYS old.
 */
export function linkUsable(s: Pick<CallSession, "status" | "consent_at" | "created_at">): boolean {
  if (s.status === "ended") return false;
  if (s.consent_at) return true;
  return Date.now() - new Date(s.created_at).getTime() < LINK_DAYS * 24 * 60 * 60 * 1000;
}

export async function sessionByToken(token: string): Promise<CallSession | null> {
  if (!token || token.length > 64) return null;
  const { data } = await createAdminClient()
    .from("call_sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return (data as CallSession | null) ?? null;
}

/** Milliseconds since the call started, the same clock for both phones. */
export function msSinceStart(s: Pick<CallSession, "started_at">): number {
  if (!s.started_at) return 0;
  return Math.max(0, Date.now() - new Date(s.started_at).getTime());
}

/** Remove every audio piece of one call, and mark it removed. */
export async function deleteAudio(sessionId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: parts } = await admin
    .from("call_audio_parts")
    .select("path")
    .eq("session_id", sessionId);
  const paths = (parts ?? []).map((p) => p.path as string);
  for (let i = 0; i < paths.length; i += 100) {
    await admin.storage.from(AUDIO_BUCKET).remove(paths.slice(i, i + 100));
  }
  await admin.from("call_audio_parts").delete().eq("session_id", sessionId);
  await admin
    .from("call_sessions")
    .update({ audio_bytes: 0, audio_deleted_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Keep the audio under the free storage ceiling. When the total passes
 * AUDIO_CAP_BYTES, the oldest calls lose their audio (never the call in
 * progress) until it is back under AUDIO_TARGET_BYTES.
 */
export async function enforceAudioCap(currentSessionId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("call_sessions")
    .select("id,audio_bytes,created_at")
    .gt("audio_bytes", 0)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as { id: string; audio_bytes: number }[];
  let total = rows.reduce((n, r) => n + Number(r.audio_bytes), 0);
  if (total <= AUDIO_CAP_BYTES) return;
  for (const r of rows) {
    if (total <= AUDIO_TARGET_BYTES) break;
    if (r.id === currentSessionId) continue;
    await deleteAudio(r.id);
    total -= Number(r.audio_bytes);
  }
}
