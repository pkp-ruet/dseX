"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type WatchlistNewsItem } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

interface Props {
  news: WatchlistNewsItem[];
  loading: boolean;
}

const AUTO_ADVANCE_MS = 5000;

/** Rotating slide accents — indigo → emerald → purple → amber (theme tokens,
 *  red deliberately excluded so no story reads as "bad news" by color). */
const ACCENTS = [
  "var(--primary)",
  "var(--np-strong)",
  "var(--np-cautious)",
  "var(--np-watch)",
];

/**
 * Auto-advancing one-headline-at-a-time news slider for the personalized
 * homepage. Tapping a headline expands the full story inline (which also
 * pauses the auto-slide); swipe or the arrows move between stories.
 */
export default function NewsSlider({ news, loading }: Props) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const touchX = useRef<number | null>(null);

  const count = news.length;
  const paused = expanded || hovered;

  // Keep index valid when the list refreshes to a shorter one.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, paused]);

  function goTo(next: number) {
    setIndex(((next % count) + count) % count);
    setExpanded(false);
  }

  if (loading && count === 0) {
    return (
      <Card padding="none" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton width={48} height={16} rounded="999px" />
          <Skeleton width={64} height={12} />
        </div>
        <Skeleton height={14} className="mb-2" />
        <Skeleton width="75%" height={14} />
      </Card>
    );
  }

  if (count === 0) return null;

  const item = news[index];
  const accent = ACCENTS[index % ACCENTS.length];
  const canExpand = Boolean(item.body);

  return (
    <Card padding="none" className="overflow-hidden">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) goTo(dx < 0 ? index + 1 : index - 1);
        }}
        style={{
          background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 10%, var(--surface)) 0%, var(--surface) 60%)`,
        }}
      >
        {/* Auto-advance progress — restarts in sync with the timer (both are
            keyed on index + pause state). */}
        {count > 1 && (
          <div className="mx-4 mt-3 h-[3px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_8%,transparent)]">
            <div
              key={`${index}-${paused}`}
              className={`news-slider-progress ${paused ? "is-paused" : ""}`}
              style={
                {
                  "--ns-accent": accent,
                  "--ns-duration": `${AUTO_ADVANCE_MS}ms`,
                } as React.CSSProperties
              }
            />
          </div>
        )}

        {/* Sliding track — every slide is headline-only; the open story body
            renders below the track so collapsed slides keep the row short. */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {news.map((n, i) => {
              const slideAccent = ACCENTS[i % ACCENTS.length];
              return (
                <div key={i} className="w-full shrink-0 px-4 pt-3" aria-hidden={i !== index}>
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      prefetch={false}
                      href={`/stock/${n.trading_code}`}
                      tabIndex={i === index ? 0 : -1}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide text-white shadow-sm hover:opacity-85 transition-opacity"
                      style={{
                        background: `linear-gradient(135deg, ${slideAccent} 0%, color-mix(in srgb, ${slideAccent} 72%, #000) 100%)`,
                      }}
                    >
                      {n.trading_code}
                    </Link>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        color: `color-mix(in srgb, ${slideAccent} 80%, var(--text))`,
                        background: `color-mix(in srgb, ${slideAccent} 10%, transparent)`,
                      }}
                    >
                      {formatDate(n.post_date)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => i === index && n.body && setExpanded((v) => !v)}
                    disabled={!n.body}
                    className="mt-2 flex w-full items-start gap-2 text-left"
                    tabIndex={i === index ? 0 : -1}
                    aria-expanded={i === index ? expanded : undefined}
                  >
                    <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-2">
                      {n.title}
                    </p>
                    {n.body && (
                      <span
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                        style={{
                          color: slideAccent,
                          background: `color-mix(in srgb, ${slideAccent} 12%, transparent)`,
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className={`transition-transform duration-300 ${
                            i === index && expanded ? "rotate-180" : ""
                          }`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full story for the current slide */}
        {expanded && canExpand && (
          <div className="px-4 pt-2">
            <p
              className="border-l-[3px] pl-3 text-xs text-[var(--ink-muted)] leading-relaxed"
              style={{ borderColor: accent }}
            >
              {item.body}
            </p>
          </div>
        )}
        {!expanded && canExpand && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="px-4 pt-1 text-[11px] font-bold hover:underline"
            style={{ color: accent }}
          >
            Read full news →
          </button>
        )}

        {/* Controls */}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_70%,var(--surface))] px-4 py-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums"
            style={{
              color: `color-mix(in srgb, ${accent} 80%, var(--text))`,
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
            }}
          >
            {index + 1} / {count}
          </span>
          {count > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous news"
                className="grid h-7 w-7 place-items-center rounded-full border bg-[var(--surface)] transition-colors"
                style={{
                  color: accent,
                  borderColor: `color-mix(in srgb, ${accent} 35%, var(--border))`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next news"
                className="grid h-7 w-7 place-items-center rounded-full border bg-[var(--surface)] transition-colors"
                style={{
                  color: accent,
                  borderColor: `color-mix(in srgb, ${accent} 35%, var(--border))`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          )}
          <Button href="/todays-news" variant="ghost" size="sm">
            All news →
          </Button>
        </div>
      </div>
    </Card>
  );
}
