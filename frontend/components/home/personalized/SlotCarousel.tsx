"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "@/context/LangContext";
import { IconChevronRight } from "@/components/ui/icons";

/** The home's one slot: a slide's look. */
export type SlideTone = "gold" | "clay" | "plain";

export interface Slide {
  id: string;
  tone: SlideTone;
  node: ReactNode;
  /** Fired once, the first time at least 60% of the slide is on screen. */
  onSeen?: () => void;
}

/**
 * The swipeable row: scroll-snap, dots on phones, a "seen" event per slide.
 * From 1024px the dots give way to a pager (‹ 1 / 4 ›) inside the card's
 * bottom-right corner, on the buttons' row.
 */
export function Carousel({ slides, lang }: { slides: Slide[]; lang: Lang }) {
  const bn = lang === "bn";
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const seen = useRef(new Set<string>());
  const handlers = useRef(new Map<string, () => void>());
  handlers.current = new Map(slides.filter((s) => s.onSeen).map((s) => [s.id, s.onSeen!]));
  const ids = slides.map((s) => s.id).join("|");

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.slide ?? "";
          if (!id || seen.current.has(id)) continue;
          seen.current.add(id);
          handlers.current.get(id)?.();
        }
      },
      { root: el, threshold: 0.6 },
    );
    Array.from(el.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [ids]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  if (slides.length === 0) return null;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let dist = Infinity;
    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft - el.scrollLeft);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setActive(best);
  };

  const go = (i: number) => {
    const el = trackRef.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    if (!el || !kid) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: kid.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  };

  const n = slides.length;
  return (
    <section
      className={`hm-slot ${n > 1 ? "hm-slot--multi" : ""} ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
      aria-label={bn ? "অফার ও খবর" : "Offers and news"}
      data-card="slot"
    >
      <div className="hm-track" ref={trackRef} onScroll={onScroll}>
        {slides.map((s, i) => (
          <article
            key={s.id}
            data-slide={s.id}
            data-card={`slide-${s.id}`}
            className={`hm-slide hm-slide--${s.tone}`}
            aria-roledescription={bn ? "স্লাইড" : "slide"}
            aria-label={`${i + 1} / ${n}`}
          >
            {s.node}
          </article>
        ))}
      </div>
      {n > 1 && (
        <div className="hm-slot-foot">
          <div className="hm-dots" aria-hidden>
            {slides.map((s, i) => (
              <span key={s.id} className="hm-dot" data-on={i === active ? "" : undefined} />
            ))}
          </div>
          <div className="hm-arrows">
            <button
              type="button"
              className="hm-arrow hm-arrow--prev"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              aria-label={bn ? "আগেরটি" : "Previous"}
            >
              <IconChevronRight size={18} />
            </button>
            <span className="hm-count nums" aria-hidden>
              {active + 1} / {n}
            </span>
            <button
              type="button"
              className="hm-arrow"
              onClick={() => go(active + 1)}
              disabled={active >= n - 1}
              aria-label={bn ? "পরেরটি" : "Next"}
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
