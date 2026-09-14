import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { money } from "@/lib/formatters";
import { SectorIcon, sectorIconKey } from "@/lib/sector-icons";
import { PersonalMark } from "./PersonalCodes";

export type RowTone = "pos" | "neg" | "neutral" | "accent";

/**
 * One impactful stock row, shared across the market-analysis opportunity,
 * watch and dividend cards: a stroked sector icon tile (no emoji — they render
 * differently on every phone), a bold code with the reader's H / ★ owner tag
 * and the company name beneath, an optional detail line, and the last price +
 * a coloured meta pill on the right.
 *
 * `accent` is any CSS colour (or var) — it tints the tile and the hover.
 */
export default function MarketRow({
  code,
  name,
  sector,
  price,
  meta,
  sub,
  tone = "neutral",
  accent = "var(--primary)",
}: {
  code: string;
  name?: string | null;
  sector?: string | null;
  price?: number | null;
  meta: string;
  /** Optional second line under the name (e.g. "record 20 Sep · buy by 15 Sep"). */
  sub?: ReactNode;
  tone?: RowTone;
  accent?: string;
}) {
  const hasIcon = sectorIconKey(sector) != null;
  return (
    <Link
      className="ms-srow"
      href={`/stock/${code}`}
      style={{ "--row-accent": accent } as CSSProperties}
    >
      <span className="ms-srow-tkr" aria-hidden="true">
        {hasIcon ? <SectorIcon sector={sector} size={20} /> : code.charAt(0)}
      </span>
      <span className="ms-srow-id">
        <span className="ms-srow-code">
          {/* the text ellipsises (.ms-srow-code-txt); the H/★ mark never gets pushed out */}
          <span className="ms-srow-code-txt">{code}</span>
          <PersonalMark code={code} />
        </span>
        {name && <span className="ms-srow-name">{name}</span>}
        {sub && <span className="ms-srow-sub">{sub}</span>}
      </span>
      <span className="ms-srow-right">
        {price != null && <span className="ms-srow-price">{money(price)}</span>}
        <span className={`ms-srow-meta ms-srow-meta--${tone}`}>{meta}</span>
      </span>
    </Link>
  );
}
