import Link from "next/link";
import { STOCK_LISTS } from "@/lib/stock-lists";

const PICKS = STOCK_LISTS.filter((l) => l.insightMode === true);

export default function InsightsTeaserStrip() {
  return (
    <section className="mt-10 mb-4" aria-label="Stock Picks">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-medium">
          Stock Picks
        </p>
        <Link
          href="/stock-insights"
          className="text-xs font-semibold text-[var(--primary)] hover:underline"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PICKS.map((list) => (
          <Link
            key={list.slug}
            href={`/stock-insights/${list.slug}`}
            className="group soft-card hover-lift flex flex-col gap-2 p-4"
          >
            <span className="text-2xl leading-none" aria-hidden="true">
              {list.icon}
            </span>
            <p className="text-sm font-semibold text-[var(--ink)] leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-2">
              {list.shortName}
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-1 flex-1">
              {list.description}
            </p>
            <span className="text-xs font-semibold text-[var(--primary)] mt-auto">
              Read insights →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
