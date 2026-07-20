"use client";

import { useCallback, useEffect, useState } from "react";
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
import { buildDailyBrief } from "@/lib/daily-brief";

import DailyBriefing from "@/components/home/personalized/DailyBriefing";
import HeroGreeting from "@/components/home/personalized/HeroGreeting";
import MoneyHero, { MoneyHeroSkeleton } from "@/components/home/personalized/MoneyHero";
import MoneyHeroGhost from "@/components/home/personalized/MoneyHeroGhost";
import AttentionStrip from "@/components/home/personalized/AttentionStrip";
import PullToRefresh from "@/components/home/personalized/PullToRefresh";
import StatTiles from "@/components/home/personalized/StatTiles";
import MyStocksToday from "@/components/home/personalized/MyStocksToday";
import IdeasCard from "@/components/home/personalized/IdeasCard";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import CoreFeatureTiles from "@/components/home/personalized/CoreFeatureTiles";
import MarketTodayCard from "@/components/home/personalized/MarketTodayCard";
import DiscoverCard from "@/components/home/personalized/DiscoverCard";
import NewsPeek from "@/components/home/personalized/NewsPeek";
import SearchBar from "@/components/home/SearchBar";
import InstallHomeBanner from "@/components/pwa/InstallHomeBanner";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

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
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        style={{
          color: accent,
          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>
          {eyebrow}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="font-display text-[clamp(1.25rem,4.5vw,1.55rem)] font-extrabold tracking-tight text-[var(--text)] leading-tight">
            {title}
          </h2>
          {chips}
        </div>
      </div>
    </div>
  );
}

/** Placeholder matching IdeasCard's shape — shown while the client-side
 *  picks/tips fetches are still in flight so the section doesn't pop in. */
function IdeasSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] p-3.5">
          <div className="mb-3 h-5 w-40 animate-pulse rounded-lg bg-[var(--surface-2)]" />
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
            <div className="h-12 animate-pulse rounded-xl bg-[var(--surface-2)]" />
          </div>
        </div>
      ))}
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
  const [marketIndex, setMarketIndex] = useState<MarketIndexData | null>(
    () => readCache<MarketIndexData>(cacheKeys.marketIndex),
  );
  const [marketState, setMarketState] = useState<MarketStateData | null>(
    () => readCache<MarketStateData>(cacheKeys.marketState),
  );
  const [top20, setTop20] = useState<Top20Item[]>(
    () => readCache<Top20Item[]>(cacheKeys.top20) ?? [],
  );
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

  // All core + discovery fetches in one place so pull-to-refresh can re-run
  // them. `isAlive` lets the mount effect cancel state writes after unmount; a
  // manual refresh passes the default (always alive) and awaits the promise.
  const runFetches = useCallback(
    (isAlive: () => boolean = () => true) => {
      const jobs: Promise<unknown>[] = [
        loadWatchlist().then((c) => isAlive() && setCodes(c)).catch(() => {}),
        apiGetPortfolio()
          .then((r) => {
            if (!isAlive()) return;
            setHoldings(r.holdings);
            if (userId) writeCache(cacheKeys.portfolio(userId), r.holdings);
          })
          // Keep the cache-hydrated value on failure; only fall back to empty
          // (→ setup card) when nothing was cached.
          .catch(() => isAlive() && setHoldings((h) => h ?? [])),
        getScores()
          .then((s) => {
            if (!isAlive()) return;
            setPriceMap(flatten(s));
            writeCache(cacheKeys.scores, s);
          })
          .catch(() => {}),
        getNearExtremes()
          .then((d) => {
            if (!isAlive()) return;
            setExtremes(d);
            writeCache(cacheKeys.extremes, d);
          })
          .catch(() => {}),
        getDividendsUpcoming()
          .then((d) => {
            if (!isAlive()) return;
            setDividends(d);
            writeCache(cacheKeys.dividends, d);
          })
          .catch(() => {}),
        getMarketIndex()
          .then((d) => {
            if (!isAlive()) return;
            setMarketIndex(d);
            writeCache(cacheKeys.marketIndex, d);
          })
          .catch(() => {}),
        getMarketState()
          .then((d) => {
            if (!isAlive()) return;
            setMarketState(d);
            writeCache(cacheKeys.marketState, d);
          })
          .catch(() => {}),
        getTop20()
          .then((d) => {
            if (!isAlive()) return;
            const items = d.items ?? [];
            setTop20(items);
            writeCache(cacheKeys.top20, items);
          })
          .catch(() => {}),
        getDailyTips()
          .then((d) => isAlive() && setTips(d.tips ?? []))
          .catch(() => {})
          .finally(() => isAlive() && setTipsSettled(true)),
        getDailyPicks()
          .then((d) => {
            if (!isAlive()) return;
            setDailyPicks(d);
            if (userId) writeCache(cacheKeys.dailyPicks(userId), d);
          })
          .catch(() => {})
          .finally(() => isAlive() && setPicksSettled(true)),
        loadAlerts().then((a) => isAlive() && setPriceAlerts(a)).catch(() => {}),
        apiGetSignalEvents().then((r) => isAlive() && setSignalEvents(r.events ?? [])).catch(() => {}),
      ];
      return Promise.allSettled(jobs);
    },
    [userId],
  );

  // Core + discovery fetch on mount
  useEffect(() => {
    let alive = true;
    runFetches(() => alive);
    const unsub = subscribeWatchlist(() => setCodes(getCachedWatchlist()));
    const unsubAlerts = subscribeAlerts(() => setPriceAlerts(getCachedAlerts()));
    return () => {
      alive = false;
      unsub();
      unsubAlerts();
    };
  }, [runFetches]);

  // News for the homepage slider — watchlist ∪ portfolio codes, refetched
  // whenever either set changes.
  const newsCodes = Array.from(
    new Set([
      ...codes.map((c) => c.toUpperCase()),
      ...(holdings ?? []).map((h) => h.trading_code.toUpperCase()),
    ]),
  ).sort();
  const newsCodesKey = newsCodes.join(",");
  useEffect(() => {
    const fetchCodes = newsCodesKey ? newsCodesKey.split(",") : [];
    if (fetchCodes.length === 0) {
      setNews([]);
      setNewsLoading(false);
      return;
    }
    const key = cacheKeys.watchlistNews(fetchCodes);
    const cached = readCache<WatchlistNewsItem[]>(key);
    if (cached) setNews(cached);
    setNewsLoading(!cached);
    let alive = true;
    getWatchlistNews(fetchCodes)
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
  }, [newsCodesKey]);

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
  // Buy signals ride along on the scores already in priceMap — no extra fetch.
  const buys = allStocks.filter((s) => s.signal?.signal === "buy");
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

  // Portfolio move today — feeds the money statement + the daily brief.
  const todayMove = hasPortfolio ? portfolioTodayMove(holdings!, priceMap) : null;

  // One-line "daily brief" synthesized from data already loaded.
  const briefSegments = buildDailyBrief({
    holdings: holdings ?? [],
    codes,
    priceMap,
    todayMove,
    extremes,
    dividends,
    marketIndex,
  });

  const showIdeas = !!dailyPicks?.picks?.length || tips.length > 0 || buys.length > 0;
  // Skeleton while the client-side picks/tips fetches are in flight and nothing
  // was cache-hydrated — stops the section popping in mid-scroll.
  const ideasLoading = !showIdeas && (!picksSettled || !tipsSettled);

  // "New since you last looked" — server-computed diff, filtered to picks still
  // on today's feed (skip-backfill replacements aren't in new_codes).
  const pickCodes = new Set((dailyPicks?.picks ?? []).map((p) => p.trading_code.toUpperCase()));
  const newPickCodes = (dailyPicks?.new_codes ?? []).filter((c) => pickCodes.has(c.toUpperCase()));

  const shortDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  // Personalized "needs attention" list (AttentionStrip) — built from data
  // already loaded. News is excluded here (includeNews: false) so headlines
  // live only in the NewsPeek section below — no double-listing.
  const homeAlerts = buildHomeAlerts({
    codes,
    priceMap,
    todayMove,
    extremes,
    dividends,
    triggeredAlerts: priceAlerts,
    signalEvents,
    dateKey: new Date().toDateString(),
    includeNews: false,
  });

  const greeting = (
    <HeroGreeting name={user?.display_name} dateStr={dateStr} isNew={isNewUser} watchlistCount={codes.length} />
  );

  return (
    <PullToRefresh onRefresh={() => runFetches()}>
    <div className="pb-4">
      {/* Onboarding checklist — build a watchlist + personalize picks (adding a
          portfolio is sold by the money hero itself, so it's not a step here).
          Renders nothing once both are done or it's dismissed. */}
      <DailyBriefing
        hasWatchlist={hasWatchlist}
        hasTuned={hasTuned}
        onPersonalize={() => setTuneOpen(true)}
      />

      {/* ── Bento: your dashboard (main column) + explore the market (aside) on
          desktop. Mobile keeps the single-column source order: money → ideas →
          explore. ── */}
      <div className="mt-5 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
      <div className="space-y-8 lg:col-span-3">

      {/* ── Chapter 1: Your money — greeting+value hero → what needs attention →
          glance tiles → your stocks → news. The hero leads so a returning
          user's money is the first thing on screen. ── */}
      <section className="space-y-3">
        {holdings === null ? (
          // Portfolio not known yet → hold the hero's space so nothing below
          // jumps when it resolves (kills the ghost↔MoneyHero shift).
          <MoneyHeroSkeleton greeting={greeting} />
        ) : hasPortfolio ? (
          <MoneyHero holdings={holdings} priceMap={priceMap} marketIndex={marketIndex} greeting={greeting} />
        ) : (
          <MoneyHeroGhost greeting={greeting} />
        )}

        {/* Look up any stock → its analysis page. Sits right under the money
            hero so search is the first action after a user checks their value. */}
        {companies.length > 0 && (
          <div className="pt-1">
            <SectionLabel>Look up any stock</SectionLabel>
            <SearchBar companies={companies} variant="sidebar" />
          </div>
        )}

        {/* The single home for "what happened on your stocks today" — replaces
            the old header bell + Alerts tile + brief line. Quiet days fall back
            to one calm concierge sentence; nothing at all → renders nothing. */}
        {(hasWatchlist || hasPortfolio) && (
          <AttentionStrip alerts={homeAlerts} brief={briefSegments} />
        )}

        {(hasPortfolio || hasWatchlist) && (
          <>
            <StatTiles
              codes={codes}
              holdings={holdings ?? []}
              priceMap={priceMap}
              dividends={dividends}
              marketIndex={marketIndex}
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

        {(hasWatchlist || hasPortfolio) && (newsLoading || news.length > 0) && (
          <div>
            <SectionLabel>News on your stocks</SectionLabel>
            <NewsPeek news={news} loading={newsLoading} />
          </div>
        )}

        {/* Mobile-only install CTA — auto-hides once installed / dismissed. */}
        <InstallHomeBanner />
      </section>

      {/* ── Chapter 2: Ideas for you — personalized picks, whole-market buy
          signals, and daily tips merged into ONE tabbed card (was two separate
          look-alike cards). The date + "N new" chips prove the daily refresh. ── */}
      {(showIdeas || ideasLoading) && (
        <section id="intelligence" className="scroll-mt-24">
          <SectionHeader
            eyebrow="TopStockBD Intelligence"
            title={hasTuned ? "Your ideas today" : "Ideas for you today"}
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
            {ideasLoading ? (
              <IdeasSkeleton />
            ) : (
              <IdeasCard
                picks={dailyPicks?.picks ?? []}
                buys={buys}
                tips={tips}
                tuned={hasTuned}
                sectors={sectors}
                onTuned={refreshDailyPicks}
                newPickCodes={newPickCodes}
                watchCodes={newsCodes}
              />
            )}
          </div>
        </section>
      )}
      </div>
      {/* end main column */}

      {/* ── ASIDE: Explore the market — market snapshot, discovery, quick links.
          Becomes the right sidebar on desktop; stacks under the main column on
          mobile (source order preserved). ── */}
      <aside className="mt-8 lg:col-span-2 lg:mt-0">
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
      </aside>
      </div>
      {/* end bento grid */}

      {/* Onboarding step 3 — "Personalize your picks" quiz, opened from DailyBriefing. */}
      <TuneModal
        open={tuneOpen}
        sectors={sectors}
        onClose={() => setTuneOpen(false)}
        onComplete={refreshDailyPicks}
      />
    </div>
    </PullToRefresh>
  );
}
