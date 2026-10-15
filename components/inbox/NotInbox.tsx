import Link from "next/link";
import Image from "next/image";

/** Signed in, but not one of GluFloat's Premium dietitians. */
export default function NotInbox() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f5f9] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_20px_50px_-24px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.04]">
        <Image src="/logo-mark.png" alt="" width={48} height={48} className="mx-auto h-12 w-12" />
        <h1 className="mt-4 font-display text-xl font-bold text-ink">This page is for GluFloat dietitians</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Your account does not answer GluFloat Premium chats. Your own chat is in your GluFloat app.
        </p>
        <Link href="/app" className="mt-6 inline-block rounded-full bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-deep">
          Open my GluFloat
        </Link>
      </div>
    </main>
  );
}
