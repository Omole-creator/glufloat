"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAccess } from "@/lib/useAccess";

// The call to action on every public page, said the right way to whoever is reading.
//
// A paying member used to read "Start my 7-day free trial" six times on the home page.
// This is a small client island on purpose: app/page.tsx stays a server component and
// stays pre-rendered, which is what the whole SEO side of the site depends on.

type Props = {
  /** The button's own look, copied from the section it sits in. */
  className: string;
  arrowClassName?: string;
};

export default function TrialCta({
  className,
  arrowClassName = "h-5 w-5 transition-transform group-hover:translate-x-1",
}: Props) {
  const { access } = useAccess();

  // Signed in and paying, or in the trial: the app is what they want, not an offer.
  // Signed in but the trial is over: the only thing left to do is pay, and /app is
  // where that card lives with their email already on the link.
  const { label, href } =
    access.status === "trial" || access.status === "subscribed"
      ? { label: "Open my app", href: "/app" }
      : access.status === "expired"
        ? { label: "Subscribe for N1,500 a month", href: "/app" }
        : { label: "Start my 7-day free trial", href: "/trial" };

  return (
    <Link href={href} className={className}>
      {label}
      <ArrowRight className={arrowClassName} />
    </Link>
  );
}
