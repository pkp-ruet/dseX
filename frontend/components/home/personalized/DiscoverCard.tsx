"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ScoreItem, Top20Item } from "@/lib/api";
import { getTier, TIER_VAR } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";
import TierPill from "@/components/ui/TierPill";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";

const RANKED_ROWS = 3;

const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };

/** Small "changed since your last visit" cue on a discovery row. */
function DeltaTag({ isNew, moved }: { isNew: boolean; moved: number | undefined }) {
  if (isNew) {
    return (
      <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--positive)_14%,transparent)] px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.06em] text-[var(--positive)]">
        New
      </span>
    );
  }
  if (moved && moved > 0) {
    return (
      <span className="shrink-0 text-[0.64rem] font-extrabold tabular-nums text-[var(--positive)]" title={`Up ${moved} place${moved === 1 ? "" : "s"} since your last visit`}>
        ▲{moved}
      </span>
    );
  }
  return null;
}

/** One tappable entry into a fuller discovery page (Top 20, stock lists). */
function EntryRow({
  emoji,
  label,
  sub,
  href,
}: {
  emoji: string;
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 transition-colors hover:bg-[var(--surface-2)]"
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        aria-hidden
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9rem] font-bold leading-tight text-[var(--text)]">{label}</span>
        <span className="block truncate text-[0.7rem] text-[var(--text-muted)]">{sub}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-[var(--primary)]" aria-hidden>
        →
      </span>
    </Link>
  );
}

/** Discovery card for the logged-in home. "Top ranked" stays a real preview
 *  list (the app's core value); Top 20 and Lists collapse to one-line entry
 *  rows so the whole card scans in one pass with no tabs. Ranked rows are divs
 *  (not links) so the watchlist star can act in place; New/▲ tags come from a
 *  per-device localStorage diff of the last visit day's list (lib/daily-delta). */
export default function DiscoverCard({
  ranked,
  top20,
}: {
  /** Score-sorted rows (all tiers flattened), best first. */
  ranked: ScoreItem[];
  top20: Top20Item[];
}) {
  const rankedRows = useMemo(() => ranked.slice(0, RANKED_ROWS), [ranked]);
  const [rankedDelta, setRankedDelta] = useState<ListDelta>(EMPTY_DELTA);

  // Day-over-day diff, computed client-side once the list arrives.
  const rankedKey = rankedRows.map((r) => r.trading_code).join(",");
  useEffect(() => {
    if (rankedKey) setRankedDelta(getListDelta("home.ranked", rankedKey.split(",")));
  }, [rankedKey]);

  const hasRanked = rankedRows.length > 0;
  const hasTop20 = top20.length > 0;

  if (!hasRanked && !hasTop20) return null;

  return (
    <section className="soft-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 pt-4 sm:px-4">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, transparent), color-mix(in srgb, var(--accent) 22%, transparent))",
          }}
          aria-hidden
        >
          🧭
        </span>
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-extrabold leading-tight tracking-tight text-[var(--text)]">
            Discover Stocks
          </h2>
          <p className="text-[0.68rem] font-semibold text-[var(--text-muted)]">
            Quick ways to find your next stock
          </p>
        </div>
      </div>

      {hasRanked && (
        <>
          <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4">
            <span className="flex items-center gap-1.5 text-[0.86rem] font-extrabold tracking-tight text-[var(--text)]">
              <span aria-hidden>🏆</span> Top ranked
            </span>
            <Link
              href="/dsestockranking"
              className="text-[0.72rem] font-bold text-[var(--primary)] transition hover:underline"
            >
              Full ranking →
            </Link>
          </div>

          <div className="divide-y divide-[var(--cell-rule)] border-t border-[var(--border)]">
            {rankedRows.map((item, i) => {
              const tier = getTier(item.score);
              const color = TIER_VAR[tier];
              const code = item.trading_code.toUpperCase();
              return (
                <div
                  key={item.trading_code}
                  className="grid grid-cols-[1.75rem_1fr_auto_auto] items-center gap-3 border-l-[3px] px-3 py-3 transition-colors hover:bg-[var(--surface-2)] sm:px-4"
                  style={{ borderLeftColor: `color-mix(in srgb, ${color} 26%, transparent)` }}
                >
                  <span className="text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{i + 1}</span>
                  <Link prefetch={false} href={`/stock/${item.trading_code}`} className="group min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[0.8rem] font-extrabold tracking-[0.03em] transition-all group-hover:brightness-95"
                        style={{
                          color,
                          background: `color-mix(in srgb, ${color} 11%, transparent)`,
                          borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
                        }}
                      >
                        {item.trading_code}
                      </span>
                      <DeltaTag isNew={rankedDelta.newCodes.has(code)} moved={rankedDelta.movedUp.get(code)} />
                    </span>
                    {item.company_name && (
                      <span className="mt-0.5 block truncate text-[0.66rem] text-[var(--text-muted)] group-hover:underline underline-offset-2 decoration-dotted">
                        {item.company_name}
                      </span>
                    )}
                  </Link>
                  <TierPill tier={tier} className="justify-self-end" />
                  <StarButton code={item.trading_code} size="sm" />
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="space-y-2 border-t border-[var(--border)] px-3 py-3 sm:px-4">
        {hasTop20 && (
          <EntryRow
            emoji="🚀"
            label="Trending stocks"
            sub="Biggest 7-day gainers"
            href="/dse-trending-stocks"
          />
        )}
        <EntryRow
          emoji="📋"
          label="Ready-made lists"
          sub="Dividends, growth, big companies and more"
          href="/stock-insights"
        />
      </div>
    </section>
  );
}
