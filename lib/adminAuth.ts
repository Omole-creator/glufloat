import crypto from "crypto";

/** Cookie name + token for the admin dashboard gate. */
export const ADMIN_COOKIE = "gf_admin";

export function adminToken(): string {
  return crypto
    .createHash("sha256")
    .update("glufloat-admin|" + (process.env.ADMIN_PASSWORD || ""))
    .digest("hex");
}
