"use client";

import { useEffect, useRef, useState } from "react";

export type LearnCategory = {
  key: string;
  short: string;
  anchor: string;
  icon: string;
  count: number;
};

export default function CategoryNav({ categories }: { categories: LearnCategory[] }) {
  const [active, setActive] = useState<string>(categories[0]?.anchor ?? "");
  const [visible, setVisible] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Reveal the bar once the user scrolls past the hero + index cards.
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 360);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the section currently nearest the top.
  useEffect(() => {
    const els = categories
      .map((c) => document.getElementById(c.anchor))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (inView[0]) setActive(inView[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Keep the active chip centered within the horizontal track (mobile).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const chip = track.querySelector<HTMLElement>(`[data-anchor="${active}"]`);
    if (!chip) return;
    track.scrollTo({
      left: chip.offsetLeft - track.clientWidth / 2 + chip.clientWidth / 2,
      behavior: "smooth",
    });
  }, [active]);

  return (
    <nav
      aria-label="Guide categories"
      className={`fixed inset-x-0 top-14 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur transition-all duration-200 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      <div className="max-w-3xl mx-auto px-4">
        <div
          ref={trackRef}
          className="flex gap-2 overflow-x-auto py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((c) => {
            const isActive = active === c.anchor;
            return (
              <a
                key={c.anchor}
                href={`#${c.anchor}`}
                data-anchor={c.anchor}
                aria-current={isActive ? "true" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${
                  isActive
                    ? "border-transparent bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
              >
                <span aria-hidden="true">{c.icon}</span>
                <span>{c.short}</span>
                <span
                  className={`text-[0.7rem] font-bold ${
                    isActive ? "text-white/80" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {c.count}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
