"use client";

import { useMemo, useState } from "react";
import { crore, croreShares } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import StarButton from "@/components/ui/StarButton";
import { DataTable, Th, StockIdent, Price, Change } from "@/components/ui/Table";
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

/**
 * Top 30 traded stocks, ranked by the axis tab above the table. The tabs are the
 * sort control (one axis, always descending), so the headers are plain — the
 * active header just wears aria-sort for assistive tech.
 */
export default function DseTodayTable({ rows }: { rows: DseTodayTableItem[] }) {
  const [axis, setAxis] = useState<Axis>("volume");

  const sorted = useMemo(
    () => sortBy(rows, axis).slice(0, TOP_N),
    [rows, axis],
  );

  if (!rows || rows.length === 0) return null;

  const sortedBy = (key: Axis) => (axis === key ? ("descending" as const) : ("none" as const));

  return (
    <section className="mb-6">
      <div className="section-rule-modern">
        <span className="section-rule-text">Top 30 by {AXES.find((a) => a.key === axis)?.label}</span>
      </div>

      {/* Sort tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Rank by">
        {AXES.map((a) => (
          <Button
            key={a.key}
            variant="tab"
            active={a.key === axis}
            aria-pressed={a.key === axis}
            onClick={() => setAxis(a.key)}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <DataTable>
        <thead>
          <tr>
            <Th align="right">#</Th>
            <Th srLabel="Watchlist" />
            <Th>Stock</Th>
            <Th secondary>Sector</Th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("price")}>Price</th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("change")}>Today</th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("volume")}>Volume</th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("value")}>Value</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.trading_code}>
              <td data-cell="rank">{i + 1}</td>

              <td data-cell="star">
                <StarButton code={r.trading_code} />
              </td>

              <td data-cell="ident">
                <StockIdent code={r.trading_code} name={r.company_name} />
              </td>

              <td data-secondary className="dt-muted">
                {r.sector ?? "—"}
              </td>

              <td data-cell="price" className="dt-num">
                <Price value={r.ltp} />
              </td>

              <td data-cell="change" className="dt-num">
                <Change value={r.change_pct} />
              </td>

              <td data-cell="meta" data-label="Volume" className="dt-num nums">
                {r.volume != null ? croreShares(r.volume) : "—"}
              </td>

              <td data-cell="meta" data-label="Value" className="dt-num nums">
                {r.value_mn != null ? crore(r.value_mn) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <p className="mt-2 text-xs text-text-muted">
        Showing top {Math.min(TOP_N, sorted.length)} of {rows.length} traded stocks · tap a code to open the stock page.
      </p>
    </section>
  );
}
