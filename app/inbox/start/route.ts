import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { chatReady, findThread, inboxDietitians } from "@/lib/chatServer";

export const dynamic = "force-dynamic";

/**
 * "Start a chat" from the inbox: opens (or makes) the chat with one of HER
 * Premium members, then goes to it. Only a member assigned to her.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const user = await sessionUser();
  if (!user) return back("/signin?next=/inbox");
  const admin = createAdminClient();
  const mine = await inboxDietitians(admin, user.id);
  if (mine.length === 0 || !(await chatReady(admin))) return back("/inbox");
  const uid = String(url.searchParams.get("u") ?? "");
  const { data: a } = await admin
    .from("dietitian_assignments")
    .select("dietitian_id")
    .eq("user_id", uid)
    .in(
      "dietitian_id",
      mine.map((d) => d.id),
    )
    .maybeSingle();
  if (!a) return back("/inbox");
  const thread = await findThread(admin, uid, { dietitianId: a.dietitian_id as string }, true);
  return back(thread ? `/inbox/${thread.id}` : "/inbox");
}
