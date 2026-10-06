"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import {
  CallPeer,
  LiveTranscriber,
  keepAwake,
  liveWordsSafe,
  transcriptionSupported,
} from "@/lib/callClient";
import { clock } from "@/lib/recordingTypes";

type Info = {
  customer_name: string;
  purpose: string;
  status: "waiting" | "live" | "ended";
  ice?: RTCIceServer[];
};
type Stage = "loading" | "bad" | "closed" | "ask" | "call" | "done";

const STATE_LINE = {
  waiting: "Waiting for GluFloat to join. Please stay on this page.",
  connecting: "Connecting...",
  connected: "You are on the call.",
  reconnecting: "The line dropped. Reconnecting...",
  ended: "The call has ended.",
} as const;

/**
 * What the customer sees. Plain words, one button at a time, and they are told
 * BEFORE anything starts that the call is recorded and written down. Nothing is
 * recorded or written until they tap to agree.
 */
export default function CustomerCall({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [state, setState] = useState<keyof typeof STATE_LINE>("waiting");
  const [problem, setProblem] = useState("");
  const [muted, setMuted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const peerRef = useRef<CallPeer | null>(null);
  const sttRef = useRef<LiveTranscriber | null>(null);
  const sttOk = useRef<boolean>(false);
  const releaseRef = useRef<() => void>(() => {});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch(`/api/call/${token}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          setStage("bad");
          return;
        }
        const j = (await r.json()) as Info;
        setInfo(j);
        setStage(j.status === "ended" ? "closed" : "ask");
      })
      .catch(() => setStage("bad"));
  }, [token]);

  useEffect(() => {
    if (stage !== "call") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(
    () => () => {
      sttRef.current?.stop();
      peerRef.current?.close();
      releaseRef.current();
    },
    [],
  );

  const startWords = () => {
    const stt = new LiveTranscriber(
      (text) => {
        void fetch(`/api/call/${token}/line`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        peerRef.current?.send({ type: "line", text });
      },
      () => {},
      (ok) => {
        sttOk.current = ok;
        peerRef.current?.send({ type: "stt", available: ok });
      },
    );
    stt.start();
    sttRef.current = stt;
  };

  function endHere() {
    sttRef.current?.stop();
    sttRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    releaseRef.current();
    setStage("done");
  }

  async function join() {
    setProblem("");
    const agreed = await fetch(`/api/call/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "consent" }),
    }).catch(() => null);
    if (!agreed?.ok) {
      setProblem("Something went wrong. Check your internet and try again.");
      return;
    }
    let local: MediaStream;
    try {
      local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setProblem("Your phone did not allow the microphone. Tap Allow when it asks, then try again.");
      return;
    }
    releaseRef.current = await keepAwake();
    // If the words tool takes the microphone from the call on this phone, the
    // call matters more, so the words stop.
    local.getAudioTracks()[0]?.addEventListener("mute", () => {
      if (sttRef.current) {
        sttRef.current.stop();
        sttRef.current = null;
        peerRef.current?.send({ type: "stt", available: false });
      }
    });

    let started = false;
    const peer = new CallPeer(token, "customer", local, {
      onState: (s) => {
        if (s === "ended") return;
        setState(s);
        if (s === "connected") {
          if (!started) {
            started = true;
            setStartedAt(Date.now());
            // Never on a phone: it takes the microphone away from the call.
            // Their voice is recorded on its own instead and written down after.
            if (liveWordsSafe()) startWords();
            else {
              sttOk.current = false;
              peer.send({ type: "stt", available: false });
            }
          } else {
            peer.send({ type: "stt", available: sttOk.current });
          }
        }
      },
      onRemoteStream: (stream) => {
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
          void audioRef.current.play().catch(() => {});
        }
      },
      onBye: endHere,
    }, info?.ice ?? []);
    peerRef.current = peer;
    setStage("call");
    await peer.join();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    peerRef.current?.setMuted(next);
    if (next) {
      sttRef.current?.stop();
      sttRef.current = null;
    } else if (liveWordsSafe() && sttOk.current !== false) {
      startWords();
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0d3568] via-[#14538f] to-[#1b5faa] px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
        <Image src="/logo-mark.png" alt="GluFloat" width={48} height={48} className="mx-auto h-12 w-12" />
        {children}
      </div>
    </main>
  );

  if (stage === "loading") return shell(<p className="mt-6 text-sm text-ink-soft">Loading...</p>);
  if (stage === "bad")
    return shell(
      <>
        <h1 className="mt-5 font-display text-xl font-bold text-ink">This link does not work</h1>
        <p className="mt-2 text-sm text-ink-soft">Please ask GluFloat to send you the link again.</p>
      </>,
    );
  if (stage === "closed")
    return shell(
      <>
        <h1 className="mt-5 font-display text-xl font-bold text-ink">This call has ended</h1>
        <p className="mt-2 text-sm text-ink-soft">Thank you for talking with us.</p>
      </>,
    );
  if (stage === "done")
    return shell(
      <>
        <h1 className="mt-5 font-display text-xl font-bold text-ink">Thank you</h1>
        <p className="mt-2 text-sm text-ink-soft">The call has ended. You can close this page.</p>
      </>,
    );

  if (stage === "ask" && info)
    return shell(
      <>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">Hello {info.customer_name}</h1>
        <p className="mt-3 text-sm text-ink">GluFloat would like to talk with you about:</p>
        <p className="mt-1 text-sm font-semibold text-ink">{info.purpose}</p>
        <div className="mt-5 rounded-2xl bg-mist px-4 py-3 text-left text-sm text-ink">
          <p className="font-semibold">Before you join</p>
          <p className="mt-1">
            This call is recorded, and your words are written down as we talk. This helps us learn what you need.
          </p>
          <p className="mt-1">Only the GluFloat team sees it. We will not use your name in any advert.</p>
        </div>
        {!transcriptionSupported() && (
          <p className="mt-3 text-xs text-ink-soft">For the best call, open this link in the Chrome app.</p>
        )}
        <button
          onClick={join}
          className="mt-6 w-full rounded-full bg-leaf px-6 py-4 font-display text-base font-bold text-white transition-colors hover:bg-leaf-deep"
        >
          I agree. Join the call
        </button>
        {problem && <p className="mt-3 text-sm font-semibold text-verdict-red">{problem}</p>}
      </>,
    );

  return shell(
    <>
      <div className="mt-5 flex items-center justify-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${state === "connected" ? "animate-pulse bg-verdict-red" : "bg-ink/30"}`} />
        <p className="text-xs font-semibold text-ink-soft">{state === "connected" ? "Recording" : "Not connected yet"}</p>
      </div>
      <p className="mt-3 text-base font-semibold text-ink">{STATE_LINE[state]}</p>
      <p className="mt-3 font-display text-4xl font-bold text-ink">
        {startedAt ? clock(now - startedAt) : "0:00"}
      </p>
      <p className="mt-2 text-xs text-ink-soft">Keep this page open and your screen on.</p>
      <div className="mt-7 flex justify-center gap-4">
        <button
          onClick={toggleMute}
          className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-[#e3e9f1] text-ink"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        <button
          onClick={() => {
            peerRef.current?.hangUp();
            endHere();
          }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-verdict-red text-white"
          aria-label="End the call"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-soft">{muted ? "You are muted" : " "}</p>
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </>,
  );
}
