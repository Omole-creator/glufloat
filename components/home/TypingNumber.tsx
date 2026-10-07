"use client";

import { useEffect, useState } from "react";

/**
 * A sugar number being typed into the box, one digit at a time, then cleared
 * and typed again with a different number (founder, 2026-10-07: a fixed "108"
 * read as confusing). It TYPES rather than ticks on purpose: a number that
 * counts up and down by itself looks like a live meter reading, and GluFloat
 * does not measure anybody's sugar. Typing shows what the person actually does:
 * read their meter, then type the number in.
 *
 * Anyone whose phone asks for less motion sees one still number.
 */
const NUMBERS = ["108", "96", "121", "114"];

export default function TypingNumber() {
  const [text, setText] = useState(NUMBERS[0]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let n = 0;
    let shown = NUMBERS[0];
    let mode: "hold" | "delete" | "type" = "hold";
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const target = NUMBERS[n];
      if (mode === "hold") {
        mode = "delete";
        timer = setTimeout(step, 1800);
        return;
      }
      if (mode === "delete") {
        shown = shown.slice(0, -1);
        setText(shown);
        if (shown.length === 0) {
          n = (n + 1) % NUMBERS.length;
          mode = "type";
          timer = setTimeout(step, 350);
        } else timer = setTimeout(step, 70);
        return;
      }
      shown = target.slice(0, shown.length + 1);
      setText(shown);
      if (shown === target) mode = "hold";
      timer = setTimeout(step, shown === target ? 0 : 160);
    };
    timer = setTimeout(step, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className="inline-flex items-center">
      <span className="tabular-nums">{text}</span>
      <span aria-hidden className="ml-0.5 inline-block h-5 w-[2px] animate-pulse bg-brand" />
    </span>
  );
}
