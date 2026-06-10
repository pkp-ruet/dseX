import Link from "next/link";
import { STOCK_LISTS } from "@/lib/stock-lists";

const PICKS = STOCK_LISTS.filter((l) => l.insightMode === true).slice(0, 5);

/** Compact insight-list preview styled like LiveRankingPreview: 5 titled rows
 *  + a "See all" footer. Promoted to a full section under the ranking. */
export default function InsightsPreview() {
  if (PICKS.length === 0) return null;

  return (
    <div className="soft-card overflow-hidden">
      <div className="divide-y divide-[var(--cell-rule)]">
        {PICKS.map((list, i) => (
          <Link
            key={list.slug}
            prefetch={false}
            href={`/stock-insights/${list.slug}`}
            className="grid grid-cols-[2rem_auto_1fr_auto] gap-3 items-center px-4 py-3 border-l-[3px] hover:bg-[var(--surface-2)] transition-colors"
            style={{ borderLeftColor: "color-mix(in srgb, var(--primary) 26%, transparent)" }}
          >
            <span className="text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{i + 1}</span>
            <span
              className="grid h-8 w-8 place-items-center rounded-lg text-base"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              aria-hidden
            >
              {list.icon}
            </span>
            <span className="min-w-0 text-[0.9rem] font-bold leading-tight text-[var(--text)] truncate">
              {list.shortName}
            </span>
            <span className="justify-self-end text-sm font-bold text-[var(--primary)]" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/stock-insights"
        className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        See all stock insights →
      </Link>
    </div>
  );
}
