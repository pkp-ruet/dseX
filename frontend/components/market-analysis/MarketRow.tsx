import type { CSSProperties, ReactNode } from "react";
import StockRow from "@/components/ui/StockRow";
import { SectorIcon, sectorIconKey } from "@/lib/sector-icons";
import { PersonalMark } from "./PersonalCodes";

export type RowTone = "pos" | "neg" | "neutral" | "accent";

/**
 * The market-analysis stock row — a thin wrapper over the app-wide `StockRow`
 * that supplies the stroked sector tile as the leading slot, the reader's
 * H / ★ `PersonalMark` beside the code, and the coloured meta pill on the
 * right. Company name leads, code small beside it, price via `money()`.
 *
 * `accent` is any CSS colour (or var) — it tints the tile and the pill.
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
  /** Optional detail line under the name (e.g. "record 20 Sep · buy by 15 Sep"). */
  sub?: ReactNode;
  tone?: RowTone;
  accent?: string;
}) {
  const hasIcon = sectorIconKey(sector) != null;
  return (
    <StockRow
      as="div"
      inset="bleed"
      code={code}
      name={name}
      style={{ "--row-accent": accent } as CSSProperties}
      leading={
        <span className="ms-srow-tkr" aria-hidden="true">
          {hasIcon ? <SectorIcon sector={sector} size={20} /> : code.charAt(0)}
        </span>
      }
      mark={<PersonalMark code={code} />}
      detail={sub}
      price={price ?? undefined}
      trailing={<span className={`ms-srow-meta ms-srow-meta--${tone}`}>{meta}</span>}
    />
  );
}
