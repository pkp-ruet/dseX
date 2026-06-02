import Link from "next/link";
import { type ScoreItem } from "@/lib/api";
import { getTier, type TierKey } from "@/lib/constants";
import { taka } from "@/lib/formatters";

const TIER_VAR: Record<TierKey, string> = {
  strong_buy: "var(--strong-buy)",
  buy: "var(--np-good)",
  keep_watching: "var(--watch)",
  avoid: "var(--avoid)",
};

// Medal gradients for the podium (top 3); rest use a flat muted chip.
const MEDAL: Record<number, string> = {
  1: "linear-gradient(135deg, #F59E0B, #FBBF24)",
  2: "linear-gradient(135deg, #94A3B8, #CBD5E1)",
  3: "linear-gradient(135deg, #B45309, #D97706)",
};

export default function LiveRankingPreview({
  items,
  totalCount,
}: {
  items: ScoreItem[];
  totalCount: number;
}) {
  const rows = items.slice(0, 8);
  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-soft)] text-white">
        <span className="text-sm">🏅</span>
        <span className="text-[0.78rem] font-extrabold tracking-wide">Top Ranked Stocks</span>
        <span className="ml-auto text-[0.6rem] font-bold uppercase tracking-[0.1em] opacity-80">
          Live Score
        </span>
      </div>

      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((item, i) => {
          const rank = i + 1;
          const tier = getTier(item.score);
          const color = TIER_VAR[tier];
          const medal = MEDAL[rank];
          const score = item.score == null ? null : Math.round(item.score);
          return (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className="group flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
            >
              {/* rank badge */}
              <span
                className="shrink-0 grid place-items-center w-7 h-7 rounded-lg text-xs font-extrabold tabular-nums"
                style={
                  medal
                    ? { background: medal, color: "#fff", boxShadow: "0 2px 6px -1px rgba(0,0,0,0.25)" }
                    : { background: "var(--surface-2)", color: "var(--text-muted)" }
                }
              >
                {rank}
              </span>

              <span className="flex-1 min-w-0">
                <span className="ticker-tag text-[0.8rem]">{item.trading_code}</span>
                <span className="block mt-1 text-[0.68rem] text-[var(--text-muted)] truncate">
                  {item.company_name}
                </span>
              </span>

              <span className="text-right shrink-0">
                <span className="block text-xs font-semibold tabular-nums text-[var(--text)]">
                  {item.ltp != null ? taka(item.ltp, 2) : "--"}
                </span>
                <span
                  className="mt-1 inline-flex items-center justify-center min-w-[2.4rem] px-2 py-0.5 rounded-lg text-sm font-extrabold tabular-nums text-white"
                  style={{ background: color }}
                >
                  {score ?? "--"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        href="/dsestockranking"
        className="block text-center px-4 py-3 text-xs font-bold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        See all {totalCount}+ ranked stocks →
      </Link>
    </div>
  );
}
