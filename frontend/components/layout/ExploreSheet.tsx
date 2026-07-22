"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const OPEN_EVENT = "dsex:open-explore";

/** Open the Explore bottom sheet from anywhere (e.g. the bottom-bar Explore tab). */
export function openExploreSheet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

type Dest = {
  href: string;
  label: string;
  desc: string;
  accent: string;
  icon: React.ReactNode;
};

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DESTS: Dest[] = [
  {
    href: "/dsestockranking",
    label: "Rankings",
    desc: "Top-rated stocks",
    accent: "var(--gold)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
        <path d="M6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4" />
        <path d="M12 15v3M8 21h8M10 21v-1a2 2 0 0 1 4 0v1" />
      </svg>
    ),
  },
  {
    href: "/stocks",
    label: "Browse Stocks",
    desc: "All companies A–Z",
    accent: "var(--primary)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.4" />
        <rect x="13" y="4" width="7" height="7" rx="1.4" />
        <rect x="4" y="13" width="7" height="7" rx="1.4" />
        <rect x="13" y="13" width="7" height="7" rx="1.4" />
      </svg>
    ),
  },
  {
    href: "/market-analysis",
    label: "Market Analysis",
    desc: "Mood, trends & picks",
    accent: "var(--info)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M4 4v16h16" />
        <path d="M7 14l3-3 3 2 5-6" />
        <path d="M18 7h-3M18 7v3" />
      </svg>
    ),
  },
  {
    href: "/dse-today",
    label: "DSE Today",
    desc: "Today's market",
    accent: "var(--navy)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        <circle cx="12" cy="15" r="1.7" />
      </svg>
    ),
  },
];

export default function ExploreSheet() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // Listen for the global open event
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Escape to close + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="explore-sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Explore"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="explore-sheet">
        <div className="explore-sheet-handle" aria-hidden="true" />
        <div className="explore-sheet-head">
          <h2 className="explore-sheet-title">Explore</h2>
          <button
            type="button"
            className="explore-sheet-close"
            onClick={close}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div className="explore-sheet-grid">
          {DESTS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="explore-tile"
              style={{ ["--tile-accent" as string]: d.accent } as React.CSSProperties}
              onClick={close}
            >
              <span className="explore-tile-icon">{d.icon}</span>
              <span className="explore-tile-label">{d.label}</span>
              <span className="explore-tile-desc">{d.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
