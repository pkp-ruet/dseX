"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ScoreItem, Top20Item } from "@/lib/api";
import { getTier, TIER_VAR } from "@/lib/constants";
import { STOCK_LISTS } from "@/lib/stock-lists";
import StarButton from "@/components/ui/StarButton";
import TierPill from "@/components/ui/TierPill";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";

const ROWS = 5;
const TAB_KEY = "dsex.home.discoverTab";

type TabKey = "ranked" | "top20" | "insights";

const INSIGHT_LISTS = STOCK_LISTS.filter((l) => l.insightMode === true).slice(0, ROWS);

const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };

function readStoredTab(): TabKey | null {
  try {
    const v = window.localStorage.getItem(TAB_KEY);
    return v === "ranked" || v === "top20" || v === "insights" ? v : null;
  } catch {
    return null;
  }
}

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

/** Tabbed discovery card for the logged-in home: Top ranked / Top 20 /
 *  Insights previews behind chips (last tab remembered per device). Replaces
 *  the three stacked 5-row tables. Rows are divs (not links) so the watchlist
 *  star can act in place; New/▲ tags come from a per-device localStorage diff
 *  of the last visit day's list (lib/daily-delta). */
export default function DiscoverCard({
  ranked,
  top20,
}: {
  /** Score-sorted rows (all tiers flattened), best first. */
  ranked: ScoreItem[];
  top20: Top20Item[];
}) {
  const rankedRows = ranked.slice(0, ROWS);
  const top20Rows = top20.slice(0, ROWS);

  const tabs = useMemo(() => {
    const t: { key: TabKey; label: string }[] = [];
    if (rankedRows.length > 0) t.push({ key: "ranked", label: "Top ranked" });
    if (top20Rows.length > 0) t.push({ key: "top20", label: "Top 20" });
    if (INSIGHT_LISTS.length > 0) t.push({ key: "insights", label: "Stock Lists" });
    return t;
  }, [rankedRows.length, top20Rows.length]);

  const [tab, setTab] = useState<TabKey>("ranked");
  const [rankedDelta, setRankedDelta] = useState<ListDelta>(EMPTY_DELTA);
  const [top20Delta, setTop20Delta] = useState<ListDelta>(EMPTY_DELTA);

  // Restore the last-used tab after mount (localStorage is client-only).
  useEffect(() => {
    const stored = readStoredTab();
    if (stored && tabs.some((t) => t.key === stored)) setTab(stored);
  }, [tabs]);

  // Day-over-day diffs, computed client-side once the lists arrive.
  const rankedKey = rankedRows.map((r) => r.trading_code).join(",");
  const top20Key = top20Rows.map((r) => r.trading_code).join(",");
  useEffect(() => {
    if (rankedKey) setRankedDelta(getListDelta("home.ranked", rankedKey.split(",")));
  }, [rankedKey]);
  useEffect(() => {
    if (top20Key) setTop20Delta(getListDelta("home.top20", top20Key.split(",")));
  }, [top20Key]);

  if (tabs.length === 0) return null;
  const active: TabKey = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  function switchTab(next: TabKey) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      /* private mode */
    }
  }

  const footer: Record<TabKey, { href: string; label: string }> = {
    ranked: { href: "/dsestockranking", label: "See full ranking →" },
    top20: { href: "/dse-top-20", label: "See all DSE Top 20 →" },
    insights: { href: "/stock-insights", label: "See all stock lists →" },
  };

  const tabDescription: Record<TabKey, string> = {
    ranked: "Strong companies with healthy business numbers, best first.",
    top20: "Stocks whose price moved the most in the last 7 days.",
    insights: "Ready-made stock lists — dividends, growth, big companies and more.",
  };

  return (
    <section className="soft-card overflow-hidden">
      <div className="px-3 pt-3.5 sm:px-4">
        <span className="block px-1 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--text)]">
          Discover Stocks
        </span>
        <div role="tablist" aria-label="Discover stocks" className="mt-2.5 flex gap-1.5 overflow-x-auto pb-2">
          {tabs.map(({ key, label }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => switchTab(key)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                  isActive
                    ? "border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface))] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="px-1 pb-3 text-[0.78rem] font-bold leading-snug text-[var(--text)]">
          {tabDescription[active]}
        </p>
      </div>

      <div className="divide-y divide-[var(--cell-rule)] border-t border-[var(--border)]">
        {active === "ranked" &&
          rankedRows.map((item, i) => {
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

        {active === "top20" &&
          top20Rows.map((item) => {
            const v = item.return_7d_pct;
            const color =
              v == null ? "var(--text-muted)" : v > 0 ? "var(--positive)" : v < 0 ? "var(--negative)" : "var(--text-muted)";
            const code = item.trading_code.toUpperCase();
            return (
              <div
                key={item.trading_code}
                className="grid grid-cols-[1.75rem_1fr_auto_auto] items-center gap-3 border-l-[3px] px-3 py-3 transition-colors hover:bg-[var(--surface-2)] sm:px-4"
                style={{ borderLeftColor: `color-mix(in srgb, ${color} 26%, transparent)` }}
              >
                <span className="text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{item.rank}</span>
                <Link prefetch={false} href={`/stock/${item.trading_code}`} className="group min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="ticker-tag text-[0.8rem]">{item.trading_code}</span>
                    <DeltaTag isNew={top20Delta.newCodes.has(code)} moved={top20Delta.movedUp.get(code)} />
                  </span>
                  {item.company_name && (
                    <span className="mt-0.5 block truncate text-[0.66rem] text-[var(--text-muted)] group-hover:underline underline-offset-2 decoration-dotted">
                      {item.company_name}
                    </span>
                  )}
                </Link>
                <span className="justify-self-end text-right">
                  <span className="block text-sm font-extrabold tabular-nums" style={{ color }}>
                    {v != null && v > 0 ? "▲" : v != null && v < 0 ? "▼" : ""}
                    {v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                  </span>
                  <span className="fr-price block">
                    <span className="fr-price-cur">৳</span>
                    <span className="fr-price-val">{item.ltp != null ? item.ltp.toFixed(2) : "--"}</span>
                  </span>
                </span>
                <StarButton code={item.trading_code} size="sm" />
              </div>
            );
          })}

        {active === "insights" &&
          INSIGHT_LISTS.map((list, i) => (
            <Link
              key={list.slug}
              prefetch={false}
              href={`/stock-insights/${list.slug}`}
              className="grid grid-cols-[1.75rem_auto_1fr_auto] items-center gap-3 border-l-[3px] px-3 py-3 transition-colors hover:bg-[var(--surface-2)] sm:px-4"
              style={{ borderLeftColor: "color-mix(in srgb, var(--primary) 26%, transparent)" }}
            >
              <span className="text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{i + 1}</span>
              <span
                className="grid h-8 w-8 place-items-center rounded-lg text-base"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                aria-hidden
              >
                {list.icon}
              </span>
              <span className="min-w-0 truncate text-[0.9rem] font-bold leading-tight text-[var(--text)]">
                {list.shortName}
              </span>
              <span className="justify-self-end text-sm font-bold text-[var(--primary)]" aria-hidden>
                →
              </span>
            </Link>
          ))}
      </div>

      <Link
        href={footer[active].href}
        className="block border-t border-[var(--border)] px-4 py-3 text-center text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-2)]"
      >
        {footer[active].label}
      </Link>
    </section>
  );
}
