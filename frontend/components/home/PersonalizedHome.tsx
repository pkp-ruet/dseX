"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLang, type Lang } from "@/context/LangContext";
import {
  getScores,
  getMarketState,
  getDailyPicks,
  type HomeBundle,
  type ScoreItem,
  type ScoresResponse,
  type MarketStateData,
} from "@/lib/api";
import { loadHomeBundle } from "@/lib/home-bundle";
import { getCachedWatchlist, subscribeWatchlist, primeWatchlist } from "@/lib/watchlist";
import { getCachedAlerts, subscribeAlerts, primeAlerts, type PriceAlert } from "@/lib/price-alerts";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import { consumeJustSignedUp } from "@/lib/welcome";
import { portfolioTodayMove } from "@/lib/portfolio-analysis";
import { buildHomeAlerts, type HomeAlertKind } from "@/lib/home-alerts";
import { buildDailyBrief } from "@/lib/daily-brief";
import { marketSession, isTradingDay, bstDateStr } from "@/lib/market-hours";
import { bnDate } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import { trackHomeTap, trackEvent } from "@/lib/track";

import DailyBriefing from "@/components/home/personalized/DailyBriefing";
import HeroGreeting from "@/components/home/personalized/HeroGreeting";
import MoneyHero, { MoneyHeroSkeleton } from "@/components/home/personalized/MoneyHero";
import MoneyHeroGhost from "@/components/home/personalized/MoneyHeroGhost";
import AttentionStrip from "@/components/home/personalized/AttentionStrip";
import PullToRefresh from "@/components/home/personalized/PullToRefresh";
import MyStocksToday from "@/components/home/personalized/MyStocksToday";
import PortfolioGlanceCard from "@/components/home/personalized/PortfolioGlanceCard";
import TodaysIdeas from "@/components/home/personalized/TodaysIdeas";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import MarketTodayCard from "@/components/home/personalized/MarketTodayCard";
import MoversCard from "@/components/home/personalized/MoversCard";
import SectorsWeekCard from "@/components/home/personalized/SectorsWeekCard";
import MarketNewsCard from "@/components/home/personalized/MarketNewsCard";
import BanglaSnapshotCard from "@/components/home/personalized/BanglaSnapshotCard";
import TurningPointsCard from "@/components/home/personalized/TurningPointsCard";
import BuysTodayCard from "@/components/home/personalized/BuysTodayCard";
import TopRankedCard from "@/components/home/personalized/TopRankedCard";
import ListsRail from "@/components/home/personalized/ListsRail";
import TrendingCard from "@/components/home/personalized/TrendingCard";
import PopularCard from "@/components/home/personalized/PopularCard";
import TipsCard from "@/components/home/personalized/TipsCard";
import DividendBoardCard from "@/components/home/personalized/DividendBoardCard";
import LearnCard from "@/components/home/personalized/LearnCard";
import ExploreLinks from "@/components/home/personalized/ExploreLinks";
import NewsPeek from "@/components/home/personalized/NewsPeek";
import ChapterHead from "@/components/home/personalized/ChapterHead";
import { CHAPTER_ACC } from "@/components/home/personalized/accents";
import { IconBook, IconCoin, IconGrid, IconSparkle, IconWallet } from "@/components/home/personalized/DashIcons";
import DashSectionNav, { type DashNavItem } from "@/components/home/personalized/DashSectionNav";
import { HeaderChip } from "@/components/home/personalized/DashHeader";
import InstallHomeBanner from "@/components/pwa/InstallHomeBanner";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

function SectionLabel({ children, lang }: { children: React.ReactNode; lang: Lang }) {
  const bn = lang === "bn";
  return (
    <p
      lang={bn ? "bn" : undefined}
      className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-muted${bn ? " font-bn" : ""}`}
    >
      {/* Standing in for a DashHeader's icon tile, so this label does not read
          as the one grey thing between two coloured cards. */}
      <span
        className="h-3.5 w-1 shrink-0 rounded-full"
        aria-hidden
        style={{ background: CHAPTER_ACC.money }}
      />
      {children}
    </p>
  );
}

/** Placeholder matching TodaysIdeas' shape — shown while the bundle is still
 *  in flight so the section doesn't pop in. */
function IdeasSkeleton() {
  return (
    <div className="soft-card overflow-hidden" aria-hidden>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="h-3.5 w-40 animate-pulse rounded-full bg-surface-2" />
        <div className="h-3.5 w-16 animate-pulse rounded-full bg-surface-2" />
      </div>
      <div className="mx-4 mt-3 h-3.5 w-3/4 animate-pulse rounded-full bg-surface-2 sm:mx-5" />
      <div className="space-y-px px-4 pb-2 pt-3 sm:px-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

/** Two cards side by side from `md:` up; a lone card takes the full width.
 *  `grid-cols-1` is load-bearing on a phone: without it the implicit column is
 *  `auto`, which cannot shrink below a card's min-content, so one over-wide
 *  row would widen the whole page instead of being contained. */
const PAIR = "grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start [&>*:only-child]:md:col-span-2";

/** Alerts that are NOT a price row — price moves and 52-week extremes live as
 *  chips on the "Your stocks today" rows, so they are not listed twice. */
const ATTENTION_KINDS = new Set<HomeAlertKind>(["target", "signal", "dividend"]);

const EMPTY_DIVIDENDS = { upcoming_declarations: [], upcoming_record_dates: [] };
const EMPTY_SET = new Set<string>();

export default function PersonalizedHome() {
  const { user } = useAuth();
  const { lang, setLang } = useLang();
  const bn = lang === "bn";

  // SWR hydrate from localStorage for an instant first paint. Background
  // fetches below refresh + rewrite.
  const userId = getStoredUser()?.user_id ?? null;

  const [bundle, setBundle] = useState<HomeBundle | null>(() =>
    userId ? readCache<HomeBundle>(cacheKeys.homeBundle(userId)) : null,
  );
  const [bundleSettled, setBundleSettled] = useState(false);
  const [codes, setCodes] = useState<string[]>(() => getCachedWatchlist());
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => getCachedAlerts());
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem>>(() =>
    flatten(readCache<ScoresResponse>(cacheKeys.scores)),
  );
  const [marketState, setMarketState] = useState<MarketStateData | null>(
    () => readCache<MarketStateData>(cacheKeys.marketState),
  );
  const [tuneOpen, setTuneOpen] = useState(false);
  // True only on the first dashboard render right after signup (one-shot flag).
  const [isNewUser, setIsNewUser] = useState(false);

  // Read the just-signed-up flag once on mount (clears it).
  useEffect(() => {
    if (consumeJustSignedUp()) setIsNewUser(true);
  }, []);

  // THREE requests: the personal bundle (which now also carries the market
  // chapter — movers, market news, trending, popular, the dividend board), the
  // scores, the market state. The bundle also feeds the shared watchlist +
  // alerts stores so the navbar badge needs no request of its own.
  const runFetches = useCallback(
    (isAlive: () => boolean = () => true) => {
      const jobs: Promise<unknown>[] = [
        loadHomeBundle()
          .then((b) => {
            if (!isAlive()) return;
            setBundle(b);
            primeWatchlist(b.watchlist);
            primeAlerts(b.alerts ?? []);
            if (userId) {
              writeCache(cacheKeys.homeBundle(userId), b);
              // Keep the per-piece caches the portfolio / watchlist pages read warm.
              writeCache(cacheKeys.portfolio(userId), b.holdings);
              if (b.daily_picks) writeCache(cacheKeys.dailyPicks(userId), b.daily_picks);
            }
            if (b.market_index) writeCache(cacheKeys.marketIndex, b.market_index);
            if (b.near_extremes) writeCache(cacheKeys.extremes, b.near_extremes);
          })
          .catch(() => {})
          .finally(() => isAlive() && setBundleSettled(true)),
        getScores()
          .then((s) => {
            if (!isAlive()) return;
            setPriceMap(flatten(s));
            writeCache(cacheKeys.scores, s);
          })
          .catch(() => {}),
        getMarketState()
          .then((d) => {
            if (!isAlive()) return;
            setMarketState(d);
            writeCache(cacheKeys.marketState, d);
          })
          .catch(() => {}),
      ];
      return Promise.allSettled(jobs);
    },
    [userId],
  );

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

  // ── Derived from the bundle ─────────────────────────────────────────────
  // holdings: null while unknown (skeleton), [] once we know there are none.
  const holdings = bundle ? bundle.holdings : bundleSettled ? [] : null;
  const news = bundle?.news ?? [];
  const tips = bundle?.tips?.tips ?? [];
  const dailyPicks = bundle?.daily_picks ?? null;
  const extremes = bundle?.near_extremes ?? null;
  const dividends = bundle?.dividends ?? EMPTY_DIVIDENDS;
  const marketIndex = bundle?.market_index ?? null;
  const dividendCash = bundle?.dividend_cash ?? [];
  const reportCodes = bundle?.report_codes ?? [];
  const summariesBn = bundle?.summaries_bn ?? {};
  const signalEvents = bundle?.signal_events ?? [];
  const movers = bundle?.movers ?? null;
  const marketNews = bundle?.market_news ?? [];
  const top20 = bundle?.top20 ?? [];
  const popular = bundle?.popular ?? [];
  const calendarRows = bundle?.calendar?.record_dates ?? [];
  const declared = bundle?.calendar?.recent_declarations ?? [];

  const hasWatchlist = codes.length > 0;
  const hasPortfolio = (holdings?.length ?? 0) > 0;
  const hasTuned = !!dailyPicks?.tuned;
  const isBrandNew = holdings !== null && !hasPortfolio && !hasWatchlist;

  const heldSet = useMemo(
    () => (holdings && holdings.length ? new Set(holdings.map((h) => h.trading_code.toUpperCase())) : EMPTY_SET),
    [holdings],
  );
  const watchedSet = useMemo(() => (codes.length ? new Set(codes.map((c) => c.toUpperCase())) : EMPTY_SET), [codes]);

  const isoToday = bstDateStr();
  const dateStr = bn
    ? bnDate(isoToday, true)
    : new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const shortDate = bn
    ? bnDate(isoToday)
    : new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const allStocks = useMemo(() => Array.from(priceMap.values()), [priceMap]);
  // Buy signals ride along on the scores already in priceMap — no extra fetch.
  const buys = useMemo(() => allStocks.filter((s) => s.signal?.signal === "buy"), [allStocks]);
  const sectors = useMemo(
    () => Array.from(new Set(allStocks.map((s) => s.sector).filter((x): x is string => Boolean(x)))).sort(),
    [allStocks],
  );

  const followedCodes = Array.from(new Set([...watchedSet, ...heldSet])).sort();

  function refreshDailyPicks() {
    return getDailyPicks()
      .then((d) => {
        setBundle((b) => (b ? { ...b, daily_picks: d } : b));
        if (userId) writeCache(cacheKeys.dailyPicks(userId), d);
      })
      .catch(() => {});
  }

  // Portfolio move today — feeds the money hero + the daily brief.
  const todayMove = hasPortfolio ? portfolioTodayMove(holdings!, priceMap) : null;

  // Before the open (or on a non-trading day) the prices are the previous
  // close — the brief must not say "today" at 9 AM.
  const when = marketSession() === "pre" || !isTradingDay() ? "last" : "today";

  // The one sentence at the top of the page.
  const briefSegments = buildDailyBrief({
    holdings: holdings ?? [],
    codes,
    priceMap,
    todayMove,
    extremes,
    dividends,
    marketIndex,
    marketMood: marketState?.mood ?? null,
    lang,
    when,
  });

  // "What needs attention" — built from data already loaded. News is excluded
  // (headlines live in NewsPeek); price rows are excluded (they are chips on
  // the "Your stocks today" rows).
  const attention = buildHomeAlerts({
    codes,
    holdings: holdings ?? [],
    priceMap,
    todayMove,
    extremes,
    dividends,
    dividendCash,
    triggeredAlerts: priceAlerts,
    signalEvents,
    dateKey: new Date().toDateString(),
    includeNews: false,
    lang,
  }).filter((a) => ATTENTION_KINDS.has(a.kind));

  // "New since you last looked" — server-computed diff, filtered to picks still
  // on today's feed (skip-backfill replacements aren't in new_codes).
  const pickCodes = new Set((dailyPicks?.picks ?? []).map((p) => p.trading_code.toUpperCase()));
  const newPickCodes = (dailyPicks?.new_codes ?? []).filter((c) => pickCodes.has(c.toUpperCase()));

  const hasIdeas = (dailyPicks?.picks?.length ?? 0) > 0 || tips.length > 0 || buys.length > 0;
  const ideasLoading = !hasIdeas && !bundleSettled;

  const hasMovers = !!movers && ((movers.gainers?.length ?? 0) + (movers.losers?.length ?? 0) + (movers.most_traded?.length ?? 0) > 0);
  const sectorRows = marketState?.now?.sectors ?? [];
  const hasTurning =
    (marketState?.next?.near_high?.length ?? 0) + (marketState?.next?.near_low?.length ?? 0) + (marketState?.next?.unusual?.length ?? 0) > 0;
  const hasDividends = calendarRows.length > 0 || declared.length > 0;

  const navItems = useMemo<DashNavItem[]>(() => {
    const items: DashNavItem[] = [
      { id: "money", label: t(lang, "chMoney"), accent: CHAPTER_ACC.money },
      { id: "market", label: t(lang, "chMarket"), accent: CHAPTER_ACC.market },
      { id: "ideas", label: t(lang, "chIdeas"), accent: CHAPTER_ACC.ideas },
    ];
    if (hasDividends) items.push({ id: "dividends", label: t(lang, "chDividends"), accent: CHAPTER_ACC.dividends });
    items.push({ id: "learn", label: t(lang, "chLearn"), accent: CHAPTER_ACC.learn });
    return items;
  }, [lang, hasDividends]);

  function onLang(l: Lang) {
    setLang(l);
    trackEvent("home_lang", { lang: l });
  }

  // One delegated listener: any link tapped inside a `[data-card]` wrapper
  // records which card it came from. No per-component wiring.
  function onTap(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement | null;
    const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    const card = link.closest("[data-card]")?.getAttribute("data-card");
    if (card) trackHomeTap(card, link.getAttribute("href") ?? undefined);
  }

  const greeting = (
    <HeroGreeting
      name={user?.display_name}
      dateStr={dateStr}
      isNew={isNewUser}
      brief={briefSegments}
      lang={lang}
      onLang={onLang}
    />
  );

  return (
    <PullToRefresh onRefresh={() => runFetches()}>
    <div className="pb-4" onClickCapture={onTap}>
      {/* ── Chapter 1a: the hero — brief + value + grade. Always first. ── */}
      <section id="money" className="dash-section relative mt-5" data-card="money">
        {/* Soft clay/steel/gold wash behind the hero — the one place on the
            page with ambience. `.dash-glow` is inset-inline: 0, never negative,
            so it cannot make the page pan sideways on a phone. */}
        <span className="dash-glow" aria-hidden />
        {holdings === null ? (
          // Portfolio not known yet → hold the hero's space so nothing below
          // jumps when it resolves (kills the ghost↔MoneyHero shift).
          <MoneyHeroSkeleton greeting={greeting} />
        ) : hasPortfolio ? (
          <MoneyHero holdings={holdings} priceMap={priceMap} marketIndex={marketIndex} greeting={greeting} lang={lang} />
        ) : (
          <MoneyHeroGhost greeting={greeting} lang={lang} />
        )}
      </section>

      {/* Sticky chapter chips — the page is a long daily read now. */}
      <DashSectionNav items={navItems} lang={lang} />

      <div className="mt-4 space-y-9">
        {/* ── Chapter 1b: the rest of "your money" — portfolio at a glance +
            your stocks, then what needs attention + your news. ── */}
        {(hasPortfolio || hasWatchlist) && (
          <section className="space-y-3">
            <div className={PAIR}>
              {hasPortfolio && (
                <div data-card="glance">
                  <PortfolioGlanceCard holdings={holdings!} priceMap={priceMap} dividendCash={dividendCash} lang={lang} />
                </div>
              )}
              <div data-card="stocks">
                <MyStocksToday
                  holdings={holdings ?? []}
                  codes={codes}
                  priceMap={priceMap}
                  extremes={extremes}
                  dividends={dividends}
                  alerts={priceAlerts}
                  reportCodes={reportCodes}
                  lang={lang}
                />
              </div>
            </div>
            {(attention.length > 0 || news.length > 0) && (
              <div className={PAIR}>
                {attention.length > 0 && (
                  <div data-card="attention">
                    <AttentionStrip alerts={attention} lang={lang} />
                  </div>
                )}
                {news.length > 0 && (
                  <div data-card="news">
                    <SectionLabel lang={lang}>{t(lang, "newsOnYourStocks")}</SectionLabel>
                    <NewsPeek
                      news={news}
                      loading={false}
                      moreHref={hasWatchlist ? "/watchlist" : "/todays-news"}
                      moreLabel={hasWatchlist ? t(lang, "allNewsYourStocks") : t(lang, "allMarketNews")}
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Chapter 2: Market today — the whole day without leaving the page:
            mood + index + sparkline, movers, sectors, market news, the Bengali
            paragraph, and what is near a turning point. ── */}
        <section id="market" className="dash-section space-y-3">
          <ChapterHead label={t(lang, "chMarket")} lang={lang} accent={CHAPTER_ACC.market} icon={<IconGrid size={16} />} />
          <div className={PAIR}>
            <div data-card="market">
              <MarketTodayCard
                index={marketIndex}
                dividends={dividends}
                mood={marketState?.mood ?? null}
                since={marketState?.since_yesterday ?? null}
                stats={marketState?.stats ?? null}
                quality={marketState?.now?.quality ?? null}
                cheap={
                  marketState?.now?.questions?.find((q) =>
                    q.key === "value" || q.q.toLowerCase().startsWith("are shares cheap"),
                  ) ?? null
                }
                history={marketState?.history ?? null}
                lang={lang}
              />
            </div>
            {hasMovers && (
              <div data-card="movers">
                <MoversCard movers={movers} held={heldSet} watched={watchedSet} lang={lang} />
              </div>
            )}
          </div>
          {(sectorRows.length > 0 || marketNews.length > 0 || marketState?.summary_bn) && (
            <div className={PAIR}>
              {sectorRows.length > 0 && (
                <div data-card="sectors">
                  <SectorsWeekCard sectors={sectorRows} lang={lang} />
                </div>
              )}
              {(marketNews.length > 0 || marketState?.summary_bn) && (
                <div className="space-y-3">
                  {marketNews.length > 0 && (
                    <div data-card="marketnews">
                      <MarketNewsCard news={marketNews} held={heldSet} watched={watchedSet} lang={lang} />
                    </div>
                  )}
                  {marketState?.summary_bn && (
                    <div data-card="bangla">
                      <BanglaSnapshotCard summary={marketState.summary_bn} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {hasTurning && (
            <div data-card="turning">
              <TurningPointsCard
                nearHigh={marketState?.next?.near_high ?? []}
                nearLow={marketState?.next?.near_low ?? []}
                unusual={marketState?.next?.unusual ?? []}
                held={heldSet}
                watched={watchedSet}
                lang={lang}
              />
            </div>
          )}
        </section>

        {/* ── Chapter 3: Worth a look — the three-stock opener, then every buy
            signal, the top of the ranking, the four lists, trending, tips,
            and what other readers are viewing. ── */}
        <section id="ideas" className="dash-section space-y-3">
          <ChapterHead label={t(lang, "chIdeas")} lang={lang} accent={CHAPTER_ACC.ideas} icon={<IconSparkle size={16} />} />
          <div className={PAIR}>
            {(hasIdeas || ideasLoading) && (
              <div id="intelligence" data-card="ideas">
                {ideasLoading ? (
                  <IdeasSkeleton />
                ) : (
                  <TodaysIdeas
                    picks={dailyPicks?.picks ?? []}
                    buys={buys}
                    tips={tips}
                    followed={followedCodes}
                    tuned={hasTuned}
                    newPickCodes={newPickCodes}
                    summariesBn={summariesBn}
                    lang={lang}
                    chips={
                      <>
                        <HeaderChip className="hidden sm:inline">{shortDate}</HeaderChip>
                        {newPickCodes.length > 0 && (
                          <HeaderChip tone="accent">
                            {newPickCodes.length} {t(lang, "newTag").toLowerCase()}
                          </HeaderChip>
                        )}
                      </>
                    }
                  />
                )}
              </div>
            )}
            {allStocks.length > 0 && (
              <div data-card="buys">
                <BuysTodayCard buys={buys} held={heldSet} watched={watchedSet} lang={lang} />
              </div>
            )}
          </div>
          {(allStocks.length > 0 || top20.length > 0) && (
            <div className={PAIR}>
              {allStocks.length > 0 && (
                <div data-card="ranked">
                  <TopRankedCard stocks={allStocks} held={heldSet} watched={watchedSet} lang={lang} />
                </div>
              )}
              {top20.length > 0 && (
                <div data-card="trending">
                  <TrendingCard items={top20} held={heldSet} watched={watchedSet} lang={lang} />
                </div>
              )}
            </div>
          )}
          {marketState?.chances && (
            <div data-card="lists">
              <ListsRail chances={marketState.chances} held={heldSet} watched={watchedSet} lang={lang} />
            </div>
          )}
          {(tips.length > 0 || popular.length > 0) && (
            <div className={PAIR}>
              {tips.length > 0 && (
                <div data-card="tips">
                  <TipsCard tips={tips} held={heldSet} watched={watchedSet} lang={lang} />
                </div>
              )}
              {popular.length > 0 && (
                <div data-card="popular">
                  <PopularCard items={popular} held={heldSet} watched={watchedSet} lang={lang} />
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Chapter 4: Money coming — every record date in the next two
            weeks, market-wide, plus the latest declarations. ── */}
        {hasDividends && (
          <section id="dividends" className="dash-section space-y-3">
            <ChapterHead label={t(lang, "chDividends")} lang={lang} accent={CHAPTER_ACC.dividends} icon={<IconCoin size={16} />} />
            <div data-card="dividends">
              <DividendBoardCard recordDates={calendarRows} declared={declared} held={heldSet} watched={watchedSet} lang={lang} />
            </div>
          </section>
        )}

        {/* Onboarding checklist — build a watchlist + personalize picks. Sits
            below the money chapter so a returning user never meets "Finish
            setting up" before their own money. Renders nothing once done. */}
        <div data-card="setup">
          <DailyBriefing
            hasWatchlist={hasWatchlist}
            hasTuned={hasTuned}
            onPersonalize={() => setTuneOpen(true)}
          />
        </div>

        {/* ── Chapter 5: Learn — two short reads that rotate daily (three
            Bengali beginner guides for a brand-new account) + the way out to
            every other page. ── */}
        <section id="learn" className="dash-section space-y-3">
          <ChapterHead label={t(lang, "chLearn")} lang={lang} accent={CHAPTER_ACC.learn} icon={<IconBook size={16} />} />
          <div className={PAIR}>
            <div data-card="learn">
              <LearnCard brandNew={isBrandNew} lang={lang} />
            </div>
            <div data-card="explore">
              <ExploreLinks lang={lang} />
            </div>
          </div>
        </section>

        {/* Mobile-only install CTA — auto-hides once installed / dismissed. */}
        <InstallHomeBanner />
      </div>

      {/* "Personalize your picks" quiz, opened from the setup checklist. */}
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
