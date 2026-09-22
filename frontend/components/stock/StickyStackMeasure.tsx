"use client";
import { useEffect, useRef } from "react";

/* Shared geometry for the stock page's one sticky element. Kept here (not in
   StickySummaryBar / StockSectionNav) so neither of those imports the other. */

/** Fixed navbar height (layout.tsx `h-14`). */
export const NAVBAR_H = 56;
/** Height of the summary line that overlays above the chip row while pinned.
 *  The sticky `top` and `.stock-anchor`'s scroll margin both read it through
 *  STOCK_BAR_VAR. */
export const BAR_H = 48;
/** CSS custom property on <html>: `${BAR_H}px` while the summary line shows, else 0px. */
export const STOCK_BAR_VAR = "--stock-bar-h";
/** CSS custom property that `.stock-anchor` (globals.css) reads for scroll-margin-top. */
export const STICKY_STACK_VAR = "--stock-sticky-h";
/** Fired when a section chip is tapped. StickySummaryBar listens: on phones the
 *  summary line hides for the jump so the sticky stack is as short as the offset assumes. */
export const STOCK_JUMP_EVENT = "dsex:stock-jump";

/**
 * Drop this inside the stock page's sticky element (StickySummaryBar's root).
 * It measures the element's live in-flow height — the chip row; the summary
 * line is absolutely positioned above it and publishes its own `--stock-bar-h`
 * — and writes it to `--stock-sticky-h` on <html>. `.stock-anchor` adds navbar
 * + both, so hash jumps land the heading just below the whole fixed stack.
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
