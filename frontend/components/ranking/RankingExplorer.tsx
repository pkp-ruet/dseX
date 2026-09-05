"use client";

import { useEffect, useMemo, useState } from "react";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { TIER_GRADES, TIER_LABELS, TIER_VAR, type TierKey } from "@/lib/constants";
import FullRankTable, { type RankedItem, type RankedRow } from "@/components/ranking/FullRankTable";

const TIERS_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

// Canonical token tier colors — shared with FullRankTable / ScoreBadge.
const TIER_COLOR = TIER_VAR;

interface Props {
  items: RankedItem[];
  counts: Record<string, number>;
  total: number;
  sectors: string[];
}

export default function RankingExplorer({ items, counts, total, sectors }: Props) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [activeTiers, setActiveTiers] = useState<Set<TierKey>>(
    () => new Set(TIERS_ORDER)
  );

  // ---- URL ⇄ state: ?q=…&sector=…&tiers=excellent,good ----
  // Defaults render on the server; the query string is applied once after
  // mount, then every change is mirrored back so the view is linkable.
  const urlParams = useUrlParams();
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    if (!urlParams) return;
    const q = urlParams.get("q");
    if (q) setQuery(q);
    const sec = urlParams.get("sector");
    if (sec && sectors.includes(sec)) setSector(sec);
    const tiers = urlParams.get("tiers");
    if (tiers) {
      const picked = tiers
        .split(",")
        .filter((t): t is TierKey => (TIERS_ORDER as string[]).includes(t));
      if (picked.length > 0) setActiveTiers(new Set(picked));
    }
    setUrlReady(true);
  }, [urlParams, sectors]);
  useUrlSync(
    {
      q: query.trim() || null,
      sector: sector === "all" ? null : sector,
      tiers:
        activeTiers.size === TIERS_ORDER.length
          ? null
          : TIERS_ORDER.filter((t) => activeTiers.has(t)).join(","),
    },
    urlReady
  );

  // Assign each company its stable global rank once (tier order → by score).
  const ranked = useMemo<RankedRow[]>(() => {
    const rows: RankedRow[] = [];
    let rank = 1;
    for (const tier of TIERS_ORDER) {
      for (const item of items.filter((i) => i.tier === tier)) {
        rows.push({ item, rank: rank++ });
      }
    }
    return rows;
  }, [items]);

  const filtered = useMemo<RankedRow[]>(() => {
    const q = query.trim().toUpperCase();
    return ranked.filter(({ item }) => {
      if (!activeTiers.has(item.tier)) return false;
      if (sector !== "all" && item.sector !== sector) return false;
      if (q) {
        const code = item.trading_code.toUpperCase();
        const name = (item.company_name ?? "").toUpperCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [ranked, query, sector, activeTiers]);

  const toggleTier = (tier: TierKey) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        // Don't allow turning the last tier off — keep at least one active.
        if (next.size > 1) next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const isFiltered =
    query.trim() !== "" || sector !== "all" || activeTiers.size !== TIERS_ORDER.length;

  const reset = () => {
    setQuery("");
    setSector("all");
    setActiveTiers(new Set(TIERS_ORDER));
  };

  return (
    <div className="rank-explorer">
      {/* Tier quality bar — market proportion per tier; doubles as the filter */}
      <div className="rank-qbar-wrap" role="group" aria-label="Filter by tier">
        <div className="rank-qbar">
          {TIERS_ORDER.map((tier) => {
            const count = counts[tier] ?? 0;
            const share = total > 0 ? Math.round((count / total) * 100) : 0;
            const active = activeTiers.has(tier);
            return (
              <button
                key={tier}
                type="button"
                onClick={() => toggleTier(tier)}
                aria-pressed={active}
                aria-label={`${TIER_LABELS[tier]} — ${count} companies, ${share}%${
                  active ? "" : " (hidden)"
                }`}
                className={`rank-qseg${active ? " is-active" : ""}`}
                style={{ flexGrow: count, ["--tier-color" as string]: TIER_COLOR[tier] }}
              >
                <span className="rank-qseg-grade" aria-hidden>{TIER_GRADES[tier]}</span>
                <span className="rank-qseg-count">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="rank-qbar-legend">
          {TIERS_ORDER.map((tier) => (
            <span key={tier} className="rank-qbar-legend-item">
              <b style={{ color: TIER_COLOR[tier] }}>{TIER_GRADES[tier]}</b>
              {TIER_LABELS[tier]}
            </span>
          ))}
          <span className="rank-qbar-hint">tap a band to filter</span>
        </div>
      </div>

      {/* Search + sector controls */}
      <div className="rank-controls">
        <div className="rank-search">
          <svg
            className="rank-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="rank-search-input"
            placeholder="Search code or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search companies"
          />
        </div>

        <select
          className="rank-sector-select"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label="Filter by sector"
        >
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="rank-showing">
          <span>
            Showing <strong>{filtered.length}</strong> of {total}
          </span>
          {isFiltered && (
            <button type="button" className="rank-reset" onClick={reset}>
              Reset
            </button>
          )}
        </div>
      </div>

      <FullRankTable rows={filtered} />
    </div>
  );
}
