import Image from "next/image";
import Link from "next/link";
import { PHARMACY_WHATSAPP_URL } from "@/lib/pharmacyJoin";

/** X, Instagram, TikTok and LinkedIn, drawn here: this lucide build ships none of them. */
function XMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M18.2 2H21l-6.4 7.3L22 22h-5.9l-4.6-6-5.3 6H3.4l6.8-7.8L2.3 2h6l4.2 5.5L18.2 2Zm-1 18.3h1.6L7.9 3.6H6.2l11 16.7Z" />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.3 6.3 0 1 0 5.3 6.2V8.6a7.9 7.9 0 0 0 4.4 1.4V6.7a4.5 4.5 0 0 1-4.4-4.7Z" />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.75Z" />
    </svg>
  );
}

const socials = [
  { name: "X", handle: "@glufloat", href: "https://x.com/glufloat", icon: <XMark /> },
  {
    name: "Instagram",
    handle: "@glufloat_",
    href: "https://www.instagram.com/glufloat_/",
    icon: <InstagramMark />,
  },
  {
    name: "TikTok",
    handle: "@glufloat",
    href: "https://www.tiktok.com/@glufloat",
    icon: <TikTokMark />,
  },
  {
    name: "LinkedIn",
    handle: "Glufloat",
    href: "https://www.linkedin.com/company/glufloat/",
    icon: <LinkedInMark />,
  },
];

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#demo", label: "Try it free" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/app", label: "Open the app" },
    ],
  },
  {
    title: "For professionals",
    links: [
      { href: "/hospitals", label: "For hospitals and clinics" },
      { href: "/dietitians", label: "For dietitians" },
      { href: "/doctors/start", label: "For doctors" },
      // Pharmacies DM us; there is no sign-up (founder, 2026-11-19).
      { href: PHARMACY_WHATSAPP_URL, label: "For pharmacies", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "The serious part",
    links: [
      { href: "/disclaimer", label: "Medical disclaimer" },
      { href: "/terms", label: "Terms of use" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

/**
 * Laid out the way thrivhe.com lays out its footer (founder, 2026-10-13): the
 * logo and social links on the left, then one column per group, each with
 * its heading, then a line and the small print. Same links, same colours and
 * the same legal line as before; only the arrangement changed.
 */
export default function Footer() {
  return (
    <footer className="border-t border-line bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-8">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src="/logo-mark.png" alt="Glufloat" width={34} height={34} />
              <span className="font-display text-lg font-bold tracking-tight">
                <span className="text-brand">GLU</span>
                <span className="text-leaf">FLOAT</span>
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Glufloat on ${s.name}, ${s.handle}`}
                  title={`${s.name} ${s.handle}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand"
                >
                  {s.icon}
                  {s.handle}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((c) => (
            <div key={c.title} className="text-sm">
              <p className="font-display font-semibold text-ink">{c.title}</p>
              <ul className="mt-3 space-y-2 text-ink-soft">
                {c.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a className="hover:text-brand" href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label}
                      </a>
                    ) : (
                      <Link className="hover:text-brand" href={l.href}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="text-xs leading-relaxed text-ink-soft">
            Glufloat provides food guidance for people living with diabetes. It
            is not a substitute for medical advice and does not diagnose, treat,
            cure, or prevent any medical condition. Always consult your doctor
            or other qualified healthcare professional about your individual
            care.{" "}
            <Link
              href="/disclaimer"
              className="underline underline-offset-2 hover:text-brand"
            >
              Read our full disclaimer
            </Link>
            .
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            © 2026 Glufloat. 11 Idris Ogunlaja Drive, Majek, Lagos, Nigeria.
          </p>
        </div>
      </div>
    </footer>
  );
}
