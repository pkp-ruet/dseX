"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLang, type Lang } from "@/context/LangContext";
import { usePremium } from "@/lib/premium";
import {
  getScores,
  getMarketState,
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
import { buildHomeAlerts } from "@/lib/home-alerts";
import { marketSession, isTradingDay, bstDateStr } from "@/lib/market-hours";
import { bnDate } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import { trackHomeTap, trackEvent } from "@/lib/track";

import DailyBriefing from "@/components/home/personalized/DailyBriefing";
import HeroGreeting from "@/components/home/personalized/HeroGreeting";
import MoneyHero, { MoneyHeroSkeleton } from "@/components/home/personalized/MoneyHero";
import MoneyHeroGhost from "@/components/home/personalized/MoneyHeroGhost";
import PullToRefresh from "@/components/home/personalized/PullToRefresh";
import MyStocksToday, { buildStocksToday } from "@/components/home/personalized/MyStocksToday";
import MarketTodayCard from "@/components/home/personalized/MarketTodayCard";
import MoversCard from "@/components/home/personalized/MoversCard";
import MarketLinks from "@/components/home/personalized/MarketLinks";
import ResearchRail from "@/components/home/personalized/ResearchRail";
import DiscoverRail from "@/components/home/personalized/DiscoverRail";
import ScreenerCard from "@/components/home/personalized/ScreenerCard";
import GlanceStrip from "@/components/home/personalized/GlanceStrip";
import DividendBoardCard from "@/components/home/personalized/DividendBoardCard";
import LearnCard from "@/components/home/personalized/LearnCard";
import ExploreLinks from "@/components/home/personalized/ExploreLinks";
import ResultsPromoCard from "@/components/home/personalized/ResultsPromoCard";
import WeekWatchCard from "@/components/home/personalized/WeekWatchCard";
import FreeReportCard from "@/components/home/FreeReportCard";
import { freeReportCode } from "@/lib/free-report";
import ChapterHead from "@/components/home/personalized/ChapterHead";
import { IconBook, IconCoin, IconGrid, IconSparkle } from "@/components/home/personalized/DashIcons";
import DashSectionNav, { type DashNavItem } from "@/components/home/personalized/DashSectionNav";
import InstallHomeBanner from "@/components/pwa/InstallHomeBanner";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

/** Two cards side by side from `md:` up; a lone card takes the full width.
 *  `grid-cols-1` is load-bearing on a phone: without it the implicit column is
 *  `auto`, which cannot shrink below a card's min-content, so one over-wide
 *  row would widen the whole page instead of being contained. `.dash-pair`
 *  stretches both cards to the taller one's height so a pair ends on one line.
 *  On a phone the flat sections get 24px between them (`gap-6`). */
const PAIR = "dash-pair grid grid-cols-1 gap-6 sm:gap-3 md:grid-cols-2 [&>*:only-child]:md:col-span-2";
/** Space between the blocks inside one chapter. */
const CHAPTER = "dash-section space-y-6 sm:space-y-3";

const EMPTY_DIVIDENDS = { upcoming_declarations: [], upcoming_record_dates: [] };
const EMPTY_SET = new Set<string>();

export default function PersonalizedHome() {
  const { user } = useAuth();
  const { lang, setLang } = useLang();
  const { state: planState } = usePremium();
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
  const newResults = bundle?.new_results ?? [];
  const tips = bundle?.tips?.tips ?? [];
  const extremes = bundle?.near_extremes ?? null;
  const dividends = bundle?.dividends ?? EMPTY_DIVIDENDS;
  const marketIndex = bundle?.market_index ?? null;
  const dividendCash = bundle?.dividend_cash ?? [];
  const signalEvents = bundle?.signal_events ?? [];
  const movers = bundle?.movers ?? null;
  const top20 = bundle?.top20 ?? [];
  const popular = bundle?.popular ?? [];
  const calendarRows = bundle?.calendar?.record_dates ?? [];
  const declared = bundle?.calendar?.recent_declarations ?? [];

  const hasWatchlist = codes.length > 0;
  const hasPortfolio = (holdings?.length ?? 0) > 0;
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

  const allStocks = useMemo(() => Array.from(priceMap.values()), [priceMap]);
  // Buy signals ride along on the scores already in priceMap — no extra fetch.
  const buys = useMemo(() => allStocks.filter((s) => s.signal?.signal === "buy"), [allStocks]);

  const followedCodes = Array.from(new Set([...watchedSet, ...heldSet])).sort();


  // Portfolio move today (the money card shows it; keyPoints drops the row).
  const todayMove = hasPortfolio ? portfolioTodayMove(holdings!, priceMap) : null;

  // Before the open (or on a non-trading day) the prices are the previous
  // close — the glance strip must not say "today" at 9 AM.
  const when = marketSession() === "pre" || !isTradingDay() ? "last" : "today";

  // "Your stocks today" — portfolio and watchlist each get their day, where
  // they stand now and their key points (alerts + new results + unusual
  // trading + news), all built from data already loaded.
  const alerts = buildHomeAlerts({
    codes,
    holdings: holdings ?? [],
    priceMap,
    todayMove,
    extremes,
    dividends,
    dividendCash,
    triggeredAlerts: priceAlerts,
    signalEvents,
    // Saved screens are re-checked only while Premium — a lapsed plan's news is stale.
    savedScreens: planState === "premium" ? bundle?.screener?.saved ?? [] : [],
    dateKey: new Date().toDateString(),
    includeNews: false,
    lang,
  });
  const stockSections = buildStocksToday({
    holdings: holdings ?? [],
    watchlist: codes,
    priceMap,
    alerts,
    results: newResults,
    unusual: marketState?.next?.unusual ?? [],
    news,
    lang,
  });
  const updatesCount = stockSections.reduce((n, sec) => n + sec.points.length, 0);


  const hasMovers = !!movers && ((movers.gainers?.length ?? 0) + (movers.losers?.length ?? 0) + (movers.most_traded?.length ?? 0) > 0);
  const hasDividends = calendarRows.length > 0 || declared.length > 0;

  const navItems = useMemo<DashNavItem[]>(() => {
    const items: DashNavItem[] = [
      { id: "money", label: t(lang, "chMoney") },
      { id: "market", label: t(lang, "chMarket") },
      { id: "ideas", label: t(lang, "chIdeas") },
    ];
    if (hasDividends) items.push({ id: "dividends", label: t(lang, "chDividends") });
    items.push({ id: "learn", label: t(lang, "chLearn") });
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

  // Chapter title, with its Bengali line under it in English mode.
  const head = (key: "chMarket" | "chIdeas" | "chDividends" | "chLearn", icon: React.ReactNode, sub?: string) => (
    <ChapterHead label={t(lang, key)} bn={bn ? undefined : t("bn", key)} sub={sub} lang={lang} icon={icon} />
  );

  // ── The reader's own blocks. ──
  const stocksCard =
    hasPortfolio || hasWatchlist ? (
      <div id="your-stocks" className="dash-section" data-card="stocks">
        <MyStocksToday
          sections={stockSections}
          when={when}
          lang={lang}
        />
      </div>
    ) : null;
  // What the watcher caught on the reader's stocks this week — counts free,
  // the list Premium.
  const weekWatch = bundle?.week_watch ?? null;
  const weekCard =
    weekWatch && weekWatch.total > 0 ? (
      <div data-card="week-watch">
        <WeekWatchCard week={weekWatch} premium={planState === "premium"} lang={lang} />
      </div>
    ) : null;
  // Today's free full report (lib/free-report.ts) — the whole Premium stock
  // page, open for everyone, one familiar company a day. Free readers only —
  // Premium readers have every report open already.
  const freeItem = priceMap.get(freeReportCode());
  const freeReportCard =
    planState !== "premium" && freeItem && freeItem.score != null ? (
      <div data-card="free-report">
        <FreeReportCard item={freeItem} lang={lang} />
      </div>
    ) : null;
  // ── Chapter 4: Money coming — every record date in the next two weeks,
  //    market-wide, plus the latest declarations. ──
  const dividendsChapter = hasDividends ? (
    <section id="dividends" className={CHAPTER}>
      {head("chDividends", <IconCoin size={16} />)}
      <div data-card="dividends">
        <DividendBoardCard recordDates={calendarRows} declared={declared} held={heldSet} watched={watchedSet} lang={lang} />
      </div>
    </section>
  ) : null;

  // ── Chapter 2: Market today — mood + index + sparkline, movers, the
  //    week's quarterly results. Sectors this week, today's market news, the
  //    Bengali snapshot and "Worth watching" (TurningPointsCard) were removed
  //    2026-10-27 (user decision). ──
  const marketChapter = (
    <section id="market" className={CHAPTER}>
      {head("chMarket", <IconGrid size={16} />)}
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
      {/* The market's quarterly results — every reader; only free readers
          get the Premium line under it. */}
      {bundle?.results_week && (
        <div data-card="results-promo">
          <ResultsPromoCard
            week={bundle.results_week}
            held={heldSet}
            watched={watchedSet}
            lang={lang}
            premium={planState === "premium"}
          />
        </div>
      )}
      <div data-card="market-links">
        <MarketLinks lang={lang} />
      </div>
    </section>
  );

  // ── Chapter 3: Find stocks — the screener card (goal chips + top three),
  //    then ONE swipe rail for buy signals / top ranked / trending / tips /
  //    popular, then the research lists. The "3 stocks worth a look / picked
  //    for you" opener (TodaysIdeas) was removed 2026-10-26 (user decision).
  //    Three different kinds of block, so they get more air between them than
  //    the other chapters' card pairs, and each says in one line what it is. ──
  const ideasChapter = (
    <section id="ideas" className="dash-section space-y-5">
      {head("chIdeas", <IconSparkle size={16} />, t(lang, "chIdeasSub"))}
      <div className="space-y-10">
        {freeReportCard}
        {(bundle?.screener?.goals?.length ?? 0) > 0 && (
          <div data-card="screener">
            <ScreenerCard
              goals={bundle?.screener?.goals}
              saved={bundle?.screener?.saved}
              held={heldSet}
              watched={watchedSet}
              lang={lang}
            />
          </div>
        )}
        <div data-card="discover">
          <DiscoverRail
            buys={buys}
            stocks={allStocks}
            trending={top20}
            popular={popular}
            tips={tips}
            held={heldSet}
            watched={watchedSet}
            lang={lang}
          />
        </div>
        <div data-card="research-lists">
          <ResearchRail lists={bundle?.research_lists} held={heldSet} watched={watchedSet} lang={lang} />
        </div>
      </div>
    </section>
  );

  // Onboarding checklist — build a watchlist. Sits below
  // the money chapter so a returning user never meets "Finish setting up"
  // before their own money. Renders nothing once done.
  const setup = (
    <div data-card="setup">
      <DailyBriefing hasWatchlist={hasWatchlist} />
    </div>
  );

  // ── Chapter 5: Learn — two short reads that rotate daily (three Bengali
  //    beginner guides for a brand-new account) + the way out to every other
  //    page. ──
  const learnChapter = (
    <section id="learn" className={CHAPTER}>
      {head("chLearn", <IconBook size={16} />)}
      <div className={PAIR}>
        <div data-card="learn">
          <LearnCard brandNew={isBrandNew} lang={lang} />
        </div>
        <div data-card="explore">
          <ExploreLinks lang={lang} />
        </div>
      </div>
    </section>
  );

  return (
    <PullToRefresh onRefresh={() => runFetches()}>
    <div className="pb-4" onClickCapture={onTap}>
      {/* ── Chapter 1: the greeting open on the canvas, then the
          money card, then the four-number glance strip. ── */}
      <section id="money" className="dash-section mt-5 space-y-4" data-card="money">
        <HeroGreeting
          name={user?.display_name}
          dateStr={dateStr}
          isNew={isNewUser}
          updates={bundleSettled && (hasPortfolio || hasWatchlist) ? updatesCount : null}
          lang={lang}
          onLang={onLang}
        />
        {holdings === null ? (
          // Portfolio not known yet → hold the card's space so nothing below
          // jumps when it resolves (kills the ghost↔MoneyHero shift).
          <MoneyHeroSkeleton />
        ) : hasPortfolio ? (
          <MoneyHero holdings={holdings} priceMap={priceMap} marketIndex={marketIndex} lang={lang} />
        ) : (
          <MoneyHeroGhost lang={lang} />
        )}
        <GlanceStrip
          index={marketIndex}
          followedCodes={followedCodes}
          priceMap={priceMap}
          dividends={dividends}
          calendarRows={calendarRows}
          when={when}
          lang={lang}
        />
      </section>

      {/* Sticky chapter chips — the page is a long daily read. */}
      <DashSectionNav items={navItems} lang={lang} />

      <div className="mt-4 space-y-12 sm:space-y-10">
        {/* The rest of "your money" — what happened on your stocks (news and
            new results included), then the watcher's week. */}
        {stocksCard && (
          <section className="space-y-6 sm:space-y-3">
            {stocksCard}
            {weekCard}
          </section>
        )}
        {marketChapter}
        {ideasChapter}
        {dividendsChapter}
        {setup}
        {learnChapter}
        {/* Mobile-only install CTA — auto-hides once installed / dismissed. */}
        <InstallHomeBanner />
      </div>
    </div>
    </PullToRefresh>
  );
}
