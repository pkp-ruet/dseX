"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/context/LangContext";

export interface DashNavItem {
  id: string;
  label: string;
}

/** Where a section counts as "on screen": just under the navbar + chips
 *  (`.dash-section` lands a tapped section at 112px). */
const LINE = 120;

/**
 * Sticky chapter chips under the hero — Your money · Market today · Worth a
 * look · Money coming · Learn. The dashboard is now a long daily read; a
 * reader who only wants dividends should reach them in one tap.
 *
 * The active chip is the section under the sticky stack (the line above).
 * When sections nest — the portfolio's shares list sits inside chapter 1 —
 * the innermost one wins, and the chapter's chip comes back below it. At the
 * very end of the page the last section on screen wins, so a short last
 * chapter still lights up. Tapping scrolls the section into view; each one
 * carries `.dash-section` (scroll-margin-top) so its title lands under the
 * chips, not behind them. Every chip wears the same ink fill when active —
 * one colour per chapter made the row look like a toy.
 */
export default function DashSectionNav({ items, lang = "en" }: { items: DashNavItem[]; lang?: Lang }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  // A tap's smooth scroll passes other sections; don't light each on the way.
  const holdUntil = useRef(0);
  const bn = lang === "bn";

  useEffect(() => {
    let raf = 0;
    function update() {
      raf = 0;
      if (Date.now() < holdUntil.current) return;
      const found = items
        .map((i) => ({ id: i.id, el: document.getElementById(i.id) }))
        .filter((s): s is { id: string; el: HTMLElement } => !!s.el);
      if (found.length === 0) return;
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        for (let k = found.length - 1; k >= 0; k--) {
          if (found[k].el.getBoundingClientRect().top < window.innerHeight) return setActive(found[k].id);
        }
      }
      let best = "";
      let bestTop = -Infinity;
      for (const s of found) {
        const r = s.el.getBoundingClientRect();
        if (r.top <= LINE && r.bottom > LINE && r.top > bestTop) {
          best = s.id;
          bestTop = r.top;
        }
      }
      // Above the first section: the first chip. Between two: keep the last one.
      if (!best && found[0].el.getBoundingClientRect().top > LINE) best = found[0].id;
      if (best) setActive(best);
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  function go(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    holdUntil.current = Date.now() + 800;
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
