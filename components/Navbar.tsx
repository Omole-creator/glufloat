"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 shadow-[0_8px_30px_-16px_rgba(12,45,77,0.35)] backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt="Glufloat"
            width={38}
            height={38}
            priority
          />
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-brand">GLU</span>
            <span className="text-leaf">FLOAT</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          <Link href="/#how" className="transition-colors hover:text-brand">
            How it works
          </Link>
          <Link href="/#demo" className="transition-colors hover:text-brand">
            Try it
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-brand">
            Pricing
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-brand">
            FAQ
          </Link>
          <Link href="/app" className="transition-colors hover:text-brand">
            The app
          </Link>
        </div>

        <Link
          href="/trial"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(27,95,170,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep hover:shadow-[0_12px_24px_-8px_rgba(27,95,170,0.8)] sm:px-5"
        >
          Start free trial
        </Link>
      </nav>
    </header>
  );
}
