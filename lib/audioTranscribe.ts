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

type Progress = (stage: "model" | "decode" | "transcribe", pct: number | null) => void;

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

export async function transcribeAudio(blob: Blob, onProgress: Progress): Promise<TimedText[]> {
  onProgress("model", 0);
  const { pipeline } = await import("@huggingface/transformers");
  // The model is several files downloading at once, each reporting its own
  // progress. Add them up so the bar only ever moves forward.
  const files = new Map<string, { loaded: number; total: number }>();
  let shown = 0;
  const progress_callback = (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file || !p.total) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    shown = Math.max(shown, Math.floor((loaded / total) * 100));
    onProgress("model", shown);
  };
  // The graphics chip is much faster where it works; the ordinary processor
  // works everywhere. A browser can SAY it has one (navigator.gpu) and still
  // hand back no usable chip, so ask for a real adapter before choosing it,
  // and if the chip still fails on the first real run, redo it on the
  // processor.
  const load = (device: "webgpu" | "wasm") =>
    pipeline("automatic-speech-recognition", MODEL, {
      device,
      dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
      progress_callback,
    });
  let useGpu = false;
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
    useGpu = !!(await nav.gpu?.requestAdapter());
  } catch {
    useGpu = false;
  }
  let asr = useGpu ? await load("webgpu").catch(() => null) : null;
  if (!asr) {
    useGpu = false;
    asr = await load("wasm");
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
    let raw;
    try {
      raw = await asr(slice, { return_timestamps: true });
    } catch (e) {
      if (!useGpu) throw e;
      // The chip gave out; carry on with the processor from this window.
      useGpu = false;
      await asr.dispose?.();
      asr = await load("wasm");
      raw = await asr(slice, { return_timestamps: true });
    }
    const res = raw as {
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
