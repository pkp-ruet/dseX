"use client";

import { useEffect, useMemo, useState } from "react";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { TIER_LABELS, TIER_VAR, type TierKey } from "@/lib/constants";
import Chip from "@/components/ui/Chip";
import FullRankTable, {
  type RankSort,
  type RankSortCol,
  type RankedItem,
  type RankedRow,
} from "@/components/ranking/FullRankTable";

const TIERS_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

const SORT_COLS: RankSortCol[] = ["rank", "name", "value", "growth", "dividend"];
const DEFAULT_SORT: RankSort = { col: "rank", dir: "asc" };

/** Phone sort menu — the column headers are hidden below 640px. */
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "rank-asc", label: "Score: strongest first" },
  { value: "rank-desc", label: "Score: weakest first" },
  { value: "value-desc", label: "Price today: best value first" },
  { value: "growth-desc", label: "Profit growth: highest first" },
  { value: "dividend-desc", label: "Dividend: highest first" },
  { value: "name-asc", label: "Name: A to Z" },
];

interface Props {
  items: RankedItem[];
  counts: Record<string, number>;
  total: number;
  sectors: string[];
}

/** The number a sortable column orders by; null always sorts last. */
function sortValue(row: RankedRow, col: RankSortCol): number | string | null {
  const i = row.item;
  switch (col) {
    case "rank":
      return row.rank;
    case "name":
      return (i.company_name ?? i.trading_code).toUpperCase();
    case "value":
      return i.p4_val ?? null;
    case "growth":
      return i.eps_yoy_pct ?? null;
    case "dividend":
      return i.div_yield_pct ?? null;
  }
}

export default function RankingExplorer({ items, counts, total, sectors }: Props) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  // Empty = every grade shown. Picking chips narrows to just those grades.
  const [picked, setPicked] = useState<Set<TierKey>>(() => new Set());
  const [sort, setSort] = useState<RankSort>(DEFAULT_SORT);

  // ---- URL ⇄ state: ?q=…&sector=…&tiers=excellent,good&sort=growth&dir=desc ----
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
      const chosen = tiers
        .split(",")
        .filter((t): t is TierKey => (TIERS_ORDER as string[]).includes(t));
      if (chosen.length > 0 && chosen.length < TIERS_ORDER.length) setPicked(new Set(chosen));
    }
    const col = urlParams.get("sort");
    if (col && (SORT_COLS as string[]).includes(col)) {
      setSort({ col: col as RankSortCol, dir: urlParams.get("dir") === "asc" ? "asc" : "desc" });
    }
    setUrlReady(true);
  }, [urlParams, sectors]);
  const isDefaultSort = sort.col === DEFAULT_SORT.col && sort.dir === DEFAULT_SORT.dir;
  useUrlSync(
    {
      q: query.trim() || null,
      sector: sector === "all" ? null : sector,
      tiers: picked.size === 0 ? null : TIERS_ORDER.filter((t) => picked.has(t)).join(","),
      sort: isDefaultSort ? null : sort.col,
      dir: isDefaultSort ? null : sort.dir,
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
    const rows = ranked.filter(({ item }) => {
      if (picked.size > 0 && !picked.has(item.tier)) return false;
      if (sector !== "all" && item.sector !== sector) return false;
      if (q) {
        const code = item.trading_code.toUpperCase();
        const name = (item.company_name ?? "").toUpperCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
    if (isDefaultSort) return rows;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = sortValue(a, sort.col);
      const vb = sortValue(b, sort.col);
      if (va == null && vb == null) return a.rank - b.rank;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va === vb) return a.rank - b.rank;
      return (va < vb ? -1 : 1) * sign;
    });
  }, [ranked, query, sector, picked, sort, isDefaultSort]);

  const toggleTier = (tier: TierKey) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      // Every grade picked is the same as none picked — keep the URL clean.
      return next.size === TIERS_ORDER.length ? new Set() : next;
    });
  };

  // First tap on a column sorts its natural way (names A–Z, numbers high
  // first, rank strongest first); a second tap flips it.
  const onSort = (col: RankSortCol) => {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "rank" || col === "name" ? "asc" : "desc" }
    );
  };

  const isFiltered =
    query.trim() !== "" || sector !== "all" || picked.size > 0 || !isDefaultSort;

  const reset = () => {
    setQuery("");
    setSector("all");
    setPicked(new Set());
    setSort(DEFAULT_SORT);
  };

  return (
    <div className="rk-explorer">
      <div className="rk-filters">
        <div className="rk-filter-row">
          <div className="rk-chips" role="group" aria-label="Filter by grade">
            {TIERS_ORDER.map((tier) => (
              <Chip
                key={tier}
                active={picked.has(tier)}
                onClick={() => toggleTier(tier)}
                icon={<span className="rk-dot" style={{ background: TIER_VAR[tier] }} />}
                aria-label={`${TIER_LABELS[tier]}: ${counts[tier] ?? 0} companies`}
              >
                {TIER_LABELS[tier]}
                <span className="nums font-normal opacity-80">{counts[tier] ?? 0}</span>
              </Chip>
            ))}
          </div>

          <div className="rk-search">
            <svg className="rk-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              id="rank-search"
              type="search"
              className="rk-search-input"
              placeholder="Search company or code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search companies"
            />
          </div>

          <select
            className="rk-select"
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

          <select
            className="rk-select rk-sort-select"
            value={`${sort.col}-${sort.dir}`}
            onChange={(e) => {
              const [col, dir] = e.target.value.split("-");
              setSort({ col: col as RankSortCol, dir: dir === "asc" ? "asc" : "desc" });
            }}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* How the market splits across the four grades — a key, not a control */}
        <div className="rk-split-row">
          <div className="rk-split" aria-hidden>
            {TIERS_ORDER.map((tier) => (
              <span
                key={tier}
                className={`rk-split-seg${picked.size > 0 && !picked.has(tier) ? " is-dim" : ""}`}
                style={{ flexGrow: counts[tier] ?? 0, background: TIER_VAR[tier] }}
              />
            ))}
          </div>
          <span className="rk-showing nums">
            Showing <strong>{filtered.length}</strong> of {total}
          </span>
          {isFiltered && (
            <button type="button" className="rk-reset" onClick={reset}>
              Reset
            </button>
          )}
        </div>
      </div>

      <FullRankTable rows={filtered} grouped={isDefaultSort} sort={sort} onSort={onSort} />
    </div>
  );
}
