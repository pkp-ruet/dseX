"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
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
import TodaysIdeas from "@/components/home/personalized/TodaysIdeas";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import MarketTodayCard from "@/components/home/personalized/MarketTodayCard";
import ExploreLinks from "@/components/home/personalized/ExploreLinks";
import StartHereCard from "@/components/home/personalized/StartHereCard";
import NewsPeek from "@/components/home/personalized/NewsPeek";
import SearchBar from "@/components/home/SearchBar";
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
      className={`text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold mt-2 mb-3${bn ? " font-bn" : ""}`}
    >
      {children}
    </p>
  );
}

/** Placeholder matching TodaysIdeas' shape — shown while the bundle is still
 *  in flight so the section doesn't pop in. */
function IdeasSkeleton() {
  return (
    <div className="soft-card overflow-hidden" aria-hidden>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="h-3.5 w-40 animate-pulse rounded-full bg-[var(--surface-2)]" />
        <div className="h-3.5 w-16 animate-pulse rounded-full bg-[var(--surface-2)]" />
      </div>
      <div className="mx-4 mt-3 h-3.5 w-3/4 animate-pulse rounded-full bg-[var(--surface-2)] sm:mx-5" />
      <div className="space-y-px px-4 pb-2 pt-3 sm:px-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ))}
      </div>
    </div>
  );
}

/** Alerts that are NOT a price row — price moves and 52-week extremes live as
 *  chips on the "Your stocks today" rows, so they are not listed twice. */
const ATTENTION_KINDS = new Set<HomeAlertKind>(["target", "signal", "dividend"]);

const EMPTY_DIVIDENDS = { upcoming_declarations: [], upcoming_record_dates: [] };

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

  // THREE requests: the personal bundle, the scores, the market state. The
  // bundle also feeds the shared watchlist + alerts stores (navbar badge,
  // StarButtons) so those need no request of their own. `isAlive` lets the
  // mount effect cancel state writes after unmount; pull-to-refresh passes
  // the default (always alive) and awaits the promise.
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

  const hasWatchlist = codes.length > 0;
  const hasPortfolio = (holdings?.length ?? 0) > 0;
  const hasTuned = !!dailyPicks?.tuned;
  const isBrandNew = holdings !== null && !hasPortfolio && !hasWatchlist;

  const isoToday = bstDateStr();
  const dateStr = bn
    ? bnDate(isoToday, true)
    : new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const shortDate = bn
    ? bnDate(isoToday)
    : new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const allStocks = Array.from(priceMap.values());
  // Buy signals ride along on the scores already in priceMap — no extra fetch.
  const buys = allStocks.filter((s) => s.signal?.signal === "buy");
  const companies = allStocks.map((s) => ({ trading_code: s.trading_code, company_name: s.company_name }));
  const sectors = Array.from(
    new Set(allStocks.map((s) => s.sector).filter((x): x is string => Boolean(x))),
  ).sort();

  const followedCodes = Array.from(
    new Set([
      ...codes.map((c) => c.toUpperCase()),
      ...(holdings ?? []).map((h) => h.trading_code.toUpperCase()),
    ]),
  ).sort();

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
      {/* ── Bento: your dashboard (main column) + explore the market (aside) on
          desktop. Mobile keeps the single-column source order. ── */}
      <div className="mt-5 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
      <div className="space-y-6 lg:col-span-3">

      {/* ── Chapter 1: Your money — the brief + value hero → your stocks →
          what needs attention → news. The hero leads so a returning user's
          money is the first thing on screen. ── */}
      <section className="space-y-3">
        <div data-card="money">
          {holdings === null ? (
            // Portfolio not known yet → hold the hero's space so nothing below
            // jumps when it resolves (kills the ghost↔MoneyHero shift).
            <MoneyHeroSkeleton greeting={greeting} />
          ) : hasPortfolio ? (
            <MoneyHero holdings={holdings} priceMap={priceMap} marketIndex={marketIndex} greeting={greeting} lang={lang} />
          ) : (
            <MoneyHeroGhost greeting={greeting} lang={lang} />
          )}
        </div>

        {(hasPortfolio || hasWatchlist) && (
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
        )}

        {/* Targets hit, Buy More / Sell flips, dividends (with the cash a
            holder will be paid). Renders nothing on a quiet day. */}
        {attention.length > 0 && (
          <div data-card="attention">
            <AttentionStrip alerts={attention} lang={lang} />
          </div>
        )}

        {(hasWatchlist || hasPortfolio) && news.length > 0 && (
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

        {/* Look up any stock → its analysis page. Desktop only: on a phone the
            navbar pill and the bottom-bar Search button already cover it, and
            a third box here interrupted the money → news flow. */}
        {companies.length > 0 && (
          <div className="hidden pt-1 sm:block" data-card="search">
            <SectionLabel lang={lang}>{t(lang, "lookUpAnyStock")}</SectionLabel>
            <SearchBar companies={companies} variant="sidebar" />
          </div>
        )}

        {/* Mobile-only install CTA — auto-hides once installed / dismissed. */}
        <InstallHomeBanner />
      </section>

      {/* ── Chapter 2: Ideas — ONE plain list of three stocks, each with a
          company name, a plain reason and a kind word. No tabs. ── */}
      {(hasIdeas || ideasLoading) && (
        <section id="intelligence" className="scroll-mt-24" data-card="ideas">
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
                  {/* Date is already in the greeting above — drop it on narrow phones
                      so the title + "N new" + link fit on one header row. */}
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
        </section>
      )}

      {/* Onboarding checklist — build a watchlist + personalize picks. Sits
          BELOW the money chapter now: a returning user with a portfolio but no
          quiz used to meet "Finish setting up" before their own money. Renders
          nothing once both are done or it's dismissed. */}
      <div data-card="setup">
        <DailyBriefing
          hasWatchlist={hasWatchlist}
          hasTuned={hasTuned}
          onPersonalize={() => setTuneOpen(true)}
        />
      </div>

      {/* Brand-new account (no portfolio, no watchlist): three beginner guides
          from the Bengali blog. */}
      {isBrandNew && (
        <div data-card="start">
          <StartHereCard lang={lang} />
        </div>
      )}
      </div>
      {/* end main column */}

      {/* ── ASIDE: Explore the market — market snapshot + quick links.
          Becomes the right sidebar on desktop; stacks under the main column on
          mobile (source order preserved). ── */}
      <aside className="mt-8 lg:col-span-2 lg:mt-0 lg:sticky lg:top-20" data-card="market">
        <SectionLabel lang={lang}>{t(lang, "exploreMarket")}</SectionLabel>
        <div className="flex flex-col gap-6">
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
            lang={lang}
          />

          {/* Plain link rows out to the discovery pages — no preview tables,
              the full pages are one tap away. */}
          <div data-card="explore">
            <ExploreLinks lang={lang} />
          </div>
        </div>
      </aside>
      </div>
      {/* end bento grid */}

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
