/**
 * Shown on the money screens until supabase/finance-schema.sql has been run.
 * Paystack money still shows; the typed-in ledgers and their forms wait.
 */
export default function SetupNotice() {
  return (
    <p className="mt-5 rounded-2xl border border-verdict-yellow bg-verdict-yellow/15 px-4 py-3 text-sm text-ink">
      <b>Waiting for the database update.</b> Paste <code className="font-mono text-xs">supabase/finance-schema.sql</code>{" "}
      into the Supabase SQL editor once. Until then, payments from Paystack show here, but expenses, founder loans
      and grants cannot be saved.
    </p>
  );
}
