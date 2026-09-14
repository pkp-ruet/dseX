"use client";
import { useEffect, useRef } from "react";

/** CSS custom property that `.stock-anchor` (globals.css) reads for scroll-margin-top. */
export const STICKY_STACK_VAR = "--stock-sticky-h";

/**
 * Drop this inside the stock page's sticky stack (summary bar + section nav).
 * It measures the stack's live height — the summary bar animates between 0 and
 * ~45px — and publishes it as `--stock-sticky-h` on <html>, so hash jumps to a
 * `.stock-anchor` section land the heading just below the stack instead of a
 * fixed 112px that was ~50px short whenever the bar was showing.
 * Renders nothing visible.
 */
export default function StickyStackMeasure() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stack = ref.current?.parentElement;
    if (!stack) return;
    const root = document.documentElement;
    const apply = () =>
      root.style.setProperty(STICKY_STACK_VAR, `${Math.round(stack.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stack);
    return () => {
      ro.disconnect();
      root.style.removeProperty(STICKY_STACK_VAR);
    };
  }, []);

  return <span ref={ref} hidden aria-hidden="true" />;
}
