"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";

export type BankOption = { name: string; code: string };
export type SavedBank = { bankName: string | null; accountMasked: string | null; accountName: string | null };

/**
 * Bank details for care fees: pick the bank, type the 10-digit account
 * number, and the server reads the name on the account from Paystack before
 * saving it, so a typo is caught now and not when money is sent. Used by a
 * doctor (/hospital/earnings) and by GluFloat admin for a field agent.
 */
export default function BankDetailsForm({
  banks,
  saved,
  endpoint,
  extra = {},
  title = "Where we pay you",
}: {
  banks: BankOption[];
  saved: SavedBank;
  endpoint: string;
  extra?: Record<string, unknown>;
  title?: string;
}) {
  const router = useRouter();
  const has = !!saved.accountMasked;
  const [editing, setEditing] = useState(!has);
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const save = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...extra, bankCode, accountNumber: account }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "This did not save. Please try again.");
    setOk(`Saved. The account is in the name of ${j.accountName}.`);
    setEditing(false);
    setAccount("");
    router.refresh();
  };

  return (
    <section className="h-fit rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf-deep">
          <Landmark className="h-5 w-5" />
        </span>
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      </div>
      {has && !editing && (
        <div className="mt-4 rounded-2xl bg-mist/70 px-4 py-3.5 text-sm text-ink">
          <p className="font-semibold">{saved.accountName}</p>
          <p className="mt-0.5 text-ink-soft">
            {saved.bankName} · {saved.accountMasked}
          </p>
        </div>
      )}
      {ok && <p className="mt-3 text-sm font-semibold text-leaf-deep">{ok}</p>}
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="mt-4 space-y-3"
        >
          <label className="block text-sm font-semibold text-ink">
            Bank
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              required
              className="mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand"
            >
              <option value="">Choose your bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-ink">
            Account number
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              required
              minLength={10}
              maxLength={10}
              className="mt-1.5 h-12 w-full rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
            />
          </label>
          {banks.length === 0 && <p className="text-xs text-ink-soft">The list of banks could not load. Please try again later.</p>}
          {err && <p className="text-sm font-semibold text-verdict-red">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy || account.length !== 10 || !bankCode}
              className="rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
            >
              {busy ? "Checking the account..." : "Save bank details"}
            </button>
            {has && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2.5 text-sm font-bold text-ink-soft hover:text-ink">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setOk("");
          }}
          className="mt-4 rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink hover:border-brand"
        >
          Change bank details
        </button>
      )}
    </section>
  );
}
