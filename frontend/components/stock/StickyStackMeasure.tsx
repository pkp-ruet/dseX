"use client";
import { useEffect, useRef } from "react";

/** CSS custom property that `.stock-anchor` (globals.css) reads for scroll-margin-top. */
export const STICKY_STACK_VAR = "--stock-sticky-h";

/**
 * Drop this inside the stock page's sticky stack (the section chip nav).
 * It measures the stack's live height and publishes it as `--stock-sticky-h`
 * on <html>. The summary bar is position: fixed and publishes its own
 * `--stock-bar-h` (StickySummaryBar.tsx); `.stock-anchor` adds navbar + both,
 * so hash jumps land the heading just below the whole fixed stack.
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
