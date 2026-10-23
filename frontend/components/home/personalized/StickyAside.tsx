"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The desktop side column. Sticks under the chapter chips when it fits on the
 * screen; when it is taller, it scrolls with the page until its last card is
 * in view and then sticks there (the column's height goes into `--aside-h`,
 * which `.dash-aside`'s `top` reads). No inner scrollbar.
 */
export default function StickyAside({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const set = () => el.style.setProperty("--aside-h", `${el.offsetHeight}px`);
    set();
    const obs = new ResizeObserver(set);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <aside ref={ref} className="dash-aside space-y-3" aria-label={label}>
      {children}
    </aside>
  );
}
