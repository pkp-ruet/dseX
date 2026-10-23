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
import { useMediaQuery } from "@/lib/use-media-query";

import DailyBriefing from "@/components/home/personalized/DailyBriefing";
import HeroGreeting from "@/components/home/personalized/HeroGreeting";
import MoneyHero, { MoneyHeroSkeleton } from "@/components/home/personalized/MoneyHero";
import MoneyHeroGhost from "@/components/home/personalized/MoneyHeroGhost";
import AttentionStrip from "@/components/home/personalized/AttentionStrip";
import PullToRefresh from "@/components/home/personalized/PullToRefresh";
import MyStocksToday from "@/components/home/personalized/MyStocksToday";
import TodaysIdeas from "@/components/home/personalized/TodaysIdeas";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import MarketTodayCard from "@/components/home/personalized/MarketTodayCard";
import MoversCard from "@/components/home/personalized/MoversCard";
import SectorsWeekCard from "@/components/home/personalized/SectorsWeekCard";
import MarketNewsCard from "@/components/home/personalized/MarketNewsCard";
import BanglaSnapshotCard from "@/components/home/personalized/BanglaSnapshotCard";
import TurningPointsCard from "@/components/home/personalized/TurningPointsCard";
import ListsRail from "@/components/home/personalized/ListsRail";
import DiscoverRail from "@/components/home/personalized/DiscoverRail";
import GlanceStrip from "@/components/home/personalized/GlanceStrip";
import DividendBoardCard from "@/components/home/personalized/DividendBoardCard";
import LearnCard from "@/components/home/personalized/LearnCard";
import ExploreLinks from "@/components/home/personalized/ExploreLinks";
import NewsPeek from "@/components/home/personalized/NewsPeek";
import ChapterHead from "@/components/home/personalized/ChapterHead";
import { IconBook, IconCoin, IconGrid, IconSparkle, IconWallet } from "@/components/home/personalized/DashIcons";
import DashSectionNav, { type DashNavItem } from "@/components/home/personalized/DashSectionNav";
import StickyAside from "@/components/home/personalized/StickyAside";
import { HeaderChip } from "@/components/home/personalized/DashHeader";
import InstallHomeBanner from "@/components/pwa/InstallHomeBanner";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

/** Placeholder matching TodaysIdeas' shape — shown while the bundle is still
 *  in flight so the section doesn't pop in. */
function IdeasSkeleton() {
  return (
    <div className="soft-card dash-box overflow-hidden" aria-hidden>
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
 *  row would widen the whole page instead of being contained. `.dash-pair`
 *  stretches both cards to the taller one's height so a pair ends on one line.
 *  On a phone the flat sections get 24px between them (`gap-6`). */
const PAIR = "dash-pair grid grid-cols-1 gap-6 sm:gap-3 md:grid-cols-2 [&>*:only-child]:md:col-span-2";
/** The wide layout's main column is ~630px — one card per row there. */
const STACK = "dash-pair grid grid-cols-1 gap-3";
/** Space between the blocks inside one chapter. */
const CHAPTER = "dash-section space-y-6 sm:space-y-3";

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

  // From 1024px the reader's own stocks move into a side column, so they stay
  // in view while the market chapters scroll past. Market-wide blocks (the
  // dividend board included) stay in the main column.
  const isWide = useMediaQuery("(min-width: 1024px)");
  const split = isWide && (hasPortfolio || hasWatchlist);

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

  const pair = split ? STACK : PAIR;
  // Chapter title, with its Bengali line under it in English mode.
  const head = (key: "chMoney" | "chMarket" | "chIdeas" | "chDividends" | "chLearn", icon: React.ReactNode) => (
    <ChapterHead label={t(lang, key)} bn={bn ? undefined : t("bn", key)} lang={lang} icon={icon} />
  );

  // ── The reader's own blocks — a pair grid on phones/tablets, the sticky
  //    side column from 1024px. ──
  const stocksCard =
    hasPortfolio || hasWatchlist ? (
      <div data-card="stocks">
        <MyStocksToday
          holdings={holdings ?? []}
          codes={codes}
          priceMap={priceMap}
          extremes={extremes}
          dividends={dividends}
          alerts={priceAlerts}
          reportCodes={reportCodes}
          compact={split}
          lang={lang}
        />
      </div>
    ) : null;
  const attentionCard =
    attention.length > 0 ? (
      <div data-card="attention">
        <AttentionStrip alerts={attention} lang={lang} />
      </div>
    ) : null;
  const newsCard =
    news.length > 0 ? (
      <div data-card="news">
        <NewsPeek
          news={news}
          loading={false}
          title={t(lang, "newsOnYourStocks")}
          moreHref={hasWatchlist ? "/watchlist" : "/todays-news"}
          moreLabel={t(lang, "seeAll")}
        />
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

  // ── Chapter 2: Market today — the whole day without leaving the page:
  //    mood + index + sparkline, movers, sectors, market news, the Bengali
  //    paragraph, and what is near a turning point. ──
  const marketChapter = (
    <section id="market" className={CHAPTER}>
      {head("chMarket", <IconGrid size={16} />)}
      <div className={pair}>
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
        <div className={pair}>
          {sectorRows.length > 0 && (
            <div data-card="sectors">
              <SectorsWeekCard sectors={sectorRows} lang={lang} />
            </div>
          )}
          {(marketNews.length > 0 || marketState?.summary_bn) && (
            <div className="space-y-6 sm:space-y-3">
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
  );

  // ── Chapter 3: Worth a look — the three-stock opener, then ONE swipe rail
  //    for buy signals / top ranked / trending / tips / popular (five full
  //    cards until 2026-10-24), then the ready-made lists rail. ──
  const ideasChapter = (
    <section id="ideas" className={CHAPTER}>
      {head("chIdeas", <IconSparkle size={16} />)}
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
      {marketState?.chances && (
        <div data-card="lists">
          <ListsRail chances={marketState.chances} held={heldSet} watched={watchedSet} lang={lang} />
        </div>
      )}
    </section>
  );

  // Onboarding checklist — build a watchlist + personalize picks. Sits below
  // the money chapter so a returning user never meets "Finish setting up"
  // before their own money. Renders nothing once done.
  const setup = (
    <div data-card="setup">
      <DailyBriefing hasWatchlist={hasWatchlist} hasTuned={hasTuned} onPersonalize={() => setTuneOpen(true)} />
    </div>
  );

  // ── Chapter 5: Learn — two short reads that rotate daily (three Bengali
  //    beginner guides for a brand-new account) + the way out to every other
  //    page. ──
  const learnChapter = (
    <section id="learn" className={CHAPTER}>
      {head("chLearn", <IconBook size={16} />)}
      <div className={pair}>
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
      {/* ── Chapter 1: the greeting + daily brief open on the canvas, then the
          money card, then the four-number glance strip. ── */}
      <section id="money" className="dash-section mt-5 space-y-4" data-card="money">
        <HeroGreeting
          name={user?.display_name}
          dateStr={dateStr}
          isNew={isNewUser}
          brief={briefSegments}
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

      {split ? (
        <div className="dash-split mt-4">
          <div className="min-w-0 space-y-12">
            {marketChapter}
            {ideasChapter}
            {dividendsChapter}
            {setup}
            {learnChapter}
          </div>
          {/* Your stocks first (the reason to keep the column), then what
              needs attention, your news. The title lines up with "Market
              today" on the left. */}
          <StickyAside label={t(lang, "chMoney")}>
            {head("chMoney", <IconWallet size={16} />)}
            {stocksCard}
            {attentionCard}
            {newsCard}
          </StickyAside>
        </div>
      ) : (
        <div className="mt-4 space-y-12 sm:space-y-10">
          {/* The rest of "your money" — your stocks, then what needs
              attention + your news. */}
          {stocksCard && (
            <section className="space-y-6 sm:space-y-3">
              {stocksCard}
              {(attentionCard || newsCard) && (
                <div className={PAIR}>
                  {attentionCard}
                  {newsCard}
                </div>
              )}
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
      )}

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
