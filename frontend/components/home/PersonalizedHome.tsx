"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getScores,
  apiGetPortfolio,
  getWatchlistNews,
  getNearExtremes,
  getDividendsUpcoming,
  getMarketIndex,
  getMarketMovers,
  getTop20,
  getPopularStocks,
  getDailyTips,
  type ScoreItem,
  type ScoresResponse,
  type PortfolioHolding,
  type WatchlistNewsItem,
  type NearExtremesData,
  type DividendsUpcoming,
  type MarketIndexData,
  type MarketMoverItem,
  type Top20Item,
  type PopularStockItem,
  type DailyTip,
} from "@/lib/api";
import { loadWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";

import WelcomeHeader from "@/components/home/personalized/WelcomeHeader";
import SetupCard from "@/components/home/personalized/SetupCard";
import PortfolioSummaryCard from "@/components/home/personalized/PortfolioSummaryCard";
import WatchlistSummaryCard from "@/components/home/personalized/WatchlistSummaryCard";
import WatchlistMoversCard from "@/components/home/personalized/WatchlistMoversCard";
import WatchlistNews from "@/components/watchlist/WatchlistNews";
import WatchlistQuickAdd from "@/components/watchlist/WatchlistQuickAdd";
import SearchBar from "@/components/home/SearchBar";
import LiveMarketBand from "@/components/home/LiveMarketBand";
import LiveRankingPreview from "@/components/home/LiveRankingPreview";
import StockListPreview from "@/components/home/StockListPreview";
import Top20MomentumTeaser from "@/components/home/Top20MomentumTeaser";
import PopularTeaser from "@/components/home/PopularTeaser";
import DailyTipsCard from "@/components/home/DailyTipsCard";
import InsightsTeaserStrip from "@/components/home/InsightsTeaserStrip";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

const STAR_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const BAG_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-8-2h4v2h-4V5z" />
  </svg>
);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold mt-2 mb-3">{children}</p>
  );
}

export default function PersonalizedHome() {
  const { user } = useAuth();

  // SWR hydrate from localStorage for an instant first paint (matches the
  // /watchlist + /portfolio pages). Background fetches below refresh + rewrite.
  const userId = getStoredUser()?.user_id ?? null;

  const [codes, setCodes] = useState<string[]>(() => getCachedWatchlist());
  const [holdings, setHoldings] = useState<PortfolioHolding[] | null>(() => {
    if (!userId) return null;
    return readCache<PortfolioHolding[]>(cacheKeys.portfolio(userId));
  });
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem>>(() =>
    flatten(readCache<ScoresResponse>(cacheKeys.scores)),
  );
  const [news, setNews] = useState<WatchlistNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [extremes, setExtremes] = useState<NearExtremesData | null>(
    () => readCache<NearExtremesData>(cacheKeys.extremes),
  );
  const [dividends, setDividends] = useState<DividendsUpcoming | null>(
    () => readCache<DividendsUpcoming>(cacheKeys.dividends),
  );
  const [marketIndex, setMarketIndex] = useState<MarketIndexData | null>(null);
  const [gainers, setGainers] = useState<MarketMoverItem[]>([]);
  const [top20, setTop20] = useState<Top20Item[]>([]);
  const [popular, setPopular] = useState<PopularStockItem[]>([]);
  const [tips, setTips] = useState<DailyTip[]>([]);

  // Core + discovery fetch on mount
  useEffect(() => {
    let alive = true;
    loadWatchlist().then((c) => alive && setCodes(c)).catch(() => {});
    apiGetPortfolio()
      .then((r) => {
        if (!alive) return;
        setHoldings(r.holdings);
        if (userId) writeCache(cacheKeys.portfolio(userId), r.holdings);
      })
      // Keep the cache-hydrated value on failure; only fall back to empty
      // (→ setup card) when nothing was cached.
      .catch(() => alive && setHoldings((h) => h ?? []));
    getScores()
      .then((s) => {
        if (!alive) return;
        setPriceMap(flatten(s));
        writeCache(cacheKeys.scores, s);
      })
      .catch(() => {});
    getNearExtremes()
      .then((d) => {
        if (!alive) return;
        setExtremes(d);
        writeCache(cacheKeys.extremes, d);
      })
      .catch(() => {});
    getDividendsUpcoming()
      .then((d) => {
        if (!alive) return;
        setDividends(d);
        writeCache(cacheKeys.dividends, d);
      })
      .catch(() => {});
    getMarketIndex().then((d) => alive && setMarketIndex(d)).catch(() => {});
    getMarketMovers().then((d) => alive && setGainers(d.gainers ?? [])).catch(() => {});
    getTop20().then((d) => alive && setTop20(d.items ?? [])).catch(() => {});
    getPopularStocks().then((d) => alive && setPopular(d.items ?? [])).catch(() => {});
    getDailyTips().then((d) => alive && setTips(d.tips ?? [])).catch(() => {});
    const unsub = subscribeWatchlist(() => setCodes(getCachedWatchlist()));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  // Watchlist news — refetch when codes change
  useEffect(() => {
    if (codes.length === 0) {
      setNews([]);
      setNewsLoading(false);
      return;
    }
    const key = cacheKeys.watchlistNews(codes);
    const cached = readCache<WatchlistNewsItem[]>(key);
    if (cached) setNews(cached);
    setNewsLoading(!cached);
    let alive = true;
    getWatchlistNews(codes)
      .then((n) => {
        if (!alive) return;
        setNews(n);
        writeCache(key, n);
      })
      // Keep cached news on failure rather than blanking the strip.
      .catch(() => {})
      .finally(() => alive && setNewsLoading(false));
    return () => {
      alive = false;
    };
  }, [codes]);

  const hasWatchlist = codes.length > 0;
  const hasPortfolio = (holdings?.length ?? 0) > 0;

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const allStocks = Array.from(priceMap.values());
  const rankingItems = allStocks
    .filter((s) => s.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const companies = allStocks.map((s) => ({ trading_code: s.trading_code, company_name: s.company_name }));

  return (
    <div className="pb-4">
      <WelcomeHeader name={user?.display_name} dateStr={dateStr} />

      {/* Search any stock → its analysis page */}
      {companies.length > 0 && (
        <div className="mt-4">
          <SearchBar companies={companies} variant="sidebar" />
        </div>
      )}

      {/* Personal blocks */}
      <div className="mt-4 flex flex-col gap-4">
        {hasPortfolio ? (
          <PortfolioSummaryCard holdings={holdings!} priceMap={priceMap} />
        ) : (
          <SetupCard
            icon={BAG_ICON}
            title="Track your portfolio"
            blurb="Add the stocks you own to see live profit & loss and get your portfolio graded A–F on diversification, quality and entry."
            ctaLabel="Add your holdings"
            ctaHref="/portfolio"
          />
        )}

        {hasWatchlist ? (
          <>
            <WatchlistSummaryCard codes={codes} priceMap={priceMap} dividends={dividends} />
            <WatchlistMoversCard codes={codes} priceMap={priceMap} extremes={extremes} dividends={dividends} />
            {(newsLoading || news.length > 0) && (
              <div>
                <SectionLabel>Latest watchlist news</SectionLabel>
                <WatchlistNews codes={codes} news={news} loading={newsLoading} limit={4} compact />
              </div>
            )}
          </>
        ) : (
          <SetupCard
            icon={STAR_ICON}
            title="Build your watchlist"
            blurb="Search any DSE stock and add it — then follow its price, score and news here, synced across your devices."
            ctaLabel="Open watchlist"
            ctaHref="/watchlist"
          >
            <div className="mt-4">
              <WatchlistQuickAdd />
            </div>
          </SetupCard>
        )}
      </div>

      {/* Discovery */}
      <div className="mt-10 flex flex-col gap-8">
        <p className="text-[clamp(1.15rem,4vw,1.5rem)] font-extrabold tracking-tight text-[var(--text)]">
          Discover more
        </p>

        {marketIndex && <LiveMarketBand index={marketIndex} gainers={gainers} />}

        {tips.length > 0 && <DailyTipsCard tips={tips} />}

        {rankingItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{
                    color: "#059669",
                    background: "color-mix(in srgb, #059669 12%, transparent)",
                    border: "1px solid color-mix(in srgb, #059669 24%, var(--border))",
                  }}
                  aria-hidden
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 20V10M12 20V4M19 20v-6" />
                  </svg>
                </span>
                <h3 className="font-display text-[clamp(1.1rem,4vw,1.4rem)] font-extrabold tracking-tight text-[var(--text)] truncate">
                  Top Ranked <span className="rank-title-accent">Stocks</span>
                </h3>
              </div>
              <Link
                href="/dsestockranking"
                className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                See all →
              </Link>
            </div>
            <LiveRankingPreview items={rankingItems} totalCount={rankingItems.length} showScore={false} />
          </div>
        )}

        {allStocks.length > 0 && (
          <div>
            <SectionLabel>Browse stocks (A–Z)</SectionLabel>
            <StockListPreview items={allStocks} totalCount={allStocks.length} />
          </div>
        )}

        {top20.length > 0 && <Top20MomentumTeaser items={top20} />}
        {popular.length > 0 && <PopularTeaser items={popular} />}
        <InsightsTeaserStrip />
      </div>
    </div>
  );
}
