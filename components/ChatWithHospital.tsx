"use client";

import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import type { HospitalCover } from "@/lib/account";
import { currentWeightFlag } from "@/lib/weighIn";
import { weightFlagLine } from "@/lib/weightTrend";

const GREETING = "Hi, I have diabetes and I use GluFloat. I would like some guidance.";

/** What each one is for, so the patient picks the right person (founder's wording choice). */
const FOR: Record<string, string> = {
  dietitian: "Questions about your food",
  doctor: "Questions about your medicine or how you feel",
};

/**
 * The Chat tab for a patient whose hospital pays for GluFloat. It reaches the
 * hospital's OWN dietitian and doctor, both when the hospital has both
 * (founder, 2026-10-12). Never GluFloat's in-house dietitian.
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

  const message = weightLine ? `${GREETING}\n\n${weightLine}` : GREETING;
  // A dietitian's practice (GluFloat for dietitians): she is the one person to chat with.
  const practice = hospital.kind === "dietitian";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#1DA851] ring-1 ring-inset ring-[#25D366]/20">
          <Stethoscope className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-ink">
            {practice ? "Chat with your dietitian" : "Chat with your hospital"}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {practice
              ? hospital.chats.length > 0
                ? `Open WhatsApp and chat with ${hospital.name}.`
                : `${hospital.name} has not added a WhatsApp number yet.`
              : hospital.chats.length > 0
                ? `Open WhatsApp and chat with your care team at ${hospital.name}.`
                : `${hospital.name} has not added a dietitian or doctor here yet. Please ask your hospital.`}
          </p>
        </div>
      </div>

      {hospital.chats.length > 0 && (
        <>
          {weightLine && (
            <div className="mt-3 rounded-xl bg-mist/70 px-3 py-2.5">
              <p className="text-xs font-semibold text-ink-soft">We will add this to your first message:</p>
              <p className="mt-0.5 text-sm text-ink">{weightLine}</p>
            </div>
          )}
          <div className="mt-4 space-y-3">
            {hospital.chats.map((c) => (
              <div key={c.whatsapp + c.role} className="rounded-2xl bg-mist/60 p-3.5">
                <a
                  href={`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-full bg-leaf px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep"
                >
                  Chat with {c.name}
                </a>
                <p className="mt-2 text-center text-sm text-ink-soft">{FOR[c.role] ?? ""}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
