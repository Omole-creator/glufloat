import Link from "next/link";
import Image from "next/image";

/** Signed in, but not anybody's hospital staff (or the tables are not set up yet). */
export default function NotStaff() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f5f9] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_20px_50px_-24px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.04]">
        <Image src="/logo-mark.png" alt="" width={48} height={48} className="mx-auto h-12 w-12" />
        <h1 className="mt-4 font-display text-xl font-bold text-ink">This page is for hospital staff</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Your account is not part of a hospital on GluFloat. If your hospital uses GluFloat, ask your hospital admin for
          an invite link.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/app" className="rounded-full bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-deep">
            Open my GluFloat
          </Link>
          <Link href="/hospitals" className="text-sm font-semibold text-brand hover:underline">
            Bring GluFloat to your hospital
          </Link>
        </div>
      </div>
    </main>
  );
}
