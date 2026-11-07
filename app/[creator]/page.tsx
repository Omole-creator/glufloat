import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { creatorForCode } from "@/lib/creatorsServer";
import { normalizeCode, validCode } from "@/lib/creators";

export const dynamic = "force-dynamic";

/**
 * A creator's link: glufloat.com/faith (founder, 2026-11-07). Every one of
 * our own pages is a fixed folder and always wins over this one, and
 * RESERVED_CODES (lib/creators.ts) stops a creator ever being given one of
 * those words. Anything that is not a switched-on creator is the normal
 * "page not found". A real code goes on to /c/<code>, which remembers it.
 */
export default async function CreatorLink({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  const raw = decodeURIComponent(String(creator ?? ""));
  if (!/^[A-Za-z0-9]{3,20}$/.test(raw) || !validCode(normalizeCode(raw))) notFound();
  const c = await creatorForCode(createAdminClient(), raw).catch(() => null);
  if (!c) notFound();
  redirect(`/c/${c.code.toLowerCase()}`);
}
