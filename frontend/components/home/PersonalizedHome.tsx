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
  getDailyTips,
  getDailyPicks,
  type DailyPicksResponse,
  type ScoreItem,
  type ScoresResponse,
  type PortfolioHolding,
  type WatchlistNewsItem,
  type NearExtremesData,
  type DividendsUpcoming,
  type MarketIndexData,
  type MarketMoverItem,
  type Top20Item,
  type DailyTip,
} from "@/lib/api";
import { loadWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import { portfolioTodayMove } from "@/lib/portfolio-analysis";

import WelcomeHeader from "@/components/home/personalized/WelcomeHeader";
import DailyBriefing from "@/components/home/personalized/DailyBriefing";
import SetupCard from "@/components/home/personalized/SetupCard";
import PortfolioSummaryCard from "@/components/home/personalized/PortfolioSummaryCard";
import WatchlistSummaryCard from "@/components/home/personalized/WatchlistSummaryCard";
import WatchlistMoversCard from "@/components/home/personalized/WatchlistMoversCard";
import DailyPicksCard from "@/components/home/personalized/DailyPicksCard";
import CoreFeatureTiles from "@/components/home/personalized/CoreFeatureTiles";
import MarketAnalysisCard from "@/components/home/personalized/MarketAnalysisCard";
import InsightsPreview from "@/components/home/personalized/InsightsPreview";
import Top20Preview from "@/components/home/personalized/Top20Preview";
import WatchlistNews from "@/components/watchlist/WatchlistNews";
import WatchlistQuickAdd from "@/components/watchlist/WatchlistQuickAdd";
import SearchBar from "@/components/home/SearchBar";
import LiveMarketBand from "@/components/home/LiveMarketBand";
import LiveRankingPreview from "@/components/home/LiveRankingPreview";
import DailyTipsCard from "@/components/home/DailyTipsCard";
import PromoPill from "@/components/home/PromoPill";

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
const COMPASS_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <polygon points="16 8 13 13 8 16 11 11 16 8" fill="currentColor" stroke="none" />
  </svg>
);
const INTEL_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a5 5 0 0 0-5 5c0 1.6.8 3 2 4v2h6v-2c1.2-1 2-2.4 2-4a5 5 0 0 0-5-5z" />
    <path d="M9 19h6M10 21h4" />
  </svg>
);
const BOOK_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold mt-2 mb-3">{children}</p>
  );
}

function SectionHeader({
  eyebrow,
  title,
  accent,
  icon,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm"
        style={{
          color: "#fff",
          background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 72%, #000) 100%)`,
          boxShadow: `0 8px 20px -8px color-mix(in srgb, ${accent} 70%, transparent)`,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em]" style={{ color: accent }}>
          {eyebrow}
        </p>
        <h2 className="font-display text-[clamp(1.3rem,5vw,1.7rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight">
          {title}
        </h2>
      </div>
      <span
        className="ml-1 hidden h-1 flex-1 rounded-full sm:block"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 45%, transparent), transparent)` }}
        aria-hidden
      />
    </div>
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
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [dailyPicks, setDailyPicks] = useState<DailyPicksResponse | null>(() => {
    if (!userId) return null;
    return readCache<DailyPicksResponse>(cacheKeys.dailyPicks(userId));
  });

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
    getDailyTips().then((d) => alive && setTips(d.tips ?? [])).catch(() => {});
    getDailyPicks()
      .then((d) => {
        if (!alive) return;
        setDailyPicks(d);
        if (userId) writeCache(cacheKeys.dailyPicks(userId), d);
      })
      .catch(() => {});
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
  const sectors = Array.from(
    new Set(allStocks.map((s) => s.sector).filter((x): x is string => Boolean(x))),
  ).sort();

  function refreshDailyPicks() {
    return getDailyPicks()
      .then((d) => {
        setDailyPicks(d);
        if (userId) writeCache(cacheKeys.dailyPicks(userId), d);
      })
      .catch(() => {});
  }

  // ── Daily Check-In inputs ──────────────────────────────────────────────────
  const todayMove = hasPortfolio ? portfolioTodayMove(holdings!, priceMap) : null;

  // Watchlist alert count: near 52w high/low + dividend soon (mirrors WatchlistMoversCard).
  const nearHigh = new Set((extremes?.near_high ?? []).map((e) => e.trading_code.toUpperCase()));
  const nearLow = new Set((extremes?.near_low ?? []).map((e) => e.trading_code.toUpperCase()));
  const divSoon = new Set(
    [...(dividends?.upcoming_declarations ?? []), ...(dividends?.upcoming_record_dates ?? [])].map((d) =>
      d.trading_code.toUpperCase(),
    ),
  );
  let alertCount = 0;
  for (const c of codes) {
    const u = c.toUpperCase();
    if (nearHigh.has(u)) alertCount++;
    if (nearLow.has(u)) alertCount++;
    if (divSoon.has(u)) alertCount++;
  }

  // Homepage shows only the most-recent day's watchlist news (the /watchlist
  // page keeps the full 30-day list).
  const dayKey = (s: string) => new Date(s).toDateString();
  const recentNews = news.length
    ? (() => {
        const latestKey = dayKey(
          news.reduce((a, b) => (new Date(b.post_date) > new Date(a.post_date) ? b : a)).post_date,
        );
        return news.filter((n) => dayKey(n.post_date) === latestKey);
      })()
    : news;

  const showRecommended = !!dailyPicks?.picks?.length || tips.length > 0;

  return (
    <div className="pb-4">
      <WelcomeHeader name={user?.display_name} dateStr={dateStr} marketIndex={marketIndex} />

      <DailyBriefing
        todayMove={todayMove}
        alertCount={alertCount}
        newsCount={recentNews.length}
        hasPortfolio={hasPortfolio}
        hasWatchlist={hasWatchlist}
      />

      {/* Search any stock → its analysis page */}
      {companies.length > 0 && (
        <div className="mt-4">
          <SearchBar companies={companies} variant="sidebar" />
        </div>
      )}

      {/* ── Section 1: Personal — your portfolio, watchlist & news ── */}
      <section className="mt-8">
        <SectionHeader
          eyebrow="Your money today"
          title="Portfolio & Watchlist"
          accent="var(--primary)"
          icon={BAG_ICON}
        />
        <div className="mt-3 flex flex-col gap-4">
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
              {(newsLoading || recentNews.length > 0) && (
                <div>
                  <SectionLabel>Latest watchlist news</SectionLabel>
                  <WatchlistNews codes={codes} news={recentNews} loading={newsLoading} limit={4} compact />
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
      </section>

      {/* ── Section 2: TopStockBD Intelligence — personalized picks + daily tips.
          Umbrella title is distinct from the cards' own "Picked for you today". ── */}
      {showRecommended && (
        <section className="mt-8">
          <SectionHeader
            eyebrow="Made for you · refreshed daily"
            title="TopStockBD Intelligence"
            accent="var(--np-cautious)"
            icon={INTEL_ICON}
          />
          <div className="mt-3 flex flex-col gap-7">
            {/* Daily personalized picks — the merged "find stocks" feed, fresh daily. */}
            {dailyPicks?.picks?.length ? (
              <DailyPicksCard
                picks={dailyPicks.picks}
                tuned={dailyPicks.tuned ?? false}
                sectors={sectors}
                onTuned={refreshDailyPicks}
              />
            ) : null}

            {tips.length > 0 && <DailyTipsCard tips={tips} />}
          </div>
        </section>
      )}

      {/* ── Section 3: More on TopStockBD — explore core features ── */}
      <section className="mt-10">
        <SectionHeader
          eyebrow="Explore"
          title="More on TopStockBD"
          accent="var(--positive)"
          icon={COMPASS_ICON}
        />
        <div className="mt-3 flex flex-col gap-6">
          {/* Bengali "keep learning" nudge → blog */}
          <PromoPill
            href="/blog"
            ariaLabel="বাংলা ব্লগ — সহজ ভাষায় শেয়ার বাজার শিখুন"
            icon={BOOK_ICON}
            text="শেয়ার বাজার আরও ভালো বুঝুন — বাংলা ব্লগ পড়ুন"
            accentVar="var(--positive)"
          />

          {marketIndex && <LiveMarketBand index={marketIndex} gainers={gainers} />}

          <MarketAnalysisCard index={marketIndex} />

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

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-[var(--primary)]"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 24%, var(--border))",
                  }}
                  aria-hidden
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
                  </svg>
                </span>
                <h3 className="font-display text-[clamp(1.1rem,4vw,1.4rem)] font-extrabold tracking-tight text-[var(--text)] truncate">
                  Stock <span className="rank-title-accent">Insights</span>
                </h3>
              </div>
              <Link
                href="/stock-insights"
                className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                See all →
              </Link>
            </div>
            <InsightsPreview />
          </div>

          {top20.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{
                      color: "var(--positive)",
                      background: "color-mix(in srgb, var(--positive) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--positive) 24%, var(--border))",
                    }}
                    aria-hidden
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 20V10M12 20V4M19 20v-6" />
                    </svg>
                  </span>
                  <h3 className="font-display text-[clamp(1.1rem,4vw,1.4rem)] font-extrabold tracking-tight text-[var(--text)] truncate">
                    DSE <span className="rank-title-accent">Top 20</span>
                  </h3>
                </div>
                <Link
                  href="/dse-top-20"
                  className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  See all →
                </Link>
              </div>
              <Top20Preview items={top20} />
            </div>
          )}

          <CoreFeatureTiles />
        </div>
      </section>
    </div>
  );
}
