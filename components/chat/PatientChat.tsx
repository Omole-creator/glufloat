"use client";

import { useEffect, useState } from "react";
import { Lock, Phone, Stethoscope, Users } from "lucide-react";
import ChatWindow from "./ChatWindow";
import ChatAlertsOptIn from "./ChatAlertsOptIn";
import { currentWeightFlag } from "@/lib/weighIn";
import { weightFlagLine } from "@/lib/weightTrend";
import { CHAT_READ } from "@/lib/useChatUnread";

type Team = {
  kind: "hospital" | "practice" | "premium";
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

/** Tap-to-start questions while the chat is empty. */
const STARTERS = [
  "What can I eat for dinner tonight?",
  "My sugar was high after lunch. What should I change?",
  "Can I eat eba or rice this week?",
];

/**
 * The patient's Chat tab (2026-10-15): one chat with their care team, inside
 * GluFloat, laid out like a messaging app (the conversation fills the screen,
 * the box to type in stays at the bottom). A hospital or dietitian-practice
 * patient also gets a Call button for anything urgent; a Premium member is
 * told to call their own doctor or go to a hospital (founder's choice).
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
  const oneDietitian = premium || team.kind === "practice";
  const who = oneDietitian ? "your dietitian" : "your care team";
  const shown = team.members.slice(0, 3);
  const subline = oneDietitian
    ? "Your dietitian"
    : team.members.length > 0
      ? team.members.map((m) => `${m.name} (${m.role})`).join(" · ")
      : "Your care team";
  const tel = team.callPhone ? `tel:${team.callPhone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[460px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_-18px_rgba(12,42,71,0.35)] ring-1 ring-brand/10 md:h-[calc(100dvh-12rem)] md:max-h-[760px]">
      {/* Who they are talking to. */}
      <div className="flex items-center gap-3 border-b border-ink/[0.06] px-4 py-3 sm:px-5">
        <div className="flex shrink-0 -space-x-2">
          {shown.length > 0 ? (
            shown.map((m) => (
              <span
                key={m.name + m.role}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#14538f] font-display text-xs font-bold text-white ring-2 ring-white"
              >
                {initials(m.name) || <Stethoscope className="h-4 w-4" />}
              </span>
            ))
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Users className="h-5 w-5" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold leading-tight text-ink">{team.name}</p>
          <p className="truncate text-xs text-ink-soft">{subline}</p>
        </div>
        {!premium && tel && (
          <a
            href={tel}
            aria-label={team.kind === "practice" ? "Call my dietitian" : "Call the hospital"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-verdict-red/10 text-verdict-red transition-colors hover:bg-verdict-red/15"
          >
            <Phone className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </a>
        )}
      </div>

      {/* Who can read it, and what never belongs in a chat. */}
      <div className="space-y-1 border-b border-ink/[0.06] bg-[#fbfcfe] px-4 py-2.5 text-xs sm:px-5">
        <p className="flex items-center gap-1.5 text-ink-soft">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {oneDietitian ? "Only you and your dietitian can read this chat." : "Only you and your care team can read this chat."}
        </p>
        <p className="flex items-center gap-1.5 font-semibold text-verdict-red">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {premium || !tel ? (
            "For anything urgent, call your doctor or go to the nearest hospital."
          ) : (
            <span>
              For anything urgent, call {team.kind === "practice" ? "your dietitian" : team.name} now.
            </span>
          )}
        </p>
      </div>

      <ChatAlertsOptIn text={`Get a phone alert when ${who} replies.`} wrapClassName="border-b border-ink/[0.06] px-3 py-2.5 sm:px-4" />

      {weightLine && team.canSend && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ink/[0.06] bg-mist/60 px-4 py-2.5 sm:px-5">
          <p className="min-w-0 flex-1 text-sm text-ink">{weightLine}</p>
          <button
            type="button"
            onClick={() => setSeed((s) => ({ text: weightLine, n: (s?.n ?? 0) + 1 }))}
            className="text-sm font-bold text-brand hover:underline"
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
          emptyText={oneDietitian ? `${team.name} will reply in this chat.` : `A doctor or dietitian at ${team.name} will reply in this chat.`}
          suggestions={STARTERS}
          onData={() => window.dispatchEvent(new Event(CHAT_READ))}
          seed={seed}
        />
      ) : (
        <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-soft">
          {premium
            ? "Your dietitian is not ready to chat yet. Please try again later."
            : `${team.name} has not added a doctor or dietitian yet. Please ask your hospital.`}
        </p>
      )}
    </div>
  );
}
