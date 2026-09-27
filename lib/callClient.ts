"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * The browser side of a recorded customer call. Both phones run this.
 *
 * - The CALL is browser to browser (WebRTC). Nothing carries the voice except
 *   the two phones and, only when a network blocks a direct link, a relay
 *   (TURN) server. Supabase Realtime only passes the short "here I am" /
 *   "here is how to reach me" notes that set the call up.
 * - The TRANSCRIPT is written on each phone, from that phone's own microphone,
 *   by the speech recognition built into Chrome. So every line already knows
 *   who said it: the GluFloat phone only ever hears GluFloat's speaker, the
 *   customer's phone only ever hears the customer.
 * - The AUDIO is recorded on the GluFloat phone only, both voices mixed, and
 *   sent up in 30-second pieces as the call goes on.
 */

export type Role = "admin" | "customer";

/** STUN is free and public. TURN (a relay) is optional and set by env. */
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const urls = process.env.NEXT_PUBLIC_TURN_URLS;
  if (urls) {
    servers.push({
      urls: urls.split(",").map((u) => u.trim()).filter(Boolean),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

type Signal =
  | { type: "hello"; from: Role }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: Role; candidate: RTCIceCandidateInit }
  | { type: "bye"; from: Role }
  | { type: "line"; text: string }
  | { type: "stt"; available: boolean };

export interface CallEvents {
  onState?: (s: "waiting" | "connecting" | "connected" | "reconnecting" | "ended") => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onPeerLine?: (text: string) => void;
  onPeerTranscriber?: (available: boolean) => void;
  onBye?: () => void;
}

export class CallPeer {
  private channel: RealtimeChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private queuedIce: RTCIceCandidateInit[] = [];
  private ended = false;

  constructor(
    private token: string,
    private role: Role,
    private local: MediaStream,
    private ev: CallEvents,
  ) {}

  async join(): Promise<void> {
    const supabase = createClient();
    this.channel = supabase.channel(`gfcall-${this.token}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      void this.handle(payload as Signal);
    });
    await new Promise<void>((resolve) => {
      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });
    this.ev.onState?.("waiting");
    this.send({ type: "hello", from: this.role });
  }

  send(msg: Signal): void {
    void this.channel?.send({ type: "broadcast", event: "signal", payload: msg });
  }

  private newPeer(): RTCPeerConnection {
    this.pc?.close();
    this.queuedIce = [];
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    for (const t of this.local.getTracks()) pc.addTrack(t, this.local);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ type: "ice", from: this.role, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      this.ev.onRemoteStream?.(stream);
    };
    pc.onconnectionstatechange = () => {
      if (this.ended) return;
      const s = pc.connectionState;
      if (s === "connected") this.ev.onState?.("connected");
      else if (s === "connecting" || s === "new") this.ev.onState?.("connecting");
      else if (s === "disconnected" || s === "failed") {
        this.ev.onState?.("reconnecting");
        // The GluFloat phone leads the reconnect: a fresh offer, which the
        // customer's phone answers exactly as it did the first time.
        if (this.role === "admin" && s === "failed") void this.makeOffer();
      }
    };
    this.pc = pc;
    return pc;
  }

  private async makeOffer(): Promise<void> {
    const pc = this.newPeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.send({ type: "offer", sdp: offer });
  }

  private async handle(msg: Signal): Promise<void> {
    if (this.ended) return;
    switch (msg.type) {
      case "hello":
        if (msg.from === this.role) return;
        this.ev.onState?.("connecting");
        // The GluFloat phone always makes the offer; the customer's phone
        // only says hello back, so neither ever waits on the other.
        if (this.role === "admin") await this.makeOffer();
        else this.send({ type: "hello", from: this.role });
        return;
      case "offer": {
        if (this.role !== "customer") return;
        const pc = this.newPeer();
        await pc.setRemoteDescription(msg.sdp);
        for (const c of this.queuedIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send({ type: "answer", sdp: answer });
        return;
      }
      case "answer":
        if (this.role !== "admin" || !this.pc) return;
        await this.pc.setRemoteDescription(msg.sdp).catch(() => {});
        for (const c of this.queuedIce.splice(0)) await this.pc.addIceCandidate(c).catch(() => {});
        return;
      case "ice":
        if (msg.from === this.role) return;
        if (this.pc?.remoteDescription) await this.pc.addIceCandidate(msg.candidate).catch(() => {});
        else this.queuedIce.push(msg.candidate);
        return;
      case "bye":
        if (msg.from === this.role) return;
        this.ev.onBye?.();
        return;
      case "line":
        this.ev.onPeerLine?.(msg.text);
        return;
      case "stt":
        this.ev.onPeerTranscriber?.(msg.available);
        return;
    }
  }

  /** Mute this phone's microphone for the call (and so for the recording). */
  setMuted(on: boolean): void {
    for (const t of this.local.getAudioTracks()) t.enabled = !on;
  }

  hangUp(): void {
    if (this.ended) return;
    this.send({ type: "bye", from: this.role });
    this.close();
  }

  close(): void {
    this.ended = true;
    this.ev.onState?.("ended");
    this.pc?.close();
    this.pc = null;
    for (const t of this.local.getTracks()) t.stop();
    const ch = this.channel;
    this.channel = null;
    if (ch) setTimeout(() => void createClient().removeChannel(ch), 500);
  }
}

// ---------------------------------------------------------------------------
// Live transcription from THIS phone's microphone.
// ---------------------------------------------------------------------------

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function transcriptionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Keeps Chrome's speech recognition running for as long as the call lasts.
 * The browser stops it on its own after a silence or about a minute, so it is
 * restarted every time it ends, which is what makes a call of any length work.
 */
export class LiveTranscriber {
  private rec: SR | null = null;
  private running = false;
  private failures = 0;

  constructor(
    private onFinal: (text: string) => void,
    private onInterim: (text: string) => void,
    private onAvailable: (ok: boolean) => void,
  ) {}

  start(): void {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      this.onAvailable(false);
      return;
    }
    this.running = true;
    const rec = new Ctor();
    // Nigerian English. Chrome falls back to general English if it must.
    rec.lang = "en-NG";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      this.failures = 0;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0]?.transcript?.trim() ?? "";
        if (!text) continue;
        if (r.isFinal) this.onFinal(text);
        else interim += " " + text;
      }
      this.onInterim(interim.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        this.running = false;
        this.onAvailable(false);
      } else {
        this.failures += 1;
      }
    };
    rec.onend = () => {
      if (!this.running) return;
      // A run of errors in a row (no network, say) backs off instead of spinning.
      const wait = Math.min(5000, 250 * 2 ** Math.min(this.failures, 4));
      setTimeout(() => {
        if (!this.running) return;
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }, wait);
    };
    this.rec = rec;
    try {
      rec.start();
      this.onAvailable(true);
    } catch {
      this.onAvailable(false);
    }
  }

  stop(): void {
    this.running = false;
    try {
      this.rec?.abort();
    } catch {
      /* already stopped */
    }
    this.rec = null;
  }
}

// ---------------------------------------------------------------------------
// The recorder (GluFloat phone only): both voices, mixed, in 30-second pieces.
// ---------------------------------------------------------------------------

function pickMime(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  for (const m of options) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export class CallRecorder {
  private ctx: AudioContext;
  private dest: MediaStreamAudioDestinationNode;
  private remoteNode: MediaStreamAudioSourceNode | null = null;
  private rec: MediaRecorder | null = null;
  private seq = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    local: MediaStream,
    private upload: (seq: number, blob: Blob) => Promise<boolean>,
    private onSaved: (bytes: number) => void,
  ) {
    this.ctx = new AudioContext();
    this.dest = this.ctx.createMediaStreamDestination();
    this.ctx.createMediaStreamSource(local).connect(this.dest);
  }

  /** Called again after a reconnect, so the new remote voice is recorded too. */
  setRemote(stream: MediaStream): void {
    this.remoteNode?.disconnect();
    if (stream.getAudioTracks().length === 0) return;
    this.remoteNode = this.ctx.createMediaStreamSource(stream);
    this.remoteNode.connect(this.dest);
  }

  start(firstSeq: number): void {
    if (this.rec) return;
    this.seq = firstSeq;
    void this.ctx.resume();
    const mime = pickMime();
    const rec = new MediaRecorder(this.dest.stream, {
      ...(mime ? { mimeType: mime } : {}),
      audioBitsPerSecond: 16000, // clear speech at about 7MB an hour
    });
    rec.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return;
      const seq = this.seq++;
      const blob = e.data;
      this.queue = this.queue.then(async () => {
        for (let attempt = 0; attempt < 4; attempt++) {
          if (await this.upload(seq, blob)) {
            this.onSaved(blob.size);
            return;
          }
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      });
    };
    rec.start(30_000);
    this.rec = rec;
  }

  /** Stop, and wait until the last piece has been sent. */
  async stop(): Promise<void> {
    const rec = this.rec;
    this.rec = null;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.addEventListener("stop", () => resolve(), { once: true });
        rec.stop();
      });
    }
    await this.queue;
    void this.ctx.close();
  }
}

/** Keep the screen on during a call: a sleeping phone drops the call. */
export async function keepAwake(): Promise<() => void> {
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    const lock = await nav.wakeLock?.request("screen");
    return () => void lock?.release().catch(() => {});
  } catch {
    return () => {};
  }
}
