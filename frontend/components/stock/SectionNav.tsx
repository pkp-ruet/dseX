"use client";
import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "section-performance", label: "Performance" },
  { id: "section-valuation", label: "Valuation" },
  { id: "section-dividends", label: "Dividends" },
  { id: "section-ownership", label: "Ownership" },
  { id: "section-news", label: "News" },
];

export default function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    for (const sec of SECTIONS) {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  };

  return (
    <div
      ref={navRef}
      className="sticky top-0 z-40 bg-white border-b border-[var(--border)] mb-4 -mx-4 px-4 overflow-x-auto"
      role="tablist"
    >
      <div className="flex gap-1 min-w-max py-1">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            role="tab"
            aria-selected={active === sec.id}
            onClick={() => scrollTo(sec.id)}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              active === sec.id
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-gray-50"
            }`}
            style={active === sec.id ? { background: "var(--primary-bg, #EEF2FF)" } : undefined}
          >
            {sec.label}
          </button>
        ))}
      </div>
    </div>
  );
}
