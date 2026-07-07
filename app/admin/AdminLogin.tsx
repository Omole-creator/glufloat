"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (r.ok) {
      window.location.reload();
    } else {
      setErr("Wrong password.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs rounded-2xl border border-line bg-white p-6 shadow-lg"
      >
        <h1 className="font-display text-lg font-bold text-ink">
          Glufloat admin
        </h1>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Admin password"
          className="mt-4 w-full rounded-xl border-2 border-line px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
          aria-label="Admin password"
        />
        {err && <p className="mt-2 text-xs font-medium text-verdict-red">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {busy ? "..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
