import Link from "next/link";
import { type WatchlistNewsItem } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

const MAX_ROWS = 3;

/**
 * Compact, scannable news peek for the dashboard — replaces the 5-second
 * auto-rotating single-headline carousel (NewsSlider) with a stacked list of
 * the latest few headlines on the user's stocks. No motion (reduced-motion
 * friendly), everything visible at once, each row taps straight to the stock.
 */
export default function NewsPeek({ news, loading }: { news: WatchlistNewsItem[]; loading: boolean }) {
  if (loading && news.length === 0) {
    return (
      <Card padding="none" className="p-4">
        <Skeleton height={14} className="mb-2" />
        <Skeleton width="70%" height={14} />
      </Card>
    );
  }

  if (news.length === 0) return null;

  const shown = [...news]
    .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime())
    .slice(0, MAX_ROWS);

  return (
    <Card padding="none" className="overflow-hidden">
      <ul className="divide-y divide-[var(--cell-rule)]">
        {shown.map((n, i) => (
          <li key={`${n.trading_code}-${n.post_date}-${i}`}>
            <Link
              prefetch={false}
              href={`/stock/${n.trading_code}`}
              className="flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="ticker-tag mt-0.5 shrink-0 text-[0.7rem]">{n.trading_code}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-[var(--ink)] line-clamp-2">
                  {n.title}
                </span>
                <span className="mt-0.5 block text-[0.66rem] font-medium text-[var(--text-muted)]">
                  {formatDate(n.post_date)}
                </span>
              </span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0 text-[var(--text-muted)]"
                aria-hidden
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/todays-news"
        className="block border-t border-[var(--border)] px-4 py-2.5 text-center text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-2)]"
      >
        All news →
      </Link>
    </Card>
  );
}
