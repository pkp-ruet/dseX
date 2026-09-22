"use client";
import { useEffect, useRef, useState } from "react";
import { BAR_H, NAVBAR_H, STOCK_JUMP_EVENT } from "@/components/stock/StickyStackMeasure";

export { STOCK_JUMP_EVENT };

export interface NavSection {
  id: string;
  label: string;
}

interface Props {
  sections: NavSection[];
}

/**
 * The section chip row — the second line of the stock page's one sticky
 * element (StickySummaryBar renders it). Horizontally scrollable, every chip
 * at least 40px tall. Tapping a chip scrolls the section title just under
 * whatever the sticky stack measures right now and announces the jump
 * (STOCK_JUMP_EVENT) so the summary line can hide for it on phones.
 */
export default function StockSectionNav({ sections }: Props) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sections.length) return;
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost section currently intersecting near the top of the viewport.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active chip scrolled into view *horizontally within the nav strip*.
  // Must NOT use chip.scrollIntoView — its block:"nearest" scrolls the whole
  // page vertically too (it yanked the page down on mount). Adjust only the
  // nav's own horizontal scroll, which never touches the page scroll.
  useEffect(() => {
    const nav = navRef.current;
    if (!active || !nav) return;
    const chip = nav.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    if (!chip) return;
    const navRect = nav.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    if (chipRect.left < navRect.left) {
      nav.scrollLeft -= navRect.left - chipRect.left + 12;
    } else if (chipRect.right > navRect.right) {
      nav.scrollLeft += chipRect.right - navRect.right + 12;
    }
  }, [active]);

  if (!sections.length) return null;

  function handleClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Land the section title just under the sticky stack, whatever it measures
    // right now. On phones the summary line hides for the jump (STOCK_JUMP_EVENT),
    // so only the chip row counts; from sm up the line is always showing past
    // the hero, so count its full height even if it is still collapsed at click time.
    window.dispatchEvent(new CustomEvent(STOCK_JUMP_EVENT));
    const narrow = window.innerWidth < 640;
    const barH = narrow ? 0 : BAR_H;
    const navH = navRef.current?.offsetHeight ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - (NAVBAR_H + barH + navH + 8);
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    setActive(id);
  }

  return (
    <nav
      ref={navRef}
      aria-label="Jump to section"
      className="stock-chip-row flex gap-2 overflow-x-auto px-3 py-1.5 no-scrollbar bg-surface/90 backdrop-blur border-b border-border"
    >
      {sections.map((s) => {
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            data-chip={s.id}
            onClick={(e) => handleClick(e, s.id)}
            aria-current={isActive ? "true" : undefined}
            className={`stock-chip shrink-0 inline-flex items-center text-xs font-semibold px-3 rounded-full whitespace-nowrap border transition-colors ${
              isActive
                ? "bg-primary border-primary text-surface"
                : "bg-surface-2 border-border text-text-muted hover:text-text-main active:bg-border"
            }`}
          >
            {s.label}
          </a>
        );
      })}
    </nav>
  );
}
