import type { ReactNode } from "react";
import StockRow from "@/components/ui/StockRow";
import { SectorIcon, sectorIconKey } from "@/lib/sector-icons";
import { PersonalMark } from "./PersonalCodes";

export type RowTone = "pos" | "neg" | "neutral" | "accent";

/**
 * The market-analysis stock row — a thin wrapper over the app-wide `StockRow`
 * that supplies a neutral sector tile as the leading slot, the reader's
 * H / ★ `PersonalMark` beside the code, and one quiet toned figure on the
 * right (2026-10-25 redesign: no tinted tiles or pills — the figure's colour
 * is the only colour, and it means up / down / the list's number).
 */
export default function MarketRow({
  code,
  name,
  sector,
  price,
  meta,
  sub,
  tone = "neutral",
}: {
  code: string;
  name?: string | null;
  sector?: string | null;
  price?: number | null;
  meta: ReactNode;
  /** Optional detail line under the name (e.g. "record 20 Sep · buy by 15 Sep"). */
  sub?: ReactNode;
  tone?: RowTone;
}) {
  const hasIcon = sectorIconKey(sector) != null;
  return (
    <StockRow
      as="div"
      inset="bleed"
      code={code}
      name={name}
      leading={
        <span className="mk-tile" aria-hidden="true">
          {hasIcon ? <SectorIcon sector={sector} size={18} /> : code.charAt(0)}
        </span>
      }
      mark={<PersonalMark code={code} />}
      detail={sub}
      price={price ?? undefined}
      trailing={<span className={`mk-meta mk-meta--${tone}`}>{meta}</span>}
    />
  );
}
