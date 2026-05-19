"use client";

import { useEffect, useState } from "react";
import {
  getScores,
  getMarketMovers,
  type ScoresResponse,
  type MarketMoversData,
} from "@/lib/api";
import { setWatchlist, getCachedWatchlist } from "@/lib/watchlist";

export default function EmptyStateActions() {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [movers, setMovers] = useState<MarketMoversData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sector, setSector] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getScores(), getMarketMovers()]).then(([s, m]) => {
      if (cancelled) return;
      if (s.status === "fulfilled") setScores(s.value);
      if (m.status === "fulfilled") setMovers(m.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sectors = (() => {
    if (!scores) return [];
    const set = new Set<string>();
    for (const tier of Object.values(scores.tiers)) {
      for (const it of tier) {
        if (it.sector) set.add(it.sector);
      }
    }
    return Array.from(set).sort();
  })();

  async function addCodes(codes: string[], key: string) {
    setBusy(key);
    const existing = getCachedWatchlist();
    const merged = Array.from(new Set([...existing, ...codes.map((c) => c.toUpperCase())]));
    await setWatchlist(merged);
    setBusy(null);
  }

  async function handleStrongBuy() {
    if (!scores) return;
    const picks = scores.tiers.strong_buy.slice(0, 5).map((it) => it.trading_code);
    if (picks.length) await addCodes(picks, "sb");
  }

  async function handleMovers() {
    if (!movers) return;
    const picks = movers.gainers.slice(0, 5).map((it) => it.trading_code);
    if (picks.length) await addCodes(picks, "mv");
  }

  async function handleSector() {
    if (!scores || !sector) return;
    const flat = Object.values(scores.tiers).flat();
    const picks = flat
      .filter((it) => it.sector === sector)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3)
      .map((it) => it.trading_code);
    if (picks.length) await addCodes(picks, "sc");
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
      <button
        type="button"
        onClick={handleStrongBuy}
        disabled={!scores || busy === "sb"}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--primary)] hover:shadow-md transition-all disabled:opacity-50"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] mb-1">
          Top quality
        </div>
        <div className="text-sm font-semibold text-[var(--ink)]">Add Strong-Buy 5</div>
        <div className="text-xs text-[var(--ink-muted)] mt-1">
          Best 5 from the DSEF leaderboard
        </div>
        {busy === "sb" && <div className="mt-2 text-xs text-[var(--ink-muted)]">Adding…</div>}
      </button>

      <button
        type="button"
        onClick={handleMovers}
        disabled={!movers || busy === "mv"}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-left hover:border-[var(--primary)] hover:shadow-md transition-all disabled:opacity-50"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] mb-1">
          Today
        </div>
        <div className="text-sm font-semibold text-[var(--ink)]">Add Top Gainers 5</div>
        <div className="text-xs text-[var(--ink-muted)] mt-1">
          5 biggest gainers from latest session
        </div>
        {busy === "mv" && <div className="mt-2 text-xs text-[var(--ink-muted)]">Adding…</div>}
      </button>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] mb-1">
          By sector
        </div>
        <div className="text-sm font-semibold text-[var(--ink)] mb-2">Add top 3 from…</div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--ink)] px-2 py-1 mb-2"
        >
          <option value="">Choose sector…</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSector}
          disabled={!sector || busy === "sc"}
          className="text-xs px-3 py-1 rounded bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
        >
          {busy === "sc" ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
