/**
 * Paystack bank lookups, for the bank details a doctor or field agent is paid
 * to. Server only. Read-only: it lists banks and reads the name on an account,
 * so a typo is caught the moment the details are saved, not when money goes
 * to the wrong person. It never moves money.
 */

const API = "https://api.paystack.co";

async function get<T>(path: string): Promise<{ ok: boolean; data: T | null }> {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) return { ok: false, data: null };
  try {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${k}` }, cache: "no-store" });
    const j = (await res.json().catch(() => null)) as { status?: boolean; data?: T } | null;
    return { ok: res.ok && !!j?.status, data: (j?.data as T) ?? null };
  } catch {
    return { ok: false, data: null };
  }
}

export type Bank = { name: string; code: string };

let banksCache: { at: number; banks: Bank[] } | null = null;

/** Nigerian banks, A to Z. Cached for a day. */
export async function listBanks(): Promise<Bank[]> {
  if (banksCache && Date.now() - banksCache.at < 86_400_000) return banksCache.banks;
  const r = await get<{ name: string; code: string; active?: boolean; is_deleted?: boolean }[]>("/bank?country=nigeria&currency=NGN&perPage=200");
  if (!r.ok || !r.data) return banksCache?.banks ?? [];
  const seen = new Set<string>();
  const banks: Bank[] = [];
  for (const b of r.data) {
    if (b.active === false || b.is_deleted || !b.code || seen.has(b.code)) continue;
    seen.add(b.code);
    banks.push({ name: b.name, code: b.code });
  }
  banks.sort((a, b) => a.name.localeCompare(b.name));
  banksCache = { at: Date.now(), banks };
  return banks;
}

/** The name on an account, or a plain error. */
export async function resolveAccount(
  accountNumber: string,
  bankCode: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const n = accountNumber.replace(/\D/g, "");
  if (n.length !== 10) return { ok: false, error: "An account number has 10 digits." };
  if (!bankCode) return { ok: false, error: "Please choose your bank." };
  const r = await get<{ account_name: string }>(`/bank/resolve?account_number=${n}&bank_code=${encodeURIComponent(bankCode)}`);
  if (!r.ok || !r.data?.account_name) return { ok: false, error: "We could not find this account. Please check the number and the bank." };
  return { ok: true, name: r.data.account_name };
}
