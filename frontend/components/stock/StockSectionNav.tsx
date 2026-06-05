"use client";
import { useEffect, useRef, useState } from "react";

export interface NavSection {
  id: string;
  label: string;
}

interface Props {
  sections: NavSection[];
}

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

  // Keep the active chip scrolled into view within the nav strip.
  useEffect(() => {
    if (!active || !navRef.current) return;
    const chip = navRef.current.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    chip?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [active]);

  if (!sections.length) return null;

  function handleClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActive(id);
  }

  return (
    <nav
      ref={navRef}
      aria-label="Jump to section"
      className="flex gap-2 overflow-x-auto py-2.5 px-3 no-scrollbar"
      style={{
        background: "color-mix(in srgb, var(--surface) 92%, transparent)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {sections.map((s) => {
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            data-chip={s.id}
            onClick={(e) => handleClick(e, s.id)}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
            style={{
              minHeight: 32,
              color: isActive ? "#fff" : "var(--text-muted)",
              background: isActive ? "var(--primary)" : "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            {s.label}
          </a>
        );
      })}
    </nav>
  );
}
