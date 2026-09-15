"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/context/LangContext";

export interface DashNavItem {
  id: string;
  label: string;
}

/**
 * Sticky chapter chips under the hero — Your money · Market today · Worth a
 * look · Money coming · Learn. The dashboard is now a long daily read; a
 * reader who only wants dividends should reach them in one tap.
 *
 * The active chip follows the chapter currently under the sticky stack
 * (IntersectionObserver). Tapping scrolls the chapter into view; each chapter
 * carries `.dash-section` (scroll-margin-top) so its title lands under the
 * chips, not behind them.
 */
export default function DashSectionNav({ items, lang = "en" }: { items: DashNavItem[]; lang?: Lang }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const bn = lang === "bn";

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const ratios = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        // The chapter with the most of itself on screen wins; ties go to the
        // one highest on the page.
        let best = "";
        let bestRatio = 0;
        for (const i of items) {
          const r = ratios.get(i.id) ?? 0;
          if (r > bestRatio) {
            best = i.id;
            bestRatio = r;
          }
        }
        if (best) setActive(best);
      },
      { rootMargin: "-112px 0px -40% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  function go(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (items.length < 2) return null;

  return (
    <nav className={`dash-nav${bn ? " font-bn" : ""}`} aria-label="Sections" lang={bn ? "bn" : undefined}>
      <div className="dash-nav-row">
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            className="dash-chip"
            aria-current={active === i.id ? "true" : undefined}
            onClick={() => go(i.id)}
          >
            {i.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
