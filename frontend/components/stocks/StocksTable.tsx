"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import { getTier, TIER_LABELS } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";
import type { ScoreItem } from "@/lib/api";

type SortCol =
  | "trading_code"
  | "company_name"
  | "sector"
  | "market_category"
  | "ltp"
  | "change_pct"
  | "eps"
  | "div_yield_pct";

const TIER_PILL: Record<string, { bg: string; color: string; border: string }> = {
  strong_buy:    { bg: "rgba(20,83,45,0.10)",    color: "#14532D", border: "1px solid rgba(20,83,45,0.42)"   },
  good_buy:      { bg: "rgba(34,197,94,0.10)",   color: "#166534", border: "1px solid rgba(34,197,94,0.55)" },
  safe_buy:      { bg: "rgba(30,64,175,0.09)",   color: "#1E40AF", border: "1px solid rgba(30,64,175,0.38)" },
  cautious_buy:  { bg: "rgba(91,33,182,0.09)",   color: "#5B21B6", border: "1px solid rgba(91,33,182,0.38)" },
  keep_watching: { bg: "rgba(146,64,14,0.10)",   color: "#92400E", border: "1px solid rgba(146,64,14,0.42)" },
  avoid:         { bg: "rgba(153,27,27,0.08)",   color: "#991B1B", border: "1px solid rgba(153,27,27,0.38)" },
};

function chgColor(v: number | null) {
  if (v == null) return "var(--ink-muted)";
  return v > 0 ? "#059669" : v < 0 ? "#DC2626" : "var(--ink-muted)";
}
function fmtChg(v: number | null) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${pct(v)}`;
}

interface SortHeaderProps {
  col: SortCol;
  label: string;
  active: SortCol;
  dir: "asc" | "desc";
  onSort: (col: SortCol) => void;
  className?: string;
}
function SortHeader({ col, label, active, dir, onSort, className }: SortHeaderProps) {
  const isActive = active === col;
  return (
    <th
      className={`sl-th sl-th-sortable${className ? " " + className : ""}${isActive ? " sl-th-active" : ""}`}
      onClick={() => onSort(col)}
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <span className="sl-sort-icon">{isActive ? (dir === "asc" ? " ↑" : " ↓") : " ↕"}</span>
    </th>
  );
}

interface Props {
  items: ScoreItem[];
}

const CATEGORIES = ["A", "B", "N", "Z"] as const;

export default function StocksTable({ items }: Props) {
  const [search, setSearch] = useState("");
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("trading_code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sectors = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) if (i.sector) s.add(i.sector);
    return Array.from(s).sort();
  }, [items]);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir(col === "trading_code" || col === "company_name" || col === "sector" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(() => {
    let r = [...items];
    const q = search.trim().toLowerCase();
    if (q) r = r.filter(i =>
      i.trading_code.toLowerCase().includes(q) ||
      (i.company_name ?? "").toLowerCase().includes(q)
    );
    if (activeSector) r = r.filter(i => i.sector === activeSector);
    if (activeCategory) r = r.filter(i => i.market_category === activeCategory);

    r.sort((a, b) => {
      let av: string | number | null = a[sortCol] ?? null;
      let bv: string | number | null = b[sortCol] ?? null;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return r;
  }, [items, search, activeSector, activeCategory, sortCol, sortDir]);

  return (
    <div className="sl-wrap">
      {/* Controls */}
      <div className="sl-controls">
        <input
          className="sl-search"
          type="search"
          placeholder="Search code or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search stocks"
        />

        <select
          className="sl-sector-select"
          value={activeSector ?? ""}
          onChange={e => setActiveSector(e.target.value || null)}
        >
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="sl-cat-group">
          <button
            className={`sl-cat-pill${activeCategory === null ? " sl-cat-pill--active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >All</button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`sl-cat-pill${activeCategory === cat ? " sl-cat-pill--active" : ""}`}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            >{cat}</button>
          ))}
        </div>

        <span className="sl-count">{filtered.length} stocks</span>
      </div>

      {/* Table */}
      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead className="sl-thead">
            <tr>
              <th className="sl-th sl-th-rank">#</th>
              <th className="sl-th sl-th-star sl-th-hide-sm" aria-label="Watchlist"></th>
              <SortHeader col="trading_code"   label="Code"      active={sortCol} dir={sortDir} onSort={handleSort} />
              <SortHeader col="company_name"   label="Company"   active={sortCol} dir={sortDir} onSort={handleSort} className="sl-th-hide-sm" />
              <SortHeader col="sector"         label="Sector"    active={sortCol} dir={sortDir} onSort={handleSort} className="sl-th-hide-md" />
              <SortHeader col="market_category" label="Cat"      active={sortCol} dir={sortDir} onSort={handleSort} className="sl-th-hide-lg" />
              <SortHeader col="ltp"            label="LTP"       active={sortCol} dir={sortDir} onSort={handleSort} className="sl-th-num" />
              <SortHeader col="eps"            label="EPS"       active={sortCol} dir={sortDir} onSort={handleSort} className="sl-th-num sl-th-hide-sm" />
              <SortHeader col="div_yield_pct"  label="Div Yield" active={sortCol} dir={sortDir} onSort={handleSort} className="sl-th-num sl-th-hide-md" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const tier = getTier(item.score);
              const pill = TIER_PILL[tier];
              return (
                <tr key={item.trading_code} className="sl-row">
                  <td className="sl-td sl-td-rank">{idx + 1}</td>

                  <td className="sl-td sl-td-star sl-td-hide-sm">
                    <StarButton code={item.trading_code} />
                  </td>

                  <td className="sl-td sl-td-code">
                    <Link
                      href={`/stock/${item.trading_code}`}
                      className="sl-ticker-pill"
                      style={{ background: pill.bg, color: pill.color, border: pill.border }}
                    >
                      {item.trading_code}
                    </Link>
                  </td>

                  <td className="sl-td sl-td-company sl-td-hide-sm">
                    <div className="sl-cell-trunc">
                      <Link href={`/stock/${item.trading_code}`} className="sl-company-link">
                        {item.company_name ?? item.trading_code}
                      </Link>
                    </div>
                  </td>

                  <td className="sl-td sl-td-sector sl-td-hide-md">
                    <div className="sl-cell-trunc">
                      {item.sector ?? "—"}
                    </div>
                  </td>

                  <td className="sl-td sl-td-cat sl-td-hide-lg">
                    {item.market_category ?? "—"}
                  </td>

                  <td className="sl-td sl-td-num">
                    {item.ltp != null ? taka(item.ltp) : "—"}
                  </td>

                  <td className="sl-td sl-td-num sl-td-hide-sm">
                    {item.eps != null ? item.eps.toFixed(2) : "—"}
                  </td>

                  <td className="sl-td sl-td-num sl-td-hide-md">
                    {item.div_yield_pct != null ? pct(item.div_yield_pct, 1) : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="sl-empty">No stocks match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
