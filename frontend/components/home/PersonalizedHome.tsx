"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getScores,
  apiGetPortfolio,
  getWatchlistNews,
  getNearExtremes,
  getDividendsUpcoming,
  getMarketIndex,
  getMarketState,
  getTop20,
  getDailyTips,
  getDailyPicks,
  apiGetSignalEvents,
  type PortfolioSignalEvent,
  type DailyPicksResponse,
  type ScoreItem,
  type ScoresResponse,
  type PortfolioHolding,
  type WatchlistNewsItem,
  type NearExtremesData,
  type DividendsUpcoming,
  type MarketIndexData,
  type MarketStateData,
  type Top20Item,
  type DailyTip,
} from "@/lib/api";
import { loadWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { loadAlerts, getCachedAlerts, subscribeAlerts, type PriceAlert } from "@/lib/price-alerts";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import { consumeJustSignedUp } from "@/lib/welcome";
import { portfolioTodayMove } from "@/lib/portfolio-analysis";
import { buildHomeAlerts } from "@/lib/home-alerts";

import WelcomeHeader from "@/components/home/personalized/WelcomeHeader";
import DailyBriefing from "@/components/home/personalized/DailyBriefing";
import SetupCard from "@/components/home/personalized/SetupCard";
import MoneyHero from "@/components/home/personalized/MoneyHero";
import StatTiles from "@/components/home/personalized/StatTiles";
import MyStocksToday from "@/components/home/personalized/MyStocksToday";
import ForYouCard from "@/components/home/personalized/ForYouCard";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import CoreFeatureTiles from "@/components/home/personalized/CoreFeatureTiles";
import MarketTodayCard from "@/components/home/personalized/MarketTodayCard";
import DiscoverCard from "@/components/home/personalized/DiscoverCard";
import WatchlistNews from "@/components/watchlist/WatchlistNews";
import SearchBar from "@/components/home/SearchBar";
import InstallHomeBanner from "@/components/pwa/InstallHomeBanner";
import Card from "@/components/ui/Card";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

const BAG_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-8-2h4v2h-4V5z" />
  </svg>
);
const INTEL_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a5 5 0 0 0-5 5c0 1.6.8 3 2 4v2h6v-2c1.2-1 2-2.4 2-4a5 5 0 0 0-5-5z" />
    <path d="M9 19h6M10 21h4" />
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
  chips,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  icon: React.ReactNode;
  /** Small pills rendered next to the title (date, "N new"). */
  chips?: React.ReactNode;
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="font-display text-[clamp(1.3rem,5vw,1.7rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight">
            {title}
          </h2>
          {chips}
        </div>
      </div>
      <span
        className="ml-1 hidden h-1 flex-1 rounded-full sm:block"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 45%, transparent), transparent)` }}
        aria-hidden
      />
    </div>
  );
}

/** Placeholder matching ForYouCard's shape — shown while the client-side
 *  picks/tips fetches are still in flight so the section doesn't pop in. */
function ForYouSkeleton() {
  return (
    <div className="soft-card overflow-hidden" aria-hidden>
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 sm:px-4">
        <div className="h-9 w-full max-w-xs animate-pulse rounded-xl bg-[var(--surface-2)]" />
      </div>
      <div className="space-y-2 bg-[var(--surface-2)] px-4 py-4 sm:px-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
        ))}
        <div className="h-10 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      </div>
    </div>
  );
}

export default function PersonalizedHome() {
  const { user } = useAuth();

  // SWR hydrate from localStorage for an instant first paint (matches the
  // /watchlist + /portfolio pages). Background fetches below refresh + rewrite.
  const userId = getStoredUser()?.user_id ?? null;

  const [codes, setCodes] = useState<string[]>(() => getCachedWatchlist());
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => getCachedAlerts());
  const [signalEvents, setSignalEvents] = useState<PortfolioSignalEvent[]>([]);
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
  const [marketState, setMarketState] = useState<MarketStateData | null>(null);
  const [top20, setTop20] = useState<Top20Item[]>([]);
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [dailyPicks, setDailyPicks] = useState<DailyPicksResponse | null>(() => {
    if (!userId) return null;
    return readCache<DailyPicksResponse>(cacheKeys.dailyPicks(userId));
  });
  const [tuneOpen, setTuneOpen] = useState(false);
  // Fetch-settled flags for the intelligence section skeleton (resolve or fail).
  const [picksSettled, setPicksSettled] = useState(false);
  const [tipsSettled, setTipsSettled] = useState(false);
  // True only on the first dashboard render right after signup (one-shot flag).
  const [isNewUser, setIsNewUser] = useState(false);

  // Read the just-signed-up flag once on mount (clears it).
  useEffect(() => {
    if (consumeJustSignedUp()) setIsNewUser(true);
  }, []);

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
    getMarketState().then((d) => alive && setMarketState(d)).catch(() => {});
    getTop20().then((d) => alive && setTop20(d.items ?? [])).catch(() => {});
    getDailyTips()
      .then((d) => alive && setTips(d.tips ?? []))
      .catch(() => {})
      .finally(() => alive && setTipsSettled(true));
    getDailyPicks()
      .then((d) => {
        if (!alive) return;
        setDailyPicks(d);
        if (userId) writeCache(cacheKeys.dailyPicks(userId), d);
      })
      .catch(() => {})
      .finally(() => alive && setPicksSettled(true));
    loadAlerts().then((a) => alive && setPriceAlerts(a)).catch(() => {});
    apiGetSignalEvents()
      .then((r) => alive && setSignalEvents(r.events ?? []))
      .catch(() => {});
    const unsub = subscribeWatchlist(() => setCodes(getCachedWatchlist()));
    const unsubAlerts = subscribeAlerts(() => setPriceAlerts(getCachedAlerts()));
    return () => {
      alive = false;
      unsub();
      unsubAlerts();
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
  const hasTuned = !!dailyPicks?.tuned;

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

  // Portfolio move today — drives the WelcomeHeader subline.
  const todayMove = hasPortfolio ? portfolioTodayMove(holdings!, priceMap) : null;

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
  // Skeleton while the client-side picks/tips fetches are in flight and nothing
  // was cache-hydrated — stops the section popping in mid-scroll.
  const intelLoading = !showRecommended && (!picksSettled || !tipsSettled);

  // "New since you last looked" — server-computed diff, filtered to picks still
  // on today's feed (skip-backfill replacements aren't in new_codes).
  const pickCodes = new Set((dailyPicks?.picks ?? []).map((p) => p.trading_code.toUpperCase()));
  const newPickCodes = (dailyPicks?.new_codes ?? []).filter((c) => pickCodes.has(c.toUpperCase()));

  const shortDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  // Personalized alerts for the header bell — built from data already loaded.
  const homeAlerts = buildHomeAlerts({
    codes,
    priceMap,
    todayMove,
    extremes,
    dividends,
    news: recentNews,
    triggeredAlerts: priceAlerts,
    signalEvents,
    dateKey: new Date().toDateString(),
  });

  return (
    <div className="pb-4">
      {/* Dashboard header card — greeting + market line, kept deliberately clean. */}
      <Card padding="md" className="mt-5">
        {/* todayMove intentionally not passed — the MoneyHero below is the money
            statement; the header subline falls back to the follow count. */}
        <WelcomeHeader
          name={user?.display_name}
          dateStr={dateStr}
          marketIndex={marketIndex}
          watchlistCount={codes.length}
          alerts={homeAlerts}
          isNew={isNewUser}
        />
      </Card>

      {/* Onboarding checklist (own card) — only while setup is incomplete.
          Shows from first sign-in (empty watchlist) onward. */}
      <DailyBriefing
        hasPortfolio={hasPortfolio}
        hasWatchlist={hasWatchlist}
        hasTuned={hasTuned}
        onPersonalize={() => setTuneOpen(true)}
      />

      {/* Search any stock → its analysis page */}
      {companies.length > 0 && (
        <div className="mt-4">
          <SearchBar companies={companies} variant="sidebar" />
        </div>
      )}

      {/* Mobile-only install CTA — sits with the search box, not wedged into the
          briefing. Desktop has the navbar button. Auto-hides once installed /
          dismissed / unsupported. */}
      <InstallHomeBanner />

      {/* ── Section 1: Your money today — dashboard (hero → tiles → stocks → news → teaser).
          The hero card carries the section identity, so no big SectionHeader here. ── */}
      <section className="mt-8">
        <div className="flex flex-col gap-3">
          {hasPortfolio ? (
            <MoneyHero holdings={holdings!} priceMap={priceMap} marketIndex={marketIndex} />
          ) : (
            <div>
              <SectionLabel>Your money today</SectionLabel>
              <SetupCard
                icon={BAG_ICON}
                title="Track your portfolio"
                blurb="Add the stocks you own to see live profit & loss and get your portfolio graded A–F on diversification, quality and entry."
                ctaLabel="Add your holdings"
                ctaHref="/portfolio"
              />
            </div>
          )}

          {/* Empty watchlist is nudged by the setup checklist (DailyBriefing) above. */}
          {(hasPortfolio || hasWatchlist) && (
            <>
              <StatTiles
                codes={codes}
                holdings={holdings ?? []}
                priceMap={priceMap}
                dividends={dividends}
                marketIndex={marketIndex}
                alerts={homeAlerts}
              />
              <MyStocksToday
                holdings={holdings ?? []}
                codes={codes}
                priceMap={priceMap}
                extremes={extremes}
                dividends={dividends}
              />
            </>
          )}

          {hasWatchlist && (newsLoading || recentNews.length > 0) && (
            <div>
              <SectionLabel>Latest watchlist news</SectionLabel>
              <WatchlistNews codes={codes} news={recentNews} loading={newsLoading} limit={4} compact />
            </div>
          )}

        </div>
      </section>

      {/* ── Section 2: today's picks + tips — benefit-led title, brand demoted to
          the eyebrow; the date + "N new" chips prove the daily refresh. ── */}
      {(showRecommended || intelLoading) && (
        <section id="intelligence" className="mt-8 scroll-mt-24">
          <SectionHeader
            eyebrow="TopStockBD Intelligence"
            title={hasTuned ? "Your picks today" : "Top picks today"}
            accent="var(--primary)"
            icon={INTEL_ICON}
            chips={
              <>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.66rem] font-bold text-[var(--text-muted)]">
                  {shortDate}
                </span>
                {newPickCodes.length > 0 && (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2.5 py-0.5 text-[0.66rem] font-extrabold text-[var(--primary)]">
                    {newPickCodes.length} new
                  </span>
                )}
              </>
            }
          />
          <div className="mt-3">
            {intelLoading ? (
              <ForYouSkeleton />
            ) : (
              <ForYouCard
                picks={dailyPicks?.picks ?? []}
                tips={tips}
                tuned={hasTuned}
                sectors={sectors}
                onTuned={refreshDailyPicks}
                newCodes={newPickCodes}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Section 3: Explore the market — one market snapshot, one tabbed
          discovery card, quick links last. Quiet label on purpose: the big
          header above is reserved for the "for you" moment. ── */}
      <section className="mt-10">
        <SectionLabel>Explore the market</SectionLabel>
        <div className="flex flex-col gap-6">
          <MarketTodayCard
            index={marketIndex}
            dividends={dividends}
            quality={marketState?.now?.quality ?? null}
            cheap={
              marketState?.now?.questions?.find((q) =>
                q.q.toLowerCase().startsWith("are shares cheap"),
              ) ?? null
            }
          />

          {/* One tabbed discovery card replaces the three stacked 5-row tables. */}
          <DiscoverCard ranked={rankingItems} top20={top20} />

          <CoreFeatureTiles />
        </div>
      </section>

      {/* Onboarding step 3 — "Personalize your picks" quiz, opened from DailyBriefing. */}
      <TuneModal
        open={tuneOpen}
        sectors={sectors}
        onClose={() => setTuneOpen(false)}
        onComplete={refreshDailyPicks}
      />
    </div>
  );
}
