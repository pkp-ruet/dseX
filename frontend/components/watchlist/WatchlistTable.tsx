"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getScores, type ScoreItem, type ScoresResponse } from "@/lib/api";
import { getTier, TIER_LABELS, TIER_COLORS, type TierKey } from "@/lib/constants";
import { taka } from "@/lib/formatters";
import { getWatchlist, subscribeWatchlist, addToWatchlist } from "@/lib/watchlist";
import StarButton from "@/components/ui/StarButton";
import WatchlistNews from "./WatchlistNews";

function flatten(scores: ScoresResponse | null): ScoreItem[] {
  if (!scores) return [];
  return Object.values(scores.tiers).flat();
}

function AddBar({ scores }: { scores: ScoresResponse | null }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [watchedCodes, setWatchedCodes] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWatchedCodes(getWatchlist());
    return subscribeWatchlist(() => setWatchedCodes(getWatchlist()));
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const all = flatten(scores);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return all
      .filter(
        (it) =>
          it.trading_code.toUpperCase().includes(q) ||
          (it.company_name ?? "").toUpperCase().includes(q)
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
          placeholder="Add company to watchlist…"
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
            onClick={() => { setQuery(""); setOpen(false); }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="watchlist-add-dropdown">
          {filtered.map((it) => {
            const watched = watchedCodes.includes(it.trading_code.toUpperCase());
            return (
              <li
                key={it.trading_code}
                className={`watchlist-add-item${watched ? " watched" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(it.trading_code)}
              >
                <span className="watchlist-add-code">{it.trading_code}</span>
                <span className="watchlist-add-name">{it.company_name ?? ""}</span>
                <span className={`watchlist-add-badge ${watched ? "done" : "add"}`}>
                  {watched ? "✓ Added" : "+ Add"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && scores && (
        <div className="watchlist-add-empty">No match for "{query}"</div>
      )}
    </div>
  );
}

export default function WatchlistTable() {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCodes(getWatchlist());
    return subscribeWatchlist(() => setCodes(getWatchlist()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getScores()
      .then((d) => {
        if (!cancelled) setScores(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const all = flatten(scores);
    const map = new Map(all.map((it) => [it.trading_code.toUpperCase(), it]));
    return codes
      .map((c) => map.get(c.toUpperCase()))
      .filter((it): it is ScoreItem => Boolean(it));
  }, [scores, codes]);

  return (
    <>
      <AddBar scores={scores} />

      {codes.length === 0 ? (
        <div className="watchlist-empty">
          <h2>Your watchlist is empty</h2>
          <p>
            Search a stock above, or click the star next to any stock on the{" "}
            <Link href="/" className="text-[var(--primary)] underline">homepage</Link> or{" "}
            <Link href="/dsestockranking" className="text-[var(--primary)] underline">leaderboard</Link>.
          </p>
        </div>
      ) : loading ? (
        <div className="watchlist-loading">Loading watchlist…</div>
      ) : error ? (
        <div className="watchlist-error">Failed to load: {error}</div>
      ) : (
        <div className="watchlist-wrap">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th></th>
                <th>Code</th>
                <th>Company</th>
                <th className="num">LTP</th>
                <th className="num">Chg %</th>
                <th className="num watchlist-th-score">Score</th>
                <th className="watchlist-th-tier">Tier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => {
                const tier: TierKey = getTier(it.score);
                const chg = it.change_pct;
                const chgCls = chg == null ? "" : chg > 0 ? "up" : chg < 0 ? "dn" : "flat";
                return (
                  <tr key={it.trading_code}>
                    <td><StarButton code={it.trading_code} /></td>
                    <td>
                      <Link href={`/stock/${it.trading_code}`} className="watchlist-ticker">
                        {it.trading_code}
                      </Link>
                    </td>
                    <td className="watchlist-company">{it.company_name ?? "—"}</td>
                    <td className="num">{it.ltp != null ? taka(it.ltp, 1) : "—"}</td>
                    <td className={`num watchlist-chg ${chgCls}`}>
                      {chg == null ? "—" : `${chg > 0 ? "+" : ""}${chg.toFixed(1)}%`}
                    </td>
                    <td className="num watchlist-score watchlist-td-score">
                      {it.score != null ? it.score.toFixed(1) : "—"}
                    </td>
                    <td className="watchlist-td-tier">
                      <span
                        className="watchlist-tier"
                        style={{ background: TIER_COLORS[tier] }}
                      >
                        {TIER_LABELS[tier]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {codes.length - rows.length > 0 && (
            <p className="watchlist-missing">
              {codes.length - rows.length} ticker{codes.length - rows.length > 1 ? "s" : ""} not found in current scores (may be delisted or unscored).
            </p>
          )}
          <WatchlistNews codes={codes} />
        </div>
      )}
    </>
  );
}
