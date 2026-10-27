import { timingSafeEqual } from "node:crypto";
import { isAdmin } from "@/lib/adminSession";

/**
 * Who is calling an admin route: the admin (cookie), or one of GluFloat's
 * scheduled Claude jobs, which send `x-outreach-secret: <CREATOR_OUTREACH_SECRET>`
 * (one secret for every job, kept in Vercel and in each job's prompt).
 */
export async function adminOrJob(request: Request): Promise<"admin" | "job" | null> {
  if (await isAdmin()) return "admin";
  const secret = process.env.CREATOR_OUTREACH_SECRET;
  const given = request.headers.get("x-outreach-secret");
  if (!secret || !given) return null;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b) ? "job" : null;
}
