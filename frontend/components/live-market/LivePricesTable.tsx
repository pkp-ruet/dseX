"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { LivePriceItem, LiveSectorItem } from "@/lib/api";
import { isWatched, toggleWatchlist, subscribeWatchlist, getWatchlist } from "@/lib/watchlist";
import { useEffect } from "react";

interface Props {
  prices: LivePriceItem[];
  sectors?: LiveSectorItem[];
}

type SortKey = "code" | "ltp" | "change_pct" | "volume" | "value_mn";

function StarBtn({ code }: { code: string }) {
  const [watched, setWatched] = useState(false);
  useEffect(() => {
    setWatched(isWatched(code));
    return subscribeWatchlist(() => setWatched(isWatched(code)));
  }, [code]);
  return (
    <button
      onClick={(e) => { e.preventDefault(); toggleWatchlist(code); }}
      className={`text-base leading-none transition-colors ${watched ? "text-yellow-400" : "text-[var(--text-muted)] hover:text-yellow-400"}`}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}

function fmtVol(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

const PAGE_SIZE = 50;

export default function LivePricesTable({ prices, sectors }: Props) {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [watchedCodes, setWatchedCodes] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("change_pct");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const update = () => setWatchedCodes(new Set(getWatchlist()));
    update();
    return subscribeWatchlist(update);
  }, []);

  const sectorOptions = useMemo(
    () => [...new Set((sectors ?? []).map((s) => s.sector).filter(Boolean))].sort(),
    [sectors]
  );

  const filtered = useMemo(() => {
    let list = prices;
    if (search) list = list.filter((p) => p.code.toLowerCase().includes(search.toLowerCase()));
    if (watchlistOnly) list = list.filter((p) => watchedCodes.has(p.code));
    return list;
  }, [prices, search, watchlistOnly, watchedCodes]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | string | null = a[sortKey] ?? null;
      let bv: number | string | null = b[sortKey] ?? null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return sortAsc ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
  }, [filtered, sortKey, sortAsc]);

  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(key === "code"); }
    setPage(0);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="opacity-30">⇅</span>;
    return <span>{sortAsc ? "↑" : "↓"}</span>;
  }

  const thCls = "px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)] select-none whitespace-nowrap";

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text)] mr-1">All Stocks</h3>
        <input
          type="search"
          placeholder="Search code…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 min-w-[120px] max-w-[180px] px-2 py-1 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        />
        {sectorOptions.length > 0 && (
          <select
            value={sectorFilter}
            onChange={(e) => { setSectorFilter(e.target.value); setPage(0); }}
            className="px-2 py-1 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none"
          >
            <option value="">All Sectors</option>
            {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <button
          onClick={() => { setWatchlistOnly((w) => !w); setPage(0); }}
          className={`px-2 py-1 text-xs rounded-md border transition-colors ${
            watchlistOnly
              ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
              : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
          }`}
        >
          ★ WL Only
        </button>
        <span className="ml-auto text-xs text-[var(--text-muted)]">{sorted.length} stocks</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
            <tr>
              <th className={thCls} onClick={() => toggleSort("code")}>
                Code <SortIcon col="code" />
              </th>
              <th className={`${thCls} text-right`} onClick={() => toggleSort("ltp")}>
                LTP <SortIcon col="ltp" />
              </th>
              <th className={`${thCls} text-right`} onClick={() => toggleSort("change_pct")}>
                Chg% <SortIcon col="change_pct" />
              </th>
              <th className={`${thCls} text-right hidden sm:table-cell`}>High</th>
              <th className={`${thCls} text-right hidden sm:table-cell`}>Low</th>
              <th className={`${thCls} text-right`} onClick={() => toggleSort("volume")}>
                Vol <SortIcon col="volume" />
              </th>
              <th className={`${thCls} text-right hidden md:table-cell`} onClick={() => toggleSort("value_mn")}>
                Val(mn) <SortIcon col="value_mn" />
              </th>
              <th className={thCls}>★</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((p) => {
              const up = (p.change_pct ?? 0) >= 0;
              const pctColor = up
                ? "text-green-600 dark:text-green-400"
                : "text-red-500 dark:text-red-400";
              const sign = up ? "+" : "";
              return (
                <tr
                  key={p.code}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors"
                >
                  <td className="px-3 py-2 font-semibold">
                    <Link href={`/stock/${p.code}`} className="text-[var(--accent)] hover:underline">
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                    {p.ltp != null ? p.ltp.toFixed(1) : "—"}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${pctColor}`}>
                    {p.change_pct != null ? `${sign}${p.change_pct.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-muted)] hidden sm:table-cell">
                    {p.high != null ? p.high.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-muted)] hidden sm:table-cell">
                    {p.low != null ? p.low.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-muted)]">
                    {fmtVol(p.volume)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-muted)] hidden md:table-cell">
                    {p.value_mn != null ? p.value_mn.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StarBtn code={p.code} />
                  </td>
                </tr>
              );
            })}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)] text-xs">
                  No stocks match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40 hover:border-[var(--accent)] transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-xs px-3 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40 hover:border-[var(--accent)] transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
