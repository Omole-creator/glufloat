import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "./adminAuth";

/** True when the request carries the admin cookie. Server only. */
export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
}
