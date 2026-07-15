/**
 * A floating "Chat with the founder" button for inside the app. It is a plain
 * WhatsApp click-to-chat link to the founder's own number, so someone using the
 * product who wants to speak to a real person can, in one tap. No API, no cost.
 *
 * The number is stored in international form (Nigeria 234, no leading 0) because
 * that is what wa.me needs: 08132097317 -> 2348132097317.
 */
const FOUNDER_WHATSAPP = "2348132097317";
const GREETING = "Hi GluFloat, I would like to speak with you.";

export default function ChatWithFounder() {
  const href = `https://wa.me/${FOUNDER_WHATSAPP}?text=${encodeURIComponent(GREETING)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us"
      className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_6px_18px_-6px_rgba(37,211,102,0.7)] transition-transform hover:scale-105 hover:bg-[#1DA851]"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
        <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5c-.1-.2-.7-1.6-.9-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2A10 10 0 0 0 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 1 1-4.3 15.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 0 1 12 3.8" />
      </svg>
    </a>
  );
}
