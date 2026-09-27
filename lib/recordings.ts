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

/** An unguessable link secret. The link is the only key a customer holds. */
export function newToken(): string {
  return crypto.randomBytes(18).toString("base64url");
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
