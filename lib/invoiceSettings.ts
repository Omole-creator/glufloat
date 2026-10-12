import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What a hospital quote or invoice prints about GluFloat: where to send the
 * money, and whether VAT is added. Typed in /admin/hospitals by the founder,
 * stored in `app_settings`, never in the code (an account number does not
 * belong in a git history).
 */
export type InvoiceSettings = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  /** Off until GluFloat is VAT-registered (founder, 2026-10-12). */
  vatOn: boolean;
  /**
   * The signature printed on quotes and invoices, as a PNG data URL. Kept in
   * the database, NEVER in the repo: the GitHub repo is public, and a
   * signature anyone can download can be put on documents we never issued.
   */
  signature: string;
  signName: string;
  signTitle: string;
};

export const VAT_RATE = 0.075;
const KEY = "invoice";

export const EMPTY_INVOICE_SETTINGS: InvoiceSettings = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  vatOn: false,
  signature: "",
  signName: "Omole Usuangbon",
  signTitle: "Founder, GluFloat",
};

export async function readInvoiceSettings(admin: SupabaseClient): Promise<InvoiceSettings> {
  const { data } = await admin.from("app_settings").select("value").eq("key", KEY).maybeSingle();
  const v = (data?.value ?? {}) as Partial<InvoiceSettings>;
  return {
    bankName: String(v.bankName ?? ""),
    accountName: String(v.accountName ?? ""),
    accountNumber: String(v.accountNumber ?? ""),
    vatOn: v.vatOn === true,
    signature: typeof v.signature === "string" && v.signature.startsWith("data:image/png;base64,") ? v.signature : "",
    signName: String(v.signName ?? EMPTY_INVOICE_SETTINGS.signName),
    signTitle: String(v.signTitle ?? EMPTY_INVOICE_SETTINGS.signTitle),
  };
}

export async function writeInvoiceSettings(admin: SupabaseClient, s: InvoiceSettings): Promise<boolean> {
  const { error } = await admin
    .from("app_settings")
    .upsert({ key: KEY, value: s, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return !error;
}
