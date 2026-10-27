"use client";

import { useMemo, useState } from "react";
import { crore, croreShares } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import StarButton from "@/components/ui/StarButton";
import { DataTable, Th, StockIdent, Price, Change } from "@/components/ui/Table";
import type { DseTodayTableItem } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { croreBn, sectorBn } from "@/lib/bn";

type Axis = "volume" | "value" | "price" | "change";

const AXES: { key: Axis; label: string; labelBn: string }[] = [
  { key: "volume", label: "Shares traded", labelBn: "শেয়ার হাতবদল" },
  { key: "value",  label: "Value traded",  labelBn: "লেনদেনের পরিমাণ" },
  { key: "price",  label: "Price",         labelBn: "দাম" },
  { key: "change", label: "Change %",      labelBn: "পরিবর্তন %" },
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
  const { lang } = useLang();
  const bn = lang === "bn";

  const sorted = useMemo(
    () => sortBy(rows, axis).slice(0, TOP_N),
    [rows, axis],
  );

  if (!rows || rows.length === 0) return null;

  const sortedBy = (key: Axis) => (axis === key ? ("descending" as const) : ("none" as const));

  return (
    <section className="mb-6">
      <SectionHeader
        title={
          <T
            en={`Top 30 by ${AXES.find((a) => a.key === axis)?.label.toLowerCase()}`}
            bn={`${AXES.find((a) => a.key === axis)?.labelBn} অনুযায়ী শীর্ষ 30`}
          />
        }
        className="mt-8"
      />

      {/* Sort tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={bn ? "যা দিয়ে সাজাবেন" : "Rank by"}>
        {AXES.map((a) => (
          <Button
            key={a.key}
            variant="tab"
            active={a.key === axis}
            aria-pressed={a.key === axis}
            onClick={() => setAxis(a.key)}
          >
            <T en={a.label} bn={a.labelBn} />
          </Button>
        ))}
      </div>

      <DataTable>
        <thead>
          <tr>
            <Th align="right">#</Th>
            <Th srLabel={bn ? "ওয়াচলিস্ট" : "Watchlist"} />
            <Th><T en="Share" bn="শেয়ার" /></Th>
            <Th secondary><T en="Sector" bn="সেক্টর" /></Th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("price")}><T en="Price" bn="দাম" /></th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("change")}><T en="Today" bn="আজ" /></th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("volume")}><T en="Shares" bn="শেয়ার" /></th>
            <th scope="col" className="dt-num" aria-sort={sortedBy("value")}><T en="Value" bn="মূল্য" /></th>
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
                {r.sector ? <T en={r.sector} bn={sectorBn(r.sector)} /> : "—"}
              </td>

              <td data-cell="price" className="dt-num">
                <Price value={r.ltp} />
              </td>

              <td data-cell="change" className="dt-num">
                <Change value={r.change_pct} />
              </td>

              <td data-cell="meta" data-label={bn ? "শেয়ার" : "Shares"} className="dt-num nums">
                {r.volume != null ? (
                  <T en={croreShares(r.volume)} bn={croreShares(r.volume).replace(" Cr", " কোটি")} />
                ) : (
                  "—"
                )}
              </td>

              <td data-cell="meta" data-label={bn ? "মূল্য" : "Value"} className="dt-num nums">
                {r.value_mn != null ? <T en={crore(r.value_mn)} bn={croreBn(r.value_mn)} /> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <p className="mt-2 text-xs text-text-muted">
        <T
          en={`Showing the top ${Math.min(TOP_N, sorted.length)} of ${rows.length} traded shares. Tap a code to open its page.`}
          bn={`লেনদেন হওয়া ${rows.length}টি শেয়ারের মধ্যে শীর্ষ ${Math.min(TOP_N, sorted.length)}টি দেখানো হচ্ছে। কোডে চাপ দিলে শেয়ারের পেজ খুলবে।`}
        />
      </p>
    </section>
  );
}
