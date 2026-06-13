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

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
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

      {/* Table */}
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2 hidden md:table-cell">Company</th>
              <th className="px-3 py-2 hidden sm:table-cell">Sector</th>
              <th className="px-3 py-2 text-right">LTP</th>
              <th className="px-3 py-2 text-right">Chg %</th>
              <th className="px-3 py-2 text-right">Volume</th>
              <th className="px-3 py-2 text-right">Value (Cr)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const chgColor = (r.change_pct ?? 0) >= 0 ? "var(--positive)" : "var(--negative)";
              return (
                <tr
                  key={r.trading_code}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg)] transition-colors"
                >
                  <td className="px-3 py-2 text-[var(--text-muted)] tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      prefetch={false} href={`/stock/${r.trading_code}`}
                      className="font-semibold text-[var(--text)] hover:text-[var(--accent)]"
                    >
                      {r.trading_code}
                    </Link>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-[var(--text-muted)] truncate max-w-[220px]">
                    {r.company_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell text-[var(--text-muted)] truncate max-w-[140px]">
                    {r.sector ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                    {r.ltp != null ? taka(r.ltp) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium" style={{ color: r.change_pct != null ? chgColor : "var(--text-muted)" }}>
                    {r.change_pct != null ? `${signed(r.change_pct, 2)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                    {r.volume != null ? croreShares(r.volume) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                    {r.value_mn != null ? crore(r.value_mn) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="mt-2 text-[10px] text-[var(--text-muted)]">
        Showing top {Math.min(TOP_N, sorted.length)} of {rows.length} traded stocks · click a code to view the stock page.
      </div>
    </section>
  );
}
