"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
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
    <main className="flex min-h-screen items-center justify-center bg-[#0b2e59] px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-col items-center text-center">
          <Image src="/logo-mark.png" alt="" width={44} height={44} className="h-11 w-11" />
          <h1 className="mt-4 font-display text-xl font-bold text-ink">Glufloat admin</h1>
          <p className="mt-1 text-sm text-ink-soft">Users, partners, the numbers and the blog.</p>
        </div>

        <label htmlFor="admin-password" className="mt-6 block text-sm font-semibold text-ink">
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="admin-password"
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 pr-11 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            aria-label="Admin password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/60 transition-colors hover:text-ink"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {err && <p className="mt-2 text-xs font-semibold text-v-red">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-full bg-leaf px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
