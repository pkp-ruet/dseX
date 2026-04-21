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
          if (entry.isIntersecting) setActive(entry.target.id);
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
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setActive(id); }
  };

  return (
    <div
      ref={navRef}
      className="sticky top-0 z-40 mb-5 -mx-4 px-4 overflow-x-auto"
      style={{
        background: "rgba(8, 14, 26, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(30,58,95,0.6)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      role="tablist"
    >
      <div className="flex gap-0.5 min-w-max py-1.5">
        {SECTIONS.map((sec) => {
          const isActive = active === sec.id;
          return (
            <button
              key={sec.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => scrollTo(sec.id)}
              className="relative px-4 py-2.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
              style={{
                color: isActive ? "#0EA5E9" : "#64748B",
                background: isActive ? "rgba(14,165,233,0.1)" : "transparent",
              }}
            >
              {sec.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                  style={{ background: "linear-gradient(90deg, #0EA5E9, #22D3EE)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
