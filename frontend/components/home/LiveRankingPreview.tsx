import Link from "next/link";
import { type ScoreItem } from "@/lib/api";
import { getTier, TIER_VAR } from "@/lib/constants";
import Card from "@/components/ui/Card";

export default function LiveRankingPreview({
  items,
  totalCount,
  showScore = true,
}: {
  items: ScoreItem[];
  totalCount: number;
  showScore?: boolean;
}) {
  const rows = items.slice(0, 8);
  const cols = showScore
    ? "grid-cols-[2rem_1fr_auto_auto]"
    : "grid-cols-[2rem_1fr_auto]";

  return (
    <Card padding="none" className="overflow-hidden">
      <div
        className={`grid ${cols} gap-3 px-4 py-3 border-b-2 border-[var(--border)] bg-[var(--surface-2)] text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[var(--text)]`}
      >
        <span className="text-right">#</span>
        <span>Stock</span>
        <span className="text-right">Price</span>
        {showScore && <span className="text-right">Score</span>}
      </div>
      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((item, i) => {
          const tier = getTier(item.score);
          const color = TIER_VAR[tier];
          return (
            <Link
              key={item.trading_code}
              prefetch={false} href={`/stock/${item.trading_code}`}
              className={`group grid ${cols} gap-3 items-center px-4 py-3 border-l-[3px] hover:bg-[var(--surface-2)] transition-colors`}
              style={{ borderLeftColor: `color-mix(in srgb, ${color} 26%, transparent)` }}
            >
              <span className="text-right text-xs font-bold tabular-nums nums text-[var(--text-muted)]">{i + 1}</span>
              <span className="min-w-0">
                <span
                  className="inline-flex items-center font-mono text-[0.8rem] font-extrabold tracking-[0.03em] px-2 py-0.5 rounded-md border group-hover:brightness-95 transition-all"
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} 11%, transparent)`,
                    borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
                  }}
                >
                  {item.trading_code}
                </span>
                <span
                  className="block mt-0.5 text-[0.66rem] truncate group-hover:underline underline-offset-2 decoration-dotted"
                  style={{ color: `color-mix(in srgb, ${color} 38%, var(--text-muted))` }}
                >
                  {item.company_name}
                </span>
              </span>
              <span className="fr-price justify-self-end">
                <span className="fr-price-cur">৳</span>
                <span className="fr-price-val">{item.ltp != null ? item.ltp.toFixed(2) : "--"}</span>
              </span>
              {showScore && (
                <span
                  className="justify-self-end inline-flex items-center justify-center min-w-[2.4rem] px-2 py-1 rounded-lg text-sm font-extrabold tabular-nums nums text-white"
                  style={{
                    background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 78%, #000) 100%)`,
                  }}
                >
                  {item.score == null ? "--" : Math.round(item.score)}
                </span>
              )}
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
    </Card>
  );
}
