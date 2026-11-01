"use client";

import { DataTable, SortTh, StockIdent, Price, Change, Th } from "@/components/ui/Table";
import StarButton from "@/components/ui/StarButton";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import type { ScreenerFilterDef, ScreenerSpec } from "@/lib/api";
import { cell, headUnit, type ScreenerRow } from "@/lib/screener";

/** Phones show this many figure lines on a card; the rest stay on wider screens. */
const PHONE_FIGURES = 3;
/** Every cell stays on one line, so narrower screens show fewer figure
 *  columns rather than run past the card: one from 640px, two from 768px,
 *  four from 1024px, five from 1280px. Phones are cards and keep their lines. */
const colClass = (i: number) => (i >= 4 ? "scr-wider" : i >= 2 ? "scr-wide" : i >= 1 ? "scr-mid" : "");
/** Rows per "Show more". */
export const PAGE = 50;

/**
 * The screen's result: one row per share — company, price, today's change,
 * then the order's figure and every figure the screen filters on (then P/E,
 * yield and size until there are four, at most five). Every header sorts.
 * Below 640px each row is a card (`.data-table`), the figures as captioned
 * lines. `limit` rows, then "Show more".
 */
export default function ScreenerTable({
  rows,
  columns,
  defs,
  spec,
  limit,
  onSort,
  onMore,
  bn,
}: {
  rows: ScreenerRow[];
  /** Filter keys shown after price and today's change. */
  columns: string[];
  defs: Map<string, ScreenerFilterDef>;
  spec: ScreenerSpec;
  limit: number;
  onSort: (key: string) => void;
  onMore: () => void;
  bn: boolean;
}) {
  const shown = rows.slice(0, limit);
  const left = rows.length - shown.length;
  const head = (k: string) => {
    const d = defs.get(k);
    if (!d) return k;
    const ue = headUnit(d), ub = headUnit(d, true);
    return <T en={ue ? `${d.short_en} (${ue})` : d.short_en} bn={ub ? `${d.short_bn} (${ub})` : d.short_bn} />;
  };

  return (
    <>
      <DataTable className="scr-table">
        <thead>
          <tr>
            <Th srLabel={bn ? "অনুসরণ" : "Follow"} />
            <SortTh col="name" label={<T en="Company" bn="কোম্পানি" />} active={spec.sort} dir={spec.dir} onSort={onSort} />
            <SortTh col="price" label={head("price")} active={spec.sort} dir={spec.dir} onSort={onSort} align="right" />
            <SortTh col="change" label={head("change")} active={spec.sort} dir={spec.dir} onSort={onSort} align="right" />
            {columns.map((k, i) => (
              <SortTh key={k} col={k} label={head(k)} active={spec.sort} dir={spec.dir} onSort={onSort} align="right"
                secondary={i >= PHONE_FIGURES} className={colClass(i)} />
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.code}>
              <td data-cell="star"><StarButton code={r.code} /></td>
              <td data-cell="ident">
                <StockIdent code={r.code} name={r.name}>
                  {r.v.sector ? <span className="dt-name">{String(r.v.sector)}</span> : null}
                </StockIdent>
              </td>
              <td data-cell="price" className="dt-num"><Price value={r.v.price as number | null} /></td>
              <td data-cell="change" className="dt-num"><Change value={r.v.change as number | null} /></td>
              {columns.map((k, i) => {
                const d = defs.get(k);
                if (!d) return null;
                const v = r.v[k];
                return (
                  <td
                    key={k}
                    data-cell="meta"
                    data-label={headUnit(d, bn) ? `${bn ? d.short_bn : d.short_en} (${headUnit(d, bn)})` : bn ? d.short_bn : d.short_en}
                    className={`dt-num nums ${colClass(i)}${spec.sort === k ? " font-bold text-text-main" : ""}`}
                    {...(i >= PHONE_FIGURES ? { "data-secondary": "" } : {})}
                  >
                    {cell(v, d, bn)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </DataTable>
      {left > 0 && (
        <div className="mt-3 flex justify-center">
          <Button variant="quiet" onClick={onMore}>
            <T en={`Show ${Math.min(left, PAGE)} more of ${left}`} bn={`আরও ${Math.min(left, PAGE)}টি দেখুন (বাকি ${left}টি)`} />
          </Button>
        </div>
      )}
    </>
  );
}
