"use client";

import { useState } from "react";
import Link from "next/link";
import { type WatchlistNewsItem } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import { T } from "@/components/i18n/T";

interface Props {
  codes: string[];
  news: WatchlistNewsItem[];
  loading: boolean;
  /** Cap how many items render (data is already newest-first). */
  limit?: number;
  /** Drop the section header (for embedding, e.g. on the portfolio page). */
  compact?: boolean;
}

/** Rows shown before "Show all" on the watchlist page. */
const FIRST_ROWS = 6;

function NewsItem({ item }: { item: WatchlistNewsItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="wl-news-item">
      <div className="wl-news-top">
        <Link prefetch={false} href={`/stock/${item.trading_code}`} className="wl-news-code">
          {item.trading_code}
        </Link>
        <span className="wl-news-date">{formatDate(item.post_date)}</span>
      </div>
      <p className="wl-news-title">{item.title}</p>
      {item.body && (
        <>
          <p className={`wl-news-body ${expanded ? "" : "line-clamp-2"}`}>{item.body}</p>
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="btn-link btn-sm -ml-2"
            >
              <T en="Read more" bn="আরও পড়ুন" />
            </button>
          )}
        </>
      )}
    </li>
  );
}

function SkeletonRow() {
  return (
    <li className="wl-news-item">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton width={48} height={12} />
        <Skeleton width={64} height={12} />
      </div>
      <Skeleton height={14} className="mb-2" />
      <Skeleton width="70%" height={14} />
    </li>
  );
}

export default function WatchlistNews({ codes, news, loading, limit, compact = false }: Props) {
  const [showAll, setShowAll] = useState(false);
  if (!codes.length) return null;

  // Show cached/fresh news whenever we have any; only fall back to skeleton
  // when we genuinely have nothing yet.
  const showSkeleton = loading && news.length === 0;
  const showEmpty = !loading && news.length === 0;
  const capped = limit != null ? news.slice(0, limit) : news;
  const fold = !compact && !showAll && capped.length > FIRST_ROWS;
  const items = fold ? capped.slice(0, FIRST_ROWS) : capped;
  const skeletonCount = Math.min(limit ?? 4, 4);

  const body = (
    <>
      {showSkeleton && (
        <Card padding="none" className="wl-news" aria-busy="true">
          <ul>
            {[...Array(skeletonCount)].map((_, i) => <SkeletonRow key={i} />)}
          </ul>
        </Card>
      )}

      {showEmpty && (
        <Card padding="md">
          <p className="text-sm text-text-muted">
            <T
              en="There has been no news on your shares in the last 30 days."
              bn="গত 30 দিনে আপনার শেয়ারগুলো নিয়ে কোনো খবর আসেনি।"
            />
          </p>
        </Card>
      )}

      {items.length > 0 && (
        <Card padding="none" className="wl-news">
          <ul>
            {items.map((item, i) => (
              <NewsItem key={`${item.trading_code}-${item.post_date}-${i}`} item={item} />
            ))}
          </ul>
          {fold && (
            <div className="wl-news-more">
              <button type="button" onClick={() => setShowAll(true)}>
                <T en={`Show all ${capped.length} news items`} bn={`সব ${capped.length}টি খবর দেখুন`} />
              </button>
            </div>
          )}
        </Card>
      )}

      {compact && items.length > 0 && (
        <Button href="/watchlist" variant="quiet" size="sm" block className="mt-3">
          <T en="See all news →" bn="সব খবর দেখুন →" />
        </Button>
      )}
    </>
  );

  if (compact) return <section>{body}</section>;

  return (
    <section className="wl-section" aria-labelledby="wl-news">
      <SectionHeader
        id="wl-news"
        title={<T en="News on your shares" bn="আপনার শেয়ারের খবর" />}
        lead={
          <T
            en="Announcements from the last 30 days, newest first."
            bn="গত 30 দিনের ঘোষণা, নতুনগুলো আগে।"
          />
        }
      />
      {body}
    </section>
  );
}
