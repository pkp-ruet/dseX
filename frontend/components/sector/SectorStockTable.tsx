"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import StarButton from "@/components/ui/StarButton";
import { pct, taka } from "@/lib/formatters";
import type { SectorStockRow } from "@/lib/api";

type SortCol = "score" | "trading_code" | "ltp" | "change_pct" | "return_7d_pct" | "pe" | "div_yield_pct";

const COLUMNS: { col: SortCol; label: string; align: "left" | "right" }[] = [
  { col: "trading_code", label: "Stock", align: "left" },
  { col: "score", label: "Score", align: "right" },
  { col: "ltp", label: "Price", align: "right" },
  { col: "change_pct", label: "Today", align: "right" },
  { col: "return_7d_pct", label: "7 days", align: "right" },
  { col: "pe", label: "P/E", align: "right" },
  { col: "div_yield_pct", label: "Yield", align: "right" },
];

function changeColor(v: number | null) {
  if (v == null) return "var(--text-muted)";
  return v > 0 ? "var(--positive)" : v < 0 ? "var(--negative)" : "var(--text-muted)";
}

function signedPct(v: number | null, decimals = 2) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${pct(v, decimals)}`;
}

/**
 * Every company in the sector, sortable. Score-descending by default, which is
 * the same order the rankings page uses.
 *
 * Rows with no score sort last whichever direction is picked — an unscored
 * company isn't "worst", it's unmeasured.
 */
export default function SectorStockTable({
  stocks,
  sectorName,
}: {
  stocks: SectorStockRow[];
  sectorName: string;
}) {
  const [sort, setSort] = useState<SortCol>("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const rows = [...stocks];
    rows.sort((a, b) => {
      if (sort === "trading_code") {
        const cmp = a.trading_code.localeCompare(b.trading_code);
        return dir === "asc" ? cmp : -cmp;
      }
      const av = a[sort] as number | null;
      const bv = b[sort] as number | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [stocks, sort, dir]);

  function onSort(col: SortCol) {
    if (col === sort) {
      setDir(dir === "asc" ? "desc" : "asc");
      return;
    }
    setSort(col);
    setDir(col === "trading_code" ? "asc" : "desc");
  }

  return (
    <section className="mb-8" id="companies">
      <div className="section-rule-modern">
        <span className="section-rule-text">
          All {stocks.length} {sectorName} Companies
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[660px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              {COLUMNS.map((c) => {
                const active = sort === c.col;
                return (
                  <th
                    key={c.col}
                    onClick={() => onSort(c.col)}
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                    className={`cursor-pointer select-none px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.13em] hover:text-[var(--primary)] ${
                      c.align === "right" ? "text-right" : "text-left"
                    }`}
                    style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}
                  >
                    {c.label}
                    <span className="ml-0.5 opacity-70">
                      {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                );
              })}
              <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Signal
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.trading_code} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <StarButton code={s.trading_code} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/stock/${s.trading_code}`}
                          className="font-display text-[0.9rem] font-extrabold tracking-tight text-[var(--text)] hover:text-[var(--primary)]"
                        >
                          {s.trading_code}
                        </Link>
                        {s.tier && <TierPill tier={s.tier} />}
                        {s.stale_data && (
                          <span
                            title="Latest financials are more than two years old"
                            className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]"
                          >
                            stale
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 max-w-[190px] truncate text-[0.72rem] font-semibold text-[var(--text-muted)]">
                        {s.company_name || "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-[0.86rem] font-extrabold tabular-nums text-[var(--text)]">
                  {s.score != null ? s.score.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[0.84rem] font-bold tabular-nums text-[var(--text)]">
                  {s.ltp != null ? taka(s.ltp) : "—"}
                </td>
                <td
                  className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums"
                  style={{ color: changeColor(s.change_pct) }}
                >
                  {signedPct(s.change_pct)}
                </td>
                <td
                  className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums"
                  style={{ color: changeColor(s.return_7d_pct) }}
                >
                  {signedPct(s.return_7d_pct, 1)}
                </td>
                <td className="px-3 py-2.5 text-right text-[0.82rem] font-semibold tabular-nums text-[var(--text-muted)]">
                  {s.pe != null ? s.pe.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums text-[var(--text)]">
                  {s.div_yield_pct ? pct(s.div_yield_pct, 1) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <SignalChip
                    signal={s.signal?.signal}
                    strength={s.signal?.strength}
                    reason={s.signal?.reason_en}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-[0.72rem] font-semibold text-[var(--text-muted)]">
        Score is the DSEF fundamental rating out of 100 — it measures company strength, not
        whether the price is about to move. Tap any column heading to re-sort.
      </p>
    </section>
  );
}
