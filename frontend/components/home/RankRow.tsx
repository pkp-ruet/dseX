import Link from "next/link";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { taka, pct, signed } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";

interface Props {
  item: ScoreItem;
  rank: number;
}

export default function RankRow({ item, rank }: Props) {
  const changeColor =
    item.change_pct == null
      ? "text-gray-400"
      : item.change_pct > 0
      ? "text-[var(--positive)]"
      : item.change_pct < 0
      ? "text-[var(--negative)]"
      : "text-gray-500";

  const epsColor =
    item.eps_yoy_pct == null
      ? "text-gray-400"
      : item.eps_yoy_pct > 0
      ? "text-[var(--positive)]"
      : "text-[var(--negative)]";

  return (
    <Link href={`/stock/${item.trading_code}`} className="rank-row group">
      {/* Rank number */}
      <span className="w-8 text-xs text-[var(--text-muted)] font-mono shrink-0">
        #{rank}
      </span>

      {/* Ticker */}
      <span className="w-20 shrink-0">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--primary)] text-white">
          {item.trading_code}
        </span>
      </span>

      {/* Company name */}
      <span className="flex-1 text-sm text-[var(--text)] truncate hidden sm:block mr-2">
        {item.company_name ?? ""}
      </span>

      {/* Data slots */}
      <span className="flex items-center gap-3 text-xs text-[var(--text-muted)] shrink-0 mr-3">
        <span className="font-medium text-[var(--text)]">{taka(item.ltp)}</span>
        {item.change_pct != null && (
          <span className={changeColor}>{signed(item.change_pct)}%</span>
        )}
        <span className="hidden sm:inline">·</span>
        {item.eps_yoy_pct != null && (
          <span className={`hidden sm:inline ${epsColor}`}>
            EPS {signed(item.eps_yoy_pct, 1)}%
          </span>
        )}
        {item.div_yield_pct != null && (
          <>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{pct(item.div_yield_pct)} yield</span>
          </>
        )}
      </span>

      {/* Score */}
      <ScoreBadge score={item.score} size="sm" />
    </Link>
  );
}
