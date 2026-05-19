"use client";

import { useState } from "react";

interface Props {
  codes: string[];
}

export default function ShareWatchlistButton({ codes }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  async function handleShare() {
    if (codes.length === 0) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://topstockbd.com";
    const url = `${origin}/watchlist?codes=${codes.map((c) => c.toUpperCase()).join(",")}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast("Link copied — share it with anyone");
      } else {
        // fallback for old browsers
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setToast("Link copied");
      }
    } catch {
      setToast("Could not copy — copy manually: " + url);
    }
    setTimeout(() => setToast(null), 2500);
  }

  if (codes.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleShare}
        className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--primary)] transition-colors"
        title="Copy a shareable link to this watchlist"
      >
        <span className="inline-flex items-center gap-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </span>
      </button>
      {toast && (
        <div className="absolute right-0 top-full mt-2 z-50 whitespace-nowrap text-xs px-3 py-2 rounded-md bg-[var(--ink)] text-[var(--bg)] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
