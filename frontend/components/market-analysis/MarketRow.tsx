import type { CSSProperties } from "react";
import Link from "next/link";
import { taka } from "@/lib/formatters";
import { sectorIcon } from "@/lib/sector-icons";

export type RowTone = "pos" | "neg" | "neutral" | "accent";

/**
 * One impactful stock row, shared across the market-analysis opportunity and
 * watch cards: a sector-icon tile, a bold code with the company name beneath,
 * and the last price + a coloured meta pill on the right.
 *
 * `accent` is any CSS colour (or var) — it tints the tile and the hover.
 */
export default function MarketRow({
  code,
  name,
  sector,
  price,
  meta,
  tone = "neutral",
  accent = "var(--primary)",
}: {
  code: string;
  name?: string | null;
  sector?: string | null;
  price?: number | null;
  meta: string;
  tone?: RowTone;
  accent?: string;
}) {
  const icon = sectorIcon(sector);
  return (
    <Link
      className="ms-srow"
      href={`/stock/${code}`}
      style={{ "--row-accent": accent } as CSSProperties}
    >
      <span className={`ms-srow-tkr${icon ? " ms-srow-tkr--icon" : ""}`} aria-hidden="true">
        {icon ?? code.charAt(0)}
      </span>
      <span className="ms-srow-id">
        <span className="ms-srow-code">{code}</span>
        {name && <span className="ms-srow-name">{name}</span>}
      </span>
      <span className="ms-srow-right">
        {price != null && <span className="ms-srow-price">{taka(price)}</span>}
        <span className={`ms-srow-meta ms-srow-meta--${tone}`}>{meta}</span>
      </span>
    </Link>
  );
}
