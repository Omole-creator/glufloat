"use client";

import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import type { HospitalCover } from "@/lib/account";
import { currentWeightFlag } from "@/lib/weighIn";
import { weightFlagLine } from "@/lib/weightTrend";

const GREETING = "Hi, I have diabetes and I use GluFloat. I would like some guidance.";

/**
 * The Chat tab for a patient whose hospital pays for GluFloat (founder,
 * 2026-10-12). Same WhatsApp door as ChatWithDietitian, but it reaches the
 * hospital's OWN dietitian, or its doctor when the hospital has no dietitian.
 * Never GluFloat's in-house dietitian.
 */
export default function ChatWithHospital({ hospital }: { hospital: HospitalCover }) {
  const [weightLine, setWeightLine] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    currentWeightFlag().then((f) => {
      if (alive && f) setWeightLine(weightFlagLine(f));
    });
    return () => {
      alive = false;
    };
  }, []);

  const chat = hospital.chat;
  const who = chat?.role === "dietitian" ? "dietitian" : "doctor";
  const message = weightLine ? `${GREETING}\n\n${weightLine}` : GREETING;

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#1DA851] ring-1 ring-inset ring-[#25D366]/20">
        <Stethoscope className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold text-ink">Chat with your hospital</p>
        {chat ? (
          <>
            <p className="mt-0.5 text-sm text-ink-soft">
              Open WhatsApp and chat with your {who} at {hospital.name}.
            </p>
            {weightLine && (
              <div className="mt-3 rounded-xl bg-mist/70 px-3 py-2.5">
                <p className="text-xs font-semibold text-ink-soft">We will add this to your first message:</p>
                <p className="mt-0.5 text-sm text-ink">{weightLine}</p>
              </div>
            )}
            <a
              href={`https://wa.me/${chat.whatsapp}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-leaf px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-leaf-deep"
            >
              Chat with {chat.name}
            </a>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-ink-soft">
            {hospital.name} has not added a dietitian or doctor here yet. Please ask your hospital.
          </p>
        )}
      </div>
    </div>
  );
}
