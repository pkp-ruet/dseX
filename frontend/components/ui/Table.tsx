import type { ReactNode } from "react";
import Link from "next/link";
import { changePct, changeTone, money } from "@/lib/formatters";

/**
 * THE stock table kit — pairs with `.data-table` in app/styles/tables.css.
 *
 * Desktop renders an ordinary table; under 640px the CSS turns each row into a
 * card. Every <td> says where it belongs with `data-cell` ("rank" | "star" |
 * "ident" | "score" | "price" | "change" | "meta") and a `data-secondary` cell
 * is hidden on phones. Nothing here decides the layout in JS — the same markup
 * serves both shapes, so the server HTML is complete for crawlers.
 */

export type SortDir = "asc" | "desc";
export type CellAlign = "left" | "right";

export function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`data-table-wrap ${className}`.trim()}>
      <table className="data-table">{children}</table>
    </div>
  );
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  // Two chevrons when unsorted, one (pointing the sort way) when active.
  if (dir === null) {
    return (
      <svg className="dt-sort-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 4.5 6 2l2.5 2.5M3.5 7.5 6 10l2.5-2.5" />
      </svg>
    );
  }
  return (
    <svg className="dt-sort-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "asc" ? <path d="M3 7.5 6 4.5l3 3" /> : <path d="M3 4.5 6 7.5l3-3" />}
    </svg>
  );
}

interface SortThProps<C extends string> {
  col: C;
  label: string;
  active: C;
  dir: SortDir;
  onSort: (col: C) => void;
  align?: CellAlign;
  /** Hidden on phones (the matching <td> must carry data-secondary too). */
  secondary?: boolean;
  className?: string;
}

/** Sortable header: the <th> carries aria-sort, its content is a real button. */
export function SortTh<C extends string>({
  col, label, active, dir, onSort, align = "left", secondary = false, className = "",
}: SortThProps<C>) {
  const isActive = active === col;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`dt-sortable${align === "right" ? " dt-num" : ""}${className ? " " + className : ""}`}
      {...(secondary ? { "data-secondary": "" } : {})}
    >
      <button type="button" className="dt-sort" onClick={() => onSort(col)}>
        {label}
        <SortIcon dir={isActive ? dir : null} />
      </button>
    </th>
  );
}

interface ThProps {
  children?: ReactNode;
  align?: CellAlign;
  secondary?: boolean;
  /** Screen-reader-only label for an icon / action column. */
  srLabel?: string;
  className?: string;
}

/** Plain (non-sortable) header cell. */
export function Th({ children, align = "left", secondary = false, srLabel, className = "" }: ThProps) {
  return (
    <th
      scope="col"
      className={`${align === "right" ? "dt-num" : ""}${className ? " " + className : ""}`.trim() || undefined}
      {...(secondary ? { "data-secondary": "" } : {})}
    >
      {srLabel ? <span className="sr-only">{srLabel}</span> : children}
    </th>
  );
}

/** Code (link) + company name — the identity block of every row. */
export function StockIdent({
  code, name, after, children,
}: {
  code: string;
  name?: string | null;
  /** Chips beside the code (tier pill, signal, stale tag). */
  after?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="dt-ident-row">
        <Link prefetch={false} href={`/stock/${code}`} className="dt-code">
          {code}
        </Link>
        {after}
      </div>
      {name ? <span className="dt-name">{name}</span> : null}
      {children}
    </>
  );
}

/** Official close, printed the one app-wide way (`formatters.money`). */
export function Price({ value }: { value: number | null | undefined }) {
  return <span className="dt-price nums">{value != null ? money(value) : "—"}</span>;
}

/** Day change, printed with `changePct` and coloured with `changeTone`. */
export function Change({ value, decimals = 2 }: { value: number | null | undefined; decimals?: number }) {
  return (
    <span className={`dt-change nums ${changeTone(value)}`}>
      {value != null ? changePct(value, decimals) : "—"}
    </span>
  );
}
