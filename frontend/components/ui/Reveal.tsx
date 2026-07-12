"use client";

import { m } from "motion/react";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Seconds to wait before this element starts revealing (stagger). */
  delay?: number;
  /** Vertical travel in px (rises from y → 0). Set 0 for a pure fade. */
  y?: number;
  /** Element/tag class. */
  className?: string;
  /** Fraction of the element that must be visible before it reveals (0–1). */
  amount?: number;
}

/**
 * Scroll-reveal wrapper — fades + rises its children into view once.
 *
 * Works on **server-rendered children**: because this thin client wrapper only
 * animates `opacity`/`transform`, the children can stay server components and
 * their real text is present in the SSR HTML (crawlable). Under the homepage's
 * `MotionConfig reducedMotion="user"`, the rise is dropped and content simply
 * appears — no extra code needed here.
 *
 * Uses `m.div` (not `motion.div`) as required by `LazyMotion strict` in
 * `MotionProvider`. Do NOT wrap the hero H1/subhead in this — keep above-the-fold
 * content painting instantly (LCP).
 */
export default function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  amount = 0.2,
}: Props) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </m.div>
  );
}
