"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Mic,
  MicOff,
  Pencil,
  Phone,
  PhoneOff,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  CallPeer,
  CallRecorder,
  LiveTranscriber,
  keepAwake,
  transcriptionSupported,
} from "@/lib/callClient";
import {
  callLength,
  clock,
  sizeLabel,
  speakerName,
  type AudioPart,
  type CallLine,
  type CallSession,
  type Speaker,
} from "@/lib/recordingTypes";
import { buildTranscriptPdf, transcriptFileName } from "@/lib/recordingPdf";
import { callLink, whatsAppInvite } from "../RecordingsPanel";

type CallState = "idle" | "waiting" | "connecting" | "connected" | "reconnecting" | "ended";

const STATE_LINE: Record<CallState, string> = {
  idle: "",
  waiting: "Waiting for the customer to open the link and join.",
  connecting: "Connecting...",
  connected: "On the call. Recording and writing it down.",
  reconnecting: "The line dropped. Reconnecting...",
  ended: "The call has ended.",
};

/** "3:07" or "1:02:45" typed back into milliseconds. */
function parseClock(v: string): number | null {
  const parts = v.trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  return ((h * 60 + m) * 60 + s) * 1000;
}

/**
 * Chrome's recorder writes webm with no length in it, so the player shows no
 * total and cannot jump ahead. Asking it to seek to the far end makes it work
 * the length out; then it goes back to the start.
 */
function fixDuration(e: React.SyntheticEvent<HTMLAudioElement>) {
  const el = e.currentTarget;
  if (el.duration !== Infinity && !Number.isNaN(el.duration)) return;
  const back = () => {
    el.removeEventListener("timeupdate", back);
    el.currentTime = 0;
  };
  el.addEventListener("timeupdate", back);
  el.currentTime = 1e101;
}

export default function CallRoom({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<CallSession | null>(null);
  const [lines, setLines] = useState<CallLine[]>([]);
  const [audio, setAudio] = useState<AudioPart[]>([]);
  const [loadError, setLoadError] = useState("");

  const [state, setState] = useState<CallState>("idle");
  const [problem, setProblem] = useState("");
  const [muted, setMuted] = useState(false);
  const [interim, setInterim] = useState("");
  const [mySpeech, setMySpeech] = useState<boolean | null>(null);
  const [theirSpeech, setTheirSpeech] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [savedBytes, setSavedBytes] = useState(0);
  const [copied, setCopied] = useState(false);

  const peerRef = useRef<CallPeer | null>(null);
  const recRef = useRef<CallRecorder | null>(null);
  const sttRef = useRef<LiveTranscriber | null>(null);
  const releaseRef = useRef<() => void>(() => {});
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const endingRef = useRef(false);
  const tempId = useRef(-1);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/recordings/${id}`, { cache: "no-store" });
    if (!r.ok) {
      setLoadError(r.status === 404 ? "This call does not exist any more." : "Could not load this call.");
      return null;
    }
    const j = (await r.json()) as { session: CallSession; lines: CallLine[]; audio: AudioPart[] };
    setSession(j.session);
    setLines(j.lines);
    setAudio(j.audio);
    return j;
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // While on the call, keep the saved transcript in step (the customer's lines
  // arrive through the server too), and tick the clock.
  const live = state === "connected" || state === "reconnecting" || state === "connecting" || state === "waiting";
  useEffect(() => {
    if (!live) return;
    const sync = setInterval(() => void load(), 8000);
    const tick = setInterval(() => {
      setElapsed((e) => (session?.started_at ? Date.now() - new Date(session.started_at).getTime() : e));
    }, 1000);
    return () => {
      clearInterval(sync);
      clearInterval(tick);
    };
  }, [live, load, session?.started_at]);

  // Leaving the page mid-call must not leave the microphone on.
  useEffect(
    () => () => {
      sttRef.current?.stop();
      peerRef.current?.close();
      releaseRef.current();
    },
    [],
  );

  const addLocalLine = (speaker: Speaker, text: string) =>
    setLines((ls) => [
      ...ls,
      { id: tempId.current--, session_id: id, speaker, text, t_ms: Number.MAX_SAFE_INTEGER, edited: false },
    ]);

  const startTranscriber = () => {
    const stt = new LiveTranscriber(
      (text) => {
        addLocalLine("glufloat", text);
        void fetch(`/api/admin/recordings/${id}/lines`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, speaker: "glufloat" }),
        });
      },
      setInterim,
      setMySpeech,
    );
    stt.start();
    sttRef.current = stt;
  };

  async function finish() {
    if (endingRef.current) return;
    endingRef.current = true;
    sttRef.current?.stop();
    sttRef.current = null;
    setInterim("");
    peerRef.current?.hangUp();
    peerRef.current = null;
    await recRef.current?.stop();
    recRef.current = null;
    releaseRef.current();
    await fetch(`/api/admin/recordings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    setState("ended");
    await load();
    router.refresh();
  }

  async function start() {
    setProblem("");
    let local: MediaStream;
    try {
      local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setProblem("The phone did not allow the microphone. Allow it for this site and try again.");
      return;
    }
    releaseRef.current = await keepAwake();
    endingRef.current = false;

    // If Chrome's speech recognition takes the microphone away from the call
    // (some Android phones do), the call matters more: stop the live words.
    local.getAudioTracks()[0]?.addEventListener("mute", () => {
      if (sttRef.current) {
        sttRef.current.stop();
        sttRef.current = null;
        setMySpeech(false);
      }
    });

    // New recorder segment if audio was already saved (a reload mid-call).
    const nextSeq = audio.length ? Math.max(...audio.map((a) => a.seq)) + 1 : 0;
    const segment = audio.length ? Math.max(...audio.map((a) => a.segment)) + 1 : 0;
    const recorder = new CallRecorder(
      local,
      async (seq, blob) => {
        const r = await fetch(`/api/admin/recordings/${id}/audio?seq=${seq}&segment=${segment}`, {
          method: "POST",
          headers: { "content-type": blob.type || "audio/webm" },
          body: blob,
        }).catch(() => null);
        return !!r?.ok;
      },
      (bytes) => setSavedBytes((b) => b + bytes),
    );
    recRef.current = recorder;

    const peer = new CallPeer(session!.token, "admin", local, {
      onState: (s) => {
        if (s === "ended") return;
        setState(s);
        if (s === "connected" && !startedRef.current) {
          startedRef.current = true;
          void fetch(`/api/admin/recordings/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          }).then(() => load());
          recorder.start(nextSeq);
          if (transcriptionSupported()) startTranscriber();
          else setMySpeech(false);
        }
      },
      onRemoteStream: (stream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          void remoteAudioRef.current.play().catch(() => {});
        }
        recorder.setRemote(stream);
      },
      onPeerLine: (text) => addLocalLine("customer", text),
      onPeerTranscriber: setTheirSpeech,
      onBye: () => void finish(),
    });
    peerRef.current = peer;
    setState("waiting");
    await peer.join();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    // Muted means muted everywhere: the call, the recording, and the words.
    peerRef.current?.setMuted(next);
    if (next) {
      sttRef.current?.stop();
      sttRef.current = null;
      setInterim("");
    } else if (mySpeech !== false && transcriptionSupported()) {
      startTranscriber();
    }
  }

  // ---- editing ----------------------------------------------------------
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [lineText, setLineText] = useState("");
  const [lineSpeaker, setLineSpeaker] = useState<Speaker>("glufloat");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newSpeaker, setNewSpeaker] = useState<Speaker>("customer");
  const [newTime, setNewTime] = useState("0:00");
  const [editDetails, setEditDetails] = useState(false);
  const [dName, setDName] = useState("");
  const [dPurpose, setDPurpose] = useState("");
  const [audioUrls, setAudioUrls] = useState<{ segment: number; url: string; bytes: number; ext: string }[] | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);

  async function saveLine(l: CallLine) {
    const r = await fetch(`/api/admin/recordings/${id}/lines`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lineId: l.id, text: lineText, speaker: lineSpeaker }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? "That did not save.");
      return;
    }
    setEditingLine(null);
    await load();
  }

  async function deleteLine(l: CallLine) {
    if (!confirm("Delete this line?")) return;
    await fetch(`/api/admin/recordings/${id}/lines?lineId=${l.id}`, { method: "DELETE" });
    await load();
  }

  async function addLine() {
    const t = parseClock(newTime);
    if (t === null) {
      alert("Type the time like 3:07.");
      return;
    }
    const r = await fetch(`/api/admin/recordings/${id}/lines`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: newText, speaker: newSpeaker, t_ms: t, manual: true }),
    });
    if (!r.ok) return;
    setAdding(false);
    setNewText("");
    await load();
  }

  async function deleteTranscript() {
    if (!confirm("Delete the whole transcript of this call? The audio stays.")) return;
    await fetch(`/api/admin/recordings/${id}?what=transcript`, { method: "DELETE" });
    await load();
  }

  async function deleteAudioFiles() {
    if (!confirm("Delete the audio of this call? The transcript stays.")) return;
    await fetch(`/api/admin/recordings/${id}?what=audio`, { method: "DELETE" });
    audioUrls?.forEach((a) => URL.revokeObjectURL(a.url));
    setAudioUrls(null);
    await load();
    router.refresh();
  }

  async function saveDetails() {
    const r = await fetch(`/api/admin/recordings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer_name: dName, purpose: dPurpose }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? "That did not save.");
      return;
    }
    setEditDetails(false);
    await load();
  }

  async function deleteCall() {
    if (!confirm("Delete this whole call? The audio and the transcript are both removed for good.")) return;
    await fetch(`/api/admin/recordings/${id}?what=all`, { method: "DELETE" });
    router.push("/admin/recordings");
    router.refresh();
  }

  /** Join each segment's 30-second pieces back into one playable file. */
  async function loadAudio() {
    setAudioBusy(true);
    try {
      const segments = [...new Set(audio.map((a) => a.segment))].sort((a, b) => a - b);
      const out = [];
      for (const seg of segments) {
        const parts = audio.filter((a) => a.segment === seg).sort((a, b) => a.seq - b.seq);
        const blobs = await Promise.all(parts.map((p) => fetch(p.url).then((r) => r.blob())));
        const type = parts[0]?.mime || "audio/webm";
        const blob = new Blob(blobs, { type });
        out.push({
          segment: seg,
          url: URL.createObjectURL(blob),
          bytes: blob.size,
          ext: type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm",
        });
      }
      setAudioUrls(out);
    } finally {
      setAudioBusy(false);
    }
  }

  async function copyLink() {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(callLink(session.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* shown on screen to copy by hand */
    }
  }

  if (loadError) {
    return (
      <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink">
        {loadError}{" "}
        <Link href="/admin/recordings" className="font-bold text-brand">
          Back to all calls
        </Link>
      </p>
    );
  }
  if (!session) return <p className="mt-6 text-sm text-ink-soft">Loading...</p>;

  const onCall = state !== "idle" && state !== "ended";
  const canCall = session.status !== "ended" && !onCall && state !== "ended";
  const len = callLength(session);
  const sorted = [...lines].sort((a, b) => a.t_ms - b.t_ms || a.id - b.id);
  const card = "rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6";
  const field = "w-full rounded-lg border border-[#e3e9f1] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const small = "flex items-center gap-1.5 rounded-lg border border-[#e3e9f1] px-3 py-1.5 text-xs font-bold text-ink hover:border-brand";

  return (
    <>
      <Link href="/admin/recordings" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> All calls
      </Link>

      {/* ---- details ---- */}
      <section className={`${card} mt-3`}>
        {editDetails ? (
          <div className="grid gap-3">
            <label className="block text-sm font-semibold text-ink">
              Customer name
              <input className={`${field} mt-1.5`} value={dName} onChange={(e) => setDName(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-ink">
              Purpose of the call
              <input className={`${field} mt-1.5`} value={dPurpose} onChange={(e) => setDPurpose(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <button onClick={saveDetails} className="rounded-lg bg-leaf px-4 py-2 text-sm font-bold text-white">Save</button>
              <button onClick={() => setEditDetails(false)} className="rounded-lg border border-[#e3e9f1] px-4 py-2 text-sm font-bold text-ink">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-ink">{session.customer_name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{session.purpose}</p>
              <p className="mt-2 text-xs text-ink-soft">
                {new Date(session.started_at ?? session.created_at).toLocaleString("en-GB")}
                {len !== null && ` · ${clock(len)}`}
                {session.consent_at ? " · Customer agreed to be recorded" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDName(session.customer_name);
                  setDPurpose(session.purpose);
                  setEditDetails(true);
                }}
                className={small}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit details
              </button>
              <button onClick={deleteCall} className={`${small} hover:border-v-red hover:text-v-red`}>
                <Trash2 className="h-3.5 w-3.5" /> Delete call
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---- the call ---- */}
      {(canCall || onCall) && (
        <section className={`${card} mt-4`}>
          {!onCall && (
            <>
              <p className="text-sm font-semibold text-ink">Link to send</p>
              <p className="mt-1.5 break-all rounded-lg bg-mist px-3 py-2 font-mono text-xs text-ink">{callLink(session.token)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={copyLink} className={small}>
                  {copied ? <Check className="h-3.5 w-3.5 text-leaf-deep" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a
                  href={whatsAppInvite(session.customer_name, session.token)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
                >
                  Send on WhatsApp
                </a>
              </div>
              <button
                onClick={start}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-6 py-3.5 font-display text-base font-bold text-white transition-colors hover:bg-leaf-deep sm:w-auto"
              >
                <Phone className="h-5 w-5" /> Start the call
              </button>
              <p className="mt-2 text-xs text-ink-soft">
                Use Chrome. Keep this page open and the screen on until the call ends.
              </p>
              {problem && <p className="mt-2 text-sm font-semibold text-v-red">{problem}</p>}
            </>
          )}

          {onCall && (
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${state === "connected" ? "animate-pulse bg-v-red" : "bg-ink/30"}`} />
                <p className="text-sm font-semibold text-ink">{STATE_LINE[state]}</p>
              </div>
              <p className="mt-3 font-display text-4xl font-bold text-ink">{clock(elapsed)}</p>
              <p className="mt-1 text-xs text-ink-soft">Audio saved so far: {sizeLabel(savedBytes)}</p>
              {mySpeech === false && (
                <p className="mt-3 rounded-lg bg-v-yellow/15 px-3 py-2 text-xs font-semibold text-ink">
                  Your words are not being written down on this phone. The audio is still recorded, and you can add lines after
                  the call.
                </p>
              )}
              {theirSpeech === false && (
                <p className="mt-2 rounded-lg bg-v-yellow/15 px-3 py-2 text-xs font-semibold text-ink">
                  The customer&apos;s phone cannot write down their words (it may not be Chrome). The audio is still recorded.
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <button onClick={toggleMute} className="flex items-center gap-2 rounded-full border border-[#e3e9f1] px-5 py-3 text-sm font-bold text-ink">
                  {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button onClick={() => void finish()} className="flex items-center gap-2 rounded-full bg-v-red px-5 py-3 text-sm font-bold text-white">
                  <PhoneOff className="h-4 w-4" /> End the call
                </button>
              </div>
            </div>
          )}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        </section>
      )}

      {/* ---- audio ---- */}
      {!onCall && (audio.length > 0 || session.audio_deleted_at) && (
        <section className={`${card} mt-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Audio</h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                {audio.length > 0
                  ? `${sizeLabel(session.audio_bytes)} saved`
                  : "The audio was removed. The transcript is kept."}
              </p>
            </div>
            {audio.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDName(session.customer_name);
                    setDPurpose(session.purpose);
                    setEditDetails(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={small}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={deleteAudioFiles} className={`${small} hover:border-v-red hover:text-v-red`}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete audio
                </button>
              </div>
            )}
          </div>
          {audio.length > 0 &&
            (audioUrls ? (
              <div className="mt-4 space-y-3">
                {audioUrls.map((a, i) => (
                  <div key={a.segment}>
                    {audioUrls.length > 1 && <p className="mb-1 text-xs font-semibold text-ink-soft">Part {i + 1}</p>}
                    <audio controls src={a.url} className="w-full" onLoadedMetadata={fixDuration} />
                    <a
                      href={a.url}
                      download={`glufloat-call-${session.customer_name.replace(/\W+/g, "-").toLowerCase()}${audioUrls.length > 1 ? `-part-${i + 1}` : ""}.${a.ext}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand"
                    >
                      <Download className="h-3.5 w-3.5" /> Download audio
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <button onClick={loadAudio} disabled={audioBusy} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {audioBusy ? "Loading..." : "Listen to the audio"}
              </button>
            ))}
        </section>
      )}

      {/* ---- transcript ---- */}
      <section className={`${card} mt-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Transcript</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{sorted.length} lines</p>
          </div>
          {!onCall && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => buildTranscriptPdf([{ session, lines: sorted }]).save(transcriptFileName([{ session }]))}
                className={small}
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
              <button onClick={() => setAdding(true)} className={small}>
                <Plus className="h-3.5 w-3.5" /> Add a line
              </button>
              {sorted.length > 0 && (
                <button onClick={deleteTranscript} className={`${small} hover:border-v-red hover:text-v-red`}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete transcript
                </button>
              )}
            </div>
          )}
        </div>

        {adding && (
          <div className="mt-4 grid gap-2 rounded-xl bg-mist p-3">
            <div className="flex flex-wrap gap-2">
              <select className={`${field} w-auto`} value={newSpeaker} onChange={(e) => setNewSpeaker(e.target.value as Speaker)} aria-label="Who said it">
                <option value="customer">{session.customer_name}</option>
                <option value="glufloat">GluFloat</option>
              </select>
              <input className={`${field} w-24`} value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="Time into the call, like 3:07" />
            </div>
            <textarea className={field} rows={2} value={newText} onChange={(e) => setNewText(e.target.value)} aria-label="What was said" />
            <div className="flex gap-2">
              <button onClick={addLine} disabled={!newText.trim()} className="rounded-lg bg-leaf px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                Add
              </button>
              <button onClick={() => setAdding(false)} className="rounded-lg border border-[#e3e9f1] bg-white px-4 py-2 text-sm font-bold text-ink">
                Cancel
              </button>
            </div>
          </div>
        )}

        <ul className="mt-4 space-y-3">
          {sorted.map((l) => {
            const who = speakerName(l.speaker, session.customer_name);
            const isEditing = editingLine === l.id;
            return (
              <li key={l.id} className="rounded-xl border border-[#eef2f7] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs">
                    <span className="text-ink-soft">{l.t_ms === Number.MAX_SAFE_INTEGER ? "now" : clock(l.t_ms)}</span>{" "}
                    <span className={`font-bold ${l.speaker === "glufloat" ? "text-brand" : "text-leaf-deep"}`}>{who}</span>
                    {l.edited && <span className="ml-1 text-ink-soft">(edited)</span>}
                  </p>
                  {!onCall && l.id > 0 && !isEditing && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingLine(l.id);
                          setLineText(l.text);
                          setLineSpeaker(l.speaker);
                        }}
                        aria-label={`Edit the line at ${clock(l.t_ms)}`}
                        className="rounded-md p-1 text-ink-soft hover:bg-mist hover:text-brand"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteLine(l)}
                        aria-label={`Delete the line at ${clock(l.t_ms)}`}
                        className="rounded-md p-1 text-ink-soft hover:bg-v-red/10 hover:text-v-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-2 grid gap-2">
                    <select className={`${field} w-auto`} value={lineSpeaker} onChange={(e) => setLineSpeaker(e.target.value as Speaker)} aria-label="Change who said this line">
                      <option value="customer">{session.customer_name}</option>
                      <option value="glufloat">GluFloat</option>
                    </select>
                    <textarea className={field} rows={3} value={lineText} onChange={(e) => setLineText(e.target.value)} aria-label="Change what was said" />
                    <div className="flex gap-2">
                      <button onClick={() => saveLine(l)} className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-bold text-white">Save</button>
                      <button onClick={() => setEditingLine(null)} className="flex items-center gap-1 rounded-lg border border-[#e3e9f1] px-3 py-1.5 text-xs font-bold text-ink">
                        <X className="h-3 w-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-ink">{l.text}</p>
                )}
              </li>
            );
          })}
          {onCall && interim && (
            <li className="rounded-xl border border-dashed border-[#e3e9f1] p-3 text-sm italic text-ink-soft">GluFloat: {interim}</li>
          )}
          {sorted.length === 0 && !interim && (
            <li className="py-6 text-center text-sm text-ink-soft">
              {onCall ? "Words will appear here as you talk." : "No transcript yet."}
            </li>
          )}
        </ul>
      </section>
    </>
  );
}
