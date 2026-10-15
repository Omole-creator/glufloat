import Image from "next/image";
import Link from "next/link";
import { HospitalLogOut } from "@/components/hospital/HospitalNav";

/**
 * The frame of a GluFloat Premium dietitian's inbox (/inbox): the same deep
 * blue as the hospital dashboard, without its sidebar, because there is one
 * thing to do here: answer members' chats.
 */
export default function InboxShell({
  name,
  title,
  subtitle,
  children,
}: {
  name: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f2f5f9]">
      <header className="sticky top-0 z-30 bg-[#0b2e59]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/inbox" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <Image src="/logo-mark.png" alt="" width={24} height={24} className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base font-bold leading-tight text-white">GluFloat</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Dietitian inbox · {name}</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/app" className="hidden text-xs font-bold text-white/80 hover:text-white sm:block">
              My GluFloat
            </Link>
            <HospitalLogOut compact />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        {children}
      </main>
    </div>
  );
}
