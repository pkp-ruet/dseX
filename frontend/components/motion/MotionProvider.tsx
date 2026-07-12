"use client";

import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { type ReactNode } from "react";

/**
 * Homepage-scoped motion runtime.
 *
 * - `LazyMotion` + `domAnimation` ships only the DOM animation feature set
 *   (fades, variants, hover/tap/focus, `whileInView`) — no drag/layout — so the
 *   bundle stays lean. `strict` forbids the full `motion.*` components and forces
 *   the lightweight `m.*` ones (keeps tree-shaking honest — using `motion.div`
 *   under this provider throws at runtime, which is the intended guardrail).
 * - `reducedMotion="user"` makes every motion component honor the OS
 *   "reduce motion" setting automatically (animates opacity/colour, snaps
 *   transforms to final). Custom timers/rAF loops must still check
 *   `useReducedMotion()` themselves — MotionConfig only governs motion elements.
 *
 * Scope this to the homepage (wrap the marketing tree in `app/page.tsx`) rather
 * than the root layout, so other routes ship zero motion code.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
