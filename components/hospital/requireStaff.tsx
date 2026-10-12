import { redirect } from "next/navigation";
import { sessionUser, staffContext, type StaffContext } from "@/lib/hospitalServer";

/**
 * The gate every hospital page starts with. Not signed in: to the login page,
 * which brings them straight back here. Signed in but nobody's staff: null,
 * and the page shows <NotStaff />.
 */
export async function requireStaffPage(h: string | undefined, here: string): Promise<StaffContext | null> {
  const ctx = await staffContext(h ?? null);
  if (ctx) return ctx;
  if (!(await sessionUser())) redirect(`/signin?next=${encodeURIComponent(here)}`);
  return null;
}
