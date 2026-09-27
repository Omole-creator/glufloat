/**
 * Shapes shared by the recordings screens and their API routes. No server
 * imports here, so client components can use them.
 */
export type CallStatus = "waiting" | "live" | "ended";
export type Speaker = "glufloat" | "customer";

export interface CallSession {
  id: string;
  token: string;
  customer_name: string;
  purpose: string;
  status: CallStatus;
  consent_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  audio_bytes: number;
  audio_deleted_at: string | null;
  created_at: string;
}

export interface CallLine {
  id: number;
  session_id: string;
  speaker: Speaker;
  text: string;
  t_ms: number;
  edited: boolean;
}

export interface AudioPart {
  seq: number;
  /** A new segment starts each time the recorder restarts (a reload, say).
   *  Pieces play back as one file only within a segment. */
  segment: number;
  url: string;
  bytes: number;
  mime: string;
}

/** "3:07" or "1:02:45". */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function callLength(s: Pick<CallSession, "started_at" | "ended_at">): number | null {
  if (!s.started_at || !s.ended_at) return null;
  return new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
}

export function speakerName(speaker: Speaker, customerName: string): string {
  return speaker === "glufloat" ? "GluFloat" : customerName || "Customer";
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
