import Link from "next/link";
import { type WatchlistNewsItem } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import DashHeader from "@/components/home/personalized/DashHeader";
import Skeleton from "@/components/ui/Skeleton";

const MAX_ROWS = 3;

/**
 * Compact, scannable news peek for the dashboard — the latest few headlines on
 * the reader's stocks, each row tapping straight to the stock. The title sits
 * inside the card in the same `DashHeader` every other card uses (it used to
 * be a loose label above a headerless box).
 */
export default function NewsPeek({
  news,
  loading,
  title,
  moreHref = "/todays-news",
  moreLabel = "All market news",
}: {
  news: WatchlistNewsItem[];
  loading: boolean;
  title: string;
  /** Header link — the parent points it at the watchlist page when the user
   *  has one (news on *their* stocks), else at the whole-market news page. */
  moreHref?: string;
  moreLabel?: string;
}) {
  if (loading && news.length === 0) {
    return (
      <section className="soft-card overflow-hidden">
        <DashHeader title={title} />
        <div className="p-4">
          <Skeleton height={14} className="mb-2" />
          <Skeleton width="70%" height={14} />
        </div>
      </section>
    );
  }

  if (news.length === 0) return null;

  const shown = [...news]
    .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime())
    .slice(0, MAX_ROWS);

  return (
    <section className="soft-card overflow-hidden">
      <DashHeader title={title} href={moreHref} linkLabel={moreLabel} />
      <ul className="divide-y divide-cell-rule">
        {shown.map((n, i) => (
          <li key={`${n.trading_code}-${n.post_date}-${i}`}>
            <Link
              prefetch={false}
              href={`/stock/${n.trading_code}`}
              className="block px-4 py-3 transition-colors hover:bg-surface-2 active:bg-surface-2 sm:px-5"
            >
              <span className="block text-sm font-semibold leading-snug text-text-main line-clamp-2">{n.title}</span>
              <span className="mt-0.5 block text-xs font-medium text-text-muted">
                <span className="font-semibold uppercase tracking-wide">{n.trading_code}</span> · {formatDate(n.post_date)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
