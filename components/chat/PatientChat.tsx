"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Phone, Stethoscope, Users } from "lucide-react";
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

/**
 * The patient's Chat tab (2026-10-15): one chat with their care team, inside
 * GluFloat. A hospital or dietitian-practice patient also gets a Call button
 * to their hospital or dietitian for anything urgent; a Premium member is
 * told to call their own doctor or go to a hospital (founder's choice: no
 * call button to GluFloat's dietitian).
 *
 * Until supabase/chat-schema.sql runs, the server answers `ready: false` and
 * the old WhatsApp card (`fallback`) shows instead, so nothing breaks.
 */
export default function PatientChat({ active, fallback }: { active: boolean; fallback: ReactNode }) {
  const [state, setState] = useState<"loading" | "fallback" | "none" | "ready">("loading");
  const [team, setTeam] = useState<Team | null>(null);
  const [weightLine, setWeightLine] = useState<string | null>(null);
  const [seed, setSeed] = useState<{ text: string; n: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/chat?after=999999999", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { ready?: boolean; team?: Team | null }) => {
        if (!alive) return;
        if (!j.ready) return setState("fallback");
        if (!j.team) return setState("none");
        setTeam(j.team);
        setState("ready");
      })
      .catch(() => alive && setState("fallback"));
    currentWeightFlag().then((f) => {
      if (alive && f) setWeightLine(weightFlagLine(f));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading" || state === "none") return null;
  if (state === "fallback" || !team) return <>{fallback}</>;

  const premium = team.kind === "premium";
  const who = premium || team.kind === "practice" ? "your dietitian" : "your care team";
  const title = premium || team.kind === "practice" ? "Your dietitian" : "Your care team";
  const shown = team.members.slice(0, 3);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_-18px_rgba(12,42,71,0.35)] ring-1 ring-brand/10">
      {/* Who they are talking to. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d3568] via-[#14538f] to-[#1b5faa] px-4 py-4 text-white sm:px-5">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
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
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">{title}</p>
            <p className="truncate font-display text-lg font-bold leading-tight">{team.name}</p>
            {team.kind === "hospital" && team.members.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-white/75">
                {team.members.map((m) => `${m.name} (${m.role})`).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Anything urgent goes by phone, never by chat. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-verdict-red/15 bg-verdict-red/[0.06] px-4 py-3 sm:px-5">
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink">
          {premium || !team.callPhone
            ? "For anything urgent, call your doctor or go to the nearest hospital."
            : `For anything urgent, call ${team.name} now.`}
        </p>
        {!premium && team.callPhone && (
          <a
            href={`tel:${team.callPhone.replace(/[^\d+]/g, "")}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-verdict-red px-4 py-2 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(231,76,60,0.9)] hover:brightness-95"
          >
            <Phone className="h-4 w-4" /> Call {team.kind === "practice" ? "my dietitian" : "the hospital"}
          </a>
        )}
      </div>

      {team.canSend ? (
        <ChatWindow
          viewer="patient"
          active={active}
          getUrl={(after) => `/api/chat?after=${after}${active ? "&read=1" : ""}`}
          postUrl="/api/chat"
          postBody={(extra) => extra}
          emptyTitle="Ask your question here"
          emptyText={
            premium
              ? `${team.name} will reply in this chat.`
              : team.kind === "practice"
                ? `${team.name} will reply in this chat.`
                : `A doctor or dietitian at ${team.name} will reply in this chat.`
          }
          onData={() => window.dispatchEvent(new Event(CHAT_READ))}
          seed={seed}
        />
      ) : (
        <p className="px-5 py-8 text-center text-sm text-ink-soft">
          {premium
            ? "Your dietitian is not ready to chat yet. Please try again later."
            : `${team.name} has not added a doctor or dietitian yet. Please ask your hospital.`}
        </p>
      )}

      <ChatAlertsOptIn text={`Get a phone alert when ${who} replies.`} wrapClassName="border-t border-ink/[0.06] px-4 py-3 sm:px-5" />
      {((weightLine && team.canSend) || !premium) && (
        <div className="space-y-3 border-t border-ink/[0.06] bg-white px-4 py-4 sm:px-5">
          {weightLine && team.canSend && (
            <div className="rounded-2xl bg-mist/70 px-3.5 py-3">
              <p className="text-sm text-ink">{weightLine}</p>
              <button
                type="button"
                onClick={() => setSeed((s) => ({ text: weightLine, n: (s?.n ?? 0) + 1 }))}
                className="mt-2 text-sm font-bold text-brand hover:underline"
              >
                Add this to my message
              </button>
            </div>
          )}
          {!premium && (
            <p className="text-xs leading-relaxed text-ink-soft">
              To share a sugar number, save it with &quot;I tested my sugar&quot; on your Today screen. Your{" "}
              {team.kind === "practice" ? "dietitian" : "care team"} sees it in your record.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
