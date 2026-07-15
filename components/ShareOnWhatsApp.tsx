"use client";

/**
 * One button that opens WhatsApp with a ready-made message. It is a plain
 * `wa.me` deep link, so it needs no API, no key and no backend: the person picks
 * a contact and sends. This is how a food answer reaches the relative who has
 * diabetes, which is where this audience lives.
 *
 * `encodeURIComponent` turns the blank lines in the message into the spacing
 * WhatsApp shows, so the shared card reads cleanly on a phone.
 */
export default function ShareOnWhatsApp({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-[#25D366] hover:text-[#128C4B] ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5c-.1-.2-.7-1.6-.9-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2A10 10 0 0 0 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 1 1-4.3 15.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 0 1 12 3.8" />
      </svg>
      Send to family on WhatsApp
    </a>
  );
}
