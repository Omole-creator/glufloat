"use client";

import { useEffect, useState } from "react";
import { Lock, Phone, PhoneCall, Stethoscope, Users } from "lucide-react";
import ChatWindow from "./ChatWindow";
import ChatAlertsOptIn from "./ChatAlertsOptIn";
import { currentWeightFlag } from "@/lib/weighIn";
import { weightFlagLine } from "@/lib/weightTrend";
import { CHAT_READ } from "@/lib/useChatUnread";

type Team = {
  kind: "hospital" | "practice" | "premium" | "doctor";
  name: string;
  members: { name: string; role: string }[];
  callPhone: string | null;
  canSend: boolean;
};

function initials(name: string): string {
  return name
    .replace(/^(dr|dtn|mr|mrs|ms|prof|pharm|nurse)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * The patient's Chat tab (2026-10-15): one chat with their care team, inside
 * GluFloat. Laid out like a messaging app in GluFloat's own colours: the deep
 * blue of the meal card on top, the conversation in the middle, the box to
 * type in, and under it the "anything urgent" panel. A hospital or
 * dietitian-practice patient calls the hospital or dietitian there, and a
 * Premium member calls their own GluFloat dietitian (founder put that back,
 * 2026-10-16). With no number, it says to call a doctor or go to a hospital.
 */
export default function PatientChat({ active }: { active: boolean }) {
  const [state, setState] = useState<"loading" | "notready" | "none" | "ready">("loading");
  const [team, setTeam] = useState<Team | null>(null);
  const [weightLine, setWeightLine] = useState<string | null>(null);
  const [seed, setSeed] = useState<{ text: string; n: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/chat?after=999999999", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { ready?: boolean; team?: Team | null }) => {
        if (!alive) return;
        if (!j.ready) return setState("notready");
        if (!j.team) return setState("none");
        setTeam(j.team);
        setState("ready");
      })
      .catch(() => alive && setState("notready"));
    currentWeightFlag().then((f) => {
      if (alive && f) setWeightLine(weightFlagLine(f));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading" || state === "none") return null;
  if (state === "notready" || !team)
    return (
      <p className="rounded-3xl bg-white px-5 py-8 text-center text-sm text-ink-soft shadow-sm ring-1 ring-brand/10">
        Chat is not ready right now. Please try again in a little while.
      </p>
    );

  const premium = team.kind === "premium";
  const doctor = team.kind === "doctor";
  const oneDietitian = premium || team.kind === "practice";
  const who = doctor ? "your doctor" : oneDietitian ? "your dietitian" : "your care team";
  const shown = team.members.slice(0, 3);
  const subline = doctor
    ? "Your doctor"
    : oneDietitian
    ? "Your dietitian"
    : team.members.length > 0
      ? team.members.map((m) => `${m.name} (${m.role})`).join(" · ")
      : "Your care team";
  const tel = team.callPhone ? `tel:${team.callPhone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="flex h-[calc(100dvh-19.5rem)] min-h-[430px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-22px_rgba(12,42,71,0.45)] ring-1 ring-brand/10 md:h-[calc(100dvh-12rem)] md:max-h-[780px]">
      {/* Who they are talking to: the same deep blue as the meal card. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d3568] via-[#14538f] to-[#1b5faa] px-4 pb-3.5 pt-4 text-white sm:px-5">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-leaf/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex shrink-0 -space-x-2.5">
            {shown.length > 0 ? (
              shown.map((m) => (
                <span
                  key={m.name + m.role}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-sm font-bold text-brand ring-2 ring-[#14538f]"
                >
                  {initials(m.name) || <Stethoscope className="h-5 w-5" />}
                </span>
              ))
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25">
                <Users className="h-5 w-5" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold leading-tight">{team.name}</p>
            <p className="truncate text-xs text-white/75">{subline}</p>
          </div>
        </div>
        <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-inset ring-white/15">
          <Lock className="h-3 w-3" />
          {doctor
            ? "Only you and your doctor can read this chat."
            : oneDietitian
              ? "Only you and your dietitian can read this chat."
              : "Only you and your care team can read this chat."}
        </p>
      </div>

      <ChatAlertsOptIn text={`Get a phone alert when ${who} replies.`} wrapClassName="border-b border-ink/[0.06] px-3 py-2.5 sm:px-4" />

      {weightLine && team.canSend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ink/[0.06] bg-leaf/[0.06] px-4 py-2.5 sm:px-5">
          <p className="min-w-0 flex-1 text-sm text-ink">{weightLine}</p>
          <button
            type="button"
            onClick={() => setSeed((s) => ({ text: weightLine, n: (s?.n ?? 0) + 1 }))}
            className="text-sm font-bold text-leaf-deep hover:underline"
          >
            Add this to my message
          </button>
        </div>
      )}

      {team.canSend ? (
        <ChatWindow
          className="flex-1"
          heightClass="flex-1 min-h-0"
          viewer="patient"
          active={active}
          getUrl={(after) => `/api/chat?after=${after}${active ? "&read=1" : ""}`}
          postUrl="/api/chat"
          postBody={(extra) => extra}
          emptyTitle="Ask your question here"
          emptyText={oneDietitian || doctor ? `${team.name} will reply in this chat.` : `A doctor or dietitian at ${team.name} will reply in this chat.`}
          onData={() => window.dispatchEvent(new Event(CHAT_READ))}
          seed={seed}
        />
      ) : (
        <p className="flex flex-1 items-center justify-center bg-[#f1f6fb] px-6 text-center text-sm text-ink-soft">
          {premium
            ? "Your dietitian is not ready to chat yet. Please try again later."
            : doctor
            ? "Your doctor is not ready to chat yet. Please try again later."
            : `${team.name} has not added a doctor or dietitian yet. Please ask your hospital.`}
        </p>
      )}

      {/* Anything urgent goes by phone, never by chat: its own panel under the box. */}
      <div className="bg-white px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="flex items-center gap-3 rounded-2xl bg-verdict-red/[0.07] px-3.5 py-3 ring-1 ring-inset ring-verdict-red/15">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-verdict-red text-white">
            <PhoneCall className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <p className="min-w-0 flex-1 text-sm leading-snug text-ink">
            <span className="font-bold">Anything urgent?</span>{" "}
            {tel
              ? `Call ${oneDietitian ? "your dietitian" : team.name} now. Do not wait for a chat reply.`
              : doctor
                ? "Go to the nearest hospital now. Do not wait for a chat reply."
                : "Call your doctor or go to the nearest hospital. Do not wait for a chat reply."}
          </p>
          {tel && (
            <a
              href={tel}
              aria-label={oneDietitian ? "Call my dietitian" : "Call the hospital"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-verdict-red px-4 py-2 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(231,76,60,0.9)] hover:brightness-95"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
