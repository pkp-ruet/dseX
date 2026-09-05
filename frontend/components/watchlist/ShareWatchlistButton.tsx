"use client";

import { toast } from "@/lib/toast";

interface Props {
  codes: string[];
}

export default function ShareWatchlistButton({ codes }: Props) {
  async function handleShare() {
    if (codes.length === 0) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://topstockbd.com";
    const url = `${origin}/watchlist?codes=${codes.map((c) => c.toUpperCase()).join(",")}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast({ message: "Link copied — share it with anyone", tone: "success" });
      } else {
        // fallback for old browsers
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast({ message: "Link copied", tone: "success" });
      }
    } catch {
      toast({ message: "Couldn't copy the link", tone: "error" });
    }
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
    </div>
  );
}
