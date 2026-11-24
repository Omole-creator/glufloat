import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessionUser, staffContext, type StaffContext } from "@/lib/hospitalServer";
import { isNursePractice } from "@/lib/hospitalPlans";
import { AREA_HEADER, areaPath } from "@/lib/staffArea";

/**
 * The gate every hospital page starts with. Not signed in: to the login page,
 * which brings them straight back here. Signed in but nobody's staff: null,
 * and the page shows <NotStaff />.
 *
 * A nurse partner's dashboard lives at /nurse (founder, 2026-11-24). proxy.ts
 * serves /nurse/... from these same /hospital pages and marks the request, so
 * a nurse who lands on /hospital/... is sent to /nurse/..., and anybody else
 * who lands on /nurse/... is sent back to /hospital/...
 */
export async function requireStaffPage(h: string | undefined, here: string): Promise<StaffContext | null> {
  const ctx = await staffContext(h ?? null);
  const viaNurse = (await headers()).get(AREA_HEADER) === "nurse";
  if (ctx) {
    const nurse = isNursePractice(ctx.hospital);
    if (nurse !== viaNurse) redirect(`${areaPath(here, nurse)}${h ? `?h=${encodeURIComponent(h)}` : ""}`);
    return ctx;
  }
  if (!(await sessionUser())) redirect(`/signin?next=${encodeURIComponent(areaPath(here, viaNurse))}`);
  return null;
}
