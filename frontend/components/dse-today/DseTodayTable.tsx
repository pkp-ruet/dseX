"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { crore, croreShares, signed, taka } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { DseTodayTableItem } from "@/lib/api";

type Axis = "volume" | "value" | "price" | "change";

const AXES: { key: Axis; label: string }[] = [
  { key: "volume", label: "Volume" },
  { key: "value",  label: "Value" },
  { key: "price",  label: "Price" },
  { key: "change", label: "Change %" },
];

const TOP_N = 30;

function sortBy(rows: DseTodayTableItem[], axis: Axis): DseTodayTableItem[] {
  const pick = (r: DseTodayTableItem): number => {
    switch (axis) {
      case "volume": return r.volume ?? -Infinity;
      case "value":  return r.value_mn ?? -Infinity;
      case "price":  return r.ltp ?? -Infinity;
      case "change": return r.change_pct ?? -Infinity;
    }
  };
  return [...rows].sort((a, b) => pick(b) - pick(a));
}

export default function DseTodayTable({ rows }: { rows: DseTodayTableItem[] }) {
  const [axis, setAxis] = useState<Axis>("volume");

  const sorted = useMemo(
    () => sortBy(rows, axis).slice(0, TOP_N),
    [rows, axis],
  );

  if (!rows || rows.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="section-rule-modern">
        <span className="section-rule-text">Top 30 by {AXES.find((a) => a.key === axis)?.label}</span>
      </div>

      {/* Sort tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {AXES.map((a) => (
          <Button
            key={a.key}
            variant="tab"
            size="sm"
            active={a.key === axis}
            onClick={() => setAxis(a.key)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                <th className="px-3 py-2.5 w-10 text-right">#</th>
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Company</th>
                <th className="px-3 py-2.5 hidden sm:table-cell">Sector</th>
                <th className="px-3 py-2.5 text-right">LTP</th>
                <th className="px-3 py-2.5 text-right">Chg %</th>
                <th className="px-3 py-2.5 text-right">Volume</th>
                <th className="px-3 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const hasChg = r.change_pct != null;
                const upChg = (r.change_pct ?? 0) >= 0;
                const chgColor = upChg ? "var(--positive)" : "var(--negative)";
                return (
                  <tr
                    key={r.trading_code}
                    className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <td className="px-3 py-2.5 text-right">
                      <span className="fr-rank-pill">{i + 1}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link prefetch={false} href={`/stock/${r.trading_code}`} className="ticker-tag text-[11px]">
                        {r.trading_code}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell max-w-[220px] truncate text-[var(--text-muted)]">
                      {r.company_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell max-w-[140px] truncate text-[var(--text-muted)]">
                      {r.sector ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--text)]">
                      {r.ltp != null ? taka(r.ltp) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {hasChg ? (
                        <span
                          className="inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                          style={{ color: chgColor, background: `color-mix(in srgb, ${chgColor} 10%, transparent)` }}
                        >
                          {signed(r.change_pct, 2)}%
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text)]">
                      {r.volume != null ? croreShares(r.volume) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text)]">
                      {r.value_mn != null ? crore(r.value_mn) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        Showing top {Math.min(TOP_N, sorted.length)} of {rows.length} traded stocks · tap a code to open the stock page.
      </p>
    </section>
  );
}
