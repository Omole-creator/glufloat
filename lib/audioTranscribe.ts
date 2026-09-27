"use client";

/**
 * Writes down a recorded voice AFTER the call, free, on this device.
 *
 * It runs OpenAI's open Whisper model inside the browser (transformers.js).
 * No API key, no per-minute charge, and the audio never leaves this device to
 * be transcribed. The model (about 80MB) downloads once from Hugging Face and
 * is then kept by the browser.
 *
 * It is used for the customer's voice only, when their phone could not write
 * their words down live (an iPhone, say). That recording holds their voice
 * alone, so every line it produces is theirs.
 *
 * It is slow on a phone: roughly as long as the recording, or longer, on an
 * older one. A laptop with Chrome is much faster.
 */

export interface TimedText {
  /** Milliseconds from the start of the recording piece. */
  startMs: number;
  text: string;
}

type Progress = (stage: "model" | "decode" | "transcribe", pct: number | null, detail?: string) => void;

const MODEL = "onnx-community/whisper-base.en";

// Whisper's filler for silence or music; not words anybody said.
const NOISE = /^\s*[\[(].*[\])]\s*$|^\s*(you|thank you\.?)\s*$/i;

/** Decode an audio file into the 16kHz mono samples Whisper reads. */
async function toSamples(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (buf.numberOfChannels === 1) return buf.getChannelData(0);
    const out = new Float32Array(buf.length);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < ch.length; i++) out[i] += ch[i] / buf.numberOfChannels;
    }
    return out;
  } finally {
    void ctx.close();
  }
}

/** How long the model download may go with no new bytes before it is stuck. */
const STALL_MS = 60_000;
/**
 * Once the model files are in, the tool fetches its own engine (about 20MB)
 * and reports no progress while it does. On slow mobile data that alone can
 * take minutes, so it gets a much longer allowance before it counts as stuck.
 */
const ENGINE_MS = 5 * 60_000;

export async function transcribeAudio(blob: Blob, onProgress: Progress): Promise<TimedText[]> {
  onProgress("model", 0, "Starting");
  const { pipeline } = await import("@huggingface/transformers");

  // The model is several files downloading at once, each reporting its own
  // progress. Add them up (in MB) so the bar only ever moves forward, and
  // note when the last new bytes arrived, so a stuck download can be told
  // apart from a slow one.
  const files = new Map<string, { loaded: number; total: number }>();
  let shown = 0;
  let lastBytesAt = Date.now();
  let filesDone = false;
  const mb = (n: number) => (n / (1024 * 1024)).toFixed(0);
  const progress_callback = (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
    lastBytesAt = Date.now();
    if (p.status !== "progress" || !p.file || !p.total) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    shown = Math.max(shown, Math.floor((loaded / total) * 100));
    filesDone = loaded >= total;
    onProgress("model", shown, `${mb(loaded)} of ${mb(total)} MB`);
  };

  // ALWAYS the ordinary processor (wasm). The graphics-chip path (WebGPU)
  // hung for ever on the founder's Android phone AND laptop, on mobile data
  // and Wi-Fi alike, while the processor path worked on the live site. It is
  // slower, but it finishes. Do not bring WebGPU back without testing it on
  // a real phone that has a graphics chip.
  const loading = pipeline("automatic-speech-recognition", MODEL, {
    device: "wasm",
    dtype: "q8",
    progress_callback,
  });
  let watchdog: ReturnType<typeof setInterval> | undefined;
  const stalled = new Promise<never>((_, reject) => {
    watchdog = setInterval(() => {
      if (Date.now() - lastBytesAt > (filesDone ? ENGINE_MS : STALL_MS)) {
        reject(new Error("The download stopped. Check your internet and tap the button again."));
      }
    }, 5000);
  });
  let asr;
  try {
    asr = await Promise.race([loading, stalled]);
  } finally {
    clearInterval(watchdog);
  }

  onProgress("decode", null);
  const samples = await toSamples(blob);

  // Whisper reads 30 seconds at a time. Going window by window (with a small
  // overlap) lets the progress bar move and keeps memory flat on a phone.
  const RATE = 16000;
  const WINDOW = 30 * RATE;
  const out: TimedText[] = [];
  for (let start = 0; start < samples.length; start += WINDOW) {
    onProgress("transcribe", Math.round((start / samples.length) * 100));
    const slice = samples.subarray(start, Math.min(samples.length, start + WINDOW));
    if (slice.length < RATE / 2) break;
    const res = (await asr(slice, { return_timestamps: true })) as {
      text: string;
      chunks?: { timestamp: [number, number | null]; text: string }[];
    };
    const chunks = res.chunks?.length ? res.chunks : [{ timestamp: [0, null] as [number, number | null], text: res.text }];
    for (const ch of chunks) {
      const text = ch.text.trim();
      if (!text || NOISE.test(text)) continue;
      out.push({ startMs: Math.round((start / RATE + (ch.timestamp[0] ?? 0)) * 1000), text });
    }
  }
  onProgress("transcribe", 100);
  await asr.dispose?.();
  return out;
}
