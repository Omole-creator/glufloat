/**
 * A nurse partner's dashboard address (founder, 2026-11-24): glufloat.com/nurse
 * instead of /hospital. The pages are the same /hospital pages; proxy.ts
 * rewrites /nurse/... to them and sets AREA_HEADER so the server knows which
 * address was used. Links are written as /hospital/... and passed through
 * areaPath() wherever a nurse can see them.
 */
export const AREA_HEADER = "x-gf-area";

/** "/hospital/patients/1" as the nurse ("/nurse/patients/1") or staff address. */
export function areaPath(path: string, nurse: boolean): string {
  if (nurse) return path.replace(/^\/hospital(?=\/|$|\?)/, "/nurse");
  return path.replace(/^\/nurse(?=\/|$|\?)/, "/hospital");
}

/** True when this browser path is a nurse's dashboard. */
export function isNurseArea(pathname: string | null | undefined): boolean {
  return !!pathname && /^\/nurse(\/|$)/.test(pathname);
}
