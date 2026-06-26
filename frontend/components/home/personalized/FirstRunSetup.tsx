"use client";

import Card from "@/components/ui/Card";
import WatchlistQuickAdd from "@/components/watchlist/WatchlistQuickAdd";
import EmptyStateActions from "@/components/watchlist/EmptyStateActions";

const STAR = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/**
 * First-run on-ramp for logged-in users with an empty watchlist. Gets a brand-new
 * user to their first saved stock in seconds — an inline search-to-add plus the
 * one-click starter packs (so someone who doesn't know a single ticker can still
 * start). The parent gates this on `!hasWatchlist`, so it unmounts the instant a
 * stock is added (the watchlist cache emits `dsex:watchlist-change`, which the
 * homepage already subscribes to).
 */
export default function FirstRunSetup() {
  return (
    <Card
      padding="md"
      className="mt-3 border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--primary)]"
          style={{
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 24%, var(--border))",
          }}
          aria-hidden
        >
          {STAR}
        </span>
        <div className="min-w-0">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
            Let&apos;s get you started
          </p>
          <h2 className="text-base font-bold leading-tight text-[var(--text)]">
            Let&apos;s set up your list
          </h2>
        </div>
      </div>

      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Add a few stocks you already own or want to follow. Takes 30 seconds.
      </p>
      <p className="mt-0.5 text-xs text-[var(--text-muted)] font-bn" lang="bn">
        আপনার পছন্দের শেয়ারগুলো যোগ করুন — আমরা প্রতিদিন এগুলোর খবর রাখব।
      </p>

      <div className="mt-3">
        <WatchlistQuickAdd />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          Not sure where to start?
        </span>
        <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
      </div>

      <EmptyStateActions compact />
    </Card>
  );
}
