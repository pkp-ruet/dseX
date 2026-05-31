"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getScores, type ScoreItem, type ScoresResponse } from "@/lib/api";
import { addToWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";

/** Search any DSE stock and add it to the watchlist. Self-contained (fetches scores). */
export default function WatchlistQuickAdd() {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [watched, setWatched] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getScores().then(setScores).catch(() => {});
  }, []);

  useEffect(() => {
    setWatched(getCachedWatchlist());
    return subscribeWatchlist(() => setWatched(getCachedWatchlist()));
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const all: ScoreItem[] = useMemo(
    () => (scores ? Object.values(scores.tiers).flat() : []),
    [scores],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return all
      .filter(
        (it) =>
          it.trading_code.toUpperCase().includes(q) ||
          (it.company_name ?? "").toUpperCase().includes(q),
      )
      .slice(0, 8);
  }, [query, all]);

  function handleSelect(code: string) {
    addToWatchlist(code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="watchlist-add-bar" ref={wrapRef}>
      <div className="watchlist-add-input-wrap">
        <svg className="watchlist-add-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          className="watchlist-add-input"
          placeholder="Search any stock to add…"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            className="watchlist-add-clear"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="watchlist-add-dropdown">
          {filtered.map((it) => {
            const isWatched = watched.includes(it.trading_code.toUpperCase());
            return (
              <li
                key={it.trading_code}
                className={`watchlist-add-item${isWatched ? " watched" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(it.trading_code)}
              >
                <span className="watchlist-add-code">{it.trading_code}</span>
                <span className="watchlist-add-name">{it.company_name ?? ""}</span>
                <span className={`watchlist-add-badge ${isWatched ? "done" : "add"}`}>
                  {isWatched ? "✓ Added" : "+ Add"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && scores && (
        <div className="watchlist-add-empty">No match for &quot;{query}&quot;</div>
      )}
    </div>
  );
}
