"use client";

import { trackUsage } from "@/lib/usage";

const CHANNEL_URL = "https://whatsapp.com/channel/0029Vb9JrAFKAwEtWoF4173a";

/**
 * A button asking people to join the Glufloat WhatsApp channel. This audience
 * lives on WhatsApp, so a channel is where tips and new foods reach them for
 * free. Plain link, no API, no cost.
 */
export default function WhatsAppChannelCard() {
  return (
    <a
      href={CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => void trackUsage("channel_join")}
      className="flex items-center justify-center gap-2.5 rounded-3xl bg-gradient-to-br from-[#25D366] to-[#128C4B] px-5 py-4 text-center font-bold text-white shadow-[0_10px_28px_-10px_rgba(37,211,102,0.6)] transition-transform hover:-translate-y-0.5"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 shrink-0" aria-hidden>
        <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5c-.1-.2-.7-1.6-.9-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2A10 10 0 0 0 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 1 1-4.3 15.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 0 1 12 3.8" />
      </svg>
      Join our WhatsApp channel for tips
    </a>
  );
}
