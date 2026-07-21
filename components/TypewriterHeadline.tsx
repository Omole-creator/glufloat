"use client";

import { motion } from "framer-motion";

/**
 * A headline whose characters appear one after another, instead of all at once.
 * Founder's call for the /app headline.
 *
 * The whole line is laid out from the start and each character just fades in on a
 * staggered delay, so there is NO reflow and the centred two-line headline never
 * jumps or jitters (a plain slice-typewriter re-centres on every keystroke).
 * Words are kept whole so wrapping still happens at spaces. Screen readers get
 * the full line at once via aria-label.
 */
export default function TypewriterHeadline({
  text,
  className = "",
  step = 0.045,
}: {
  text: string;
  className?: string;
  /** Seconds between one character appearing and the next. */
  step?: number;
}) {
  const words = text.split(" ");
  let charIndex = -1; // running index across all words, for the stagger delay

  return (
    <motion.h1 className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi}>
          <span className="inline-block whitespace-nowrap" aria-hidden>
            {Array.from(word).map((ch, ci) => {
              charIndex += 1;
              return (
                <motion.span
                  key={ci}
                  className="inline-block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: charIndex * step, duration: 0.18 }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </span>
          {wi < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.h1>
  );
}
