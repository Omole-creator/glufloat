/**
 * Who brought a doctor to GluFloat, remembered between the link they opened
 * (/d/<code>) and their sign-up (/doctors/start). Founder's rules, 2026-10-16:
 *  - The doctor never types or sees an agent code. The link sets a hidden,
 *    httpOnly cookie and the sign-up reads it on the server.
 *  - First touch wins: an existing cookie is never overwritten.
 *  - "a:<agent id>" when a field agent's link was opened; "c:<practice id>"
 *    when a colleague doctor's invite was. A colleague's invite gives the
 *    agent nothing.
 */
export const DOCTOR_REF_COOKIE = "gf_drref";
export const DOCTOR_REF_DAYS = 60;

export type DoctorRef = { agentId: string } | { colleagueId: string } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDoctorRef(raw: string | null | undefined): DoctorRef {
  const v = String(raw ?? "");
  const id = v.slice(2);
  if (!UUID.test(id)) return null;
  if (v.startsWith("a:")) return { agentId: id };
  if (v.startsWith("c:")) return { colleagueId: id };
  return null;
}

/** The cookie's value from a raw Cookie header. */
export function doctorRefFromHeader(cookieHeader: string | null): string | null {
  for (const part of (cookieHeader ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === DOCTOR_REF_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}
