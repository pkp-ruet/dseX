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

export default function LiveRankingPreview({
  items,
  totalCount,
}: {
  items: ScoreItem[];
  totalCount: number;
}) {
  const rows = items.slice(0, 8);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)] text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        <span className="text-right">#</span>
        <span>Stock</span>
        <span className="text-right">Price</span>
        <span className="text-right">Score</span>
      </div>
      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((item, i) => {
          const tier = getTier(item.score);
          const color = TIER_VAR[tier];
          return (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 items-center px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{i + 1}</span>
              <span className="min-w-0">
                <span className="font-mono font-bold text-sm text-[var(--text)] tracking-wide">{item.trading_code}</span>
                <span className="block text-[0.68rem] text-[var(--text-muted)] truncate">{item.company_name}</span>
              </span>
              <span className="text-right text-xs font-semibold tabular-nums text-[var(--text)]">
                {item.ltp != null ? taka(item.ltp, 2) : "--"}
              </span>
              <span
                className="justify-self-end inline-flex items-center justify-center min-w-[2.4rem] px-2 py-1 rounded-lg text-sm font-extrabold tabular-nums text-white"
                style={{ background: color }}
              >
                {item.score == null ? "--" : Math.round(item.score)}
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/dsestockranking"
        className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        See all {totalCount}+ ranked stocks →
      </Link>
    </div>
  );
}
