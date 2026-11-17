"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
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
import { buildStories, buildStarterStories } from "@/lib/dash-stories";
import { marketSession, isTradingDay, bstDateStr } from "@/lib/market-hours";
import { bnDate } from "@/lib/bn";
import { trackHomeTap } from "@/lib/track";

import PullToRefresh from "@/components/home/personalized/PullToRefresh";
import StoriesRow from "@/components/home/personalized/StoriesRow";
import HomeHeader from "@/components/home/personalized/HomeHeader";
import ServiceGrid from "@/components/home/personalized/ServiceGrid";
import OfferSlot from "@/components/home/personalized/OfferSlot";
import MarketLine from "@/components/home/personalized/MarketLine";
import TodayForYou from "@/components/home/personalized/TodayForYou";
import RecentStrip from "@/components/home/personalized/RecentStrip";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

const EMPTY_DIVIDENDS = { upcoming_declarations: [], upcoming_record_dates: [] };
const EMPTY_SET = new Set<string>();

export default function PersonalizedHome() {
  const { user } = useAuth();
  const { lang } = useLang();
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
  const extremes = bundle?.near_extremes ?? null;
  const dividends = bundle?.dividends ?? EMPTY_DIVIDENDS;
  const marketIndex = bundle?.market_index ?? null;
  const dividendCash = bundle?.dividend_cash ?? [];
  const movers = bundle?.movers ?? null;
  const calendarRows = bundle?.calendar?.record_dates ?? [];

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

  // The reader's own codes: Today for you names their record dates for free.
  const mineSet = useMemo(() => new Set([...heldSet, ...watchedSet]), [heldSet, watchedSet]);

  // Portfolio move today (the portfolio button shows it, and the Today story's first frame).
  const todayMove = hasPortfolio ? portfolioTodayMove(holdings!, priceMap, bundle?.ex_moves) : null;

  // Before the open (or on a non-trading day) the prices are the previous
  // close — the glance strip must not say "today" at 9 AM.
  const when = marketSession() === "pre" || !isTradingDay() ? "last" : "today";

  // Stories (2026-10-28, replaced "Your stocks today" + "This week on your
  // stocks"): a Today ring, then one ring per stock with something to say,
  // all built from data already loaded. Every story is open to every reader
  // (2026-10-31; the 3-story cap and its Premium ring are gone). A reader with
  // no stocks gets market stories ending in "add your stocks".
  const premium = planState === "premium";
  const ownStories = buildStories({
    lang,
    premium,
    when,
    todayIso: isoToday,
    holdings: holdings ?? [],
    watchlist: codes,
    priceMap,
    todayMove,
    marketIndex,
    alerts: priceAlerts,
    results: newResults,
    unusual: marketState?.next?.unusual ?? [],
    extremes,
    dividends,
    dividendCash,
    news,
    week: bundle?.week_watch ?? null,
    // Saved screens are re-checked only while Premium — a lapsed plan's news is stale.
    savedScreens: premium ? bundle?.screener?.saved ?? [] : [],
    resultsSoon: bundle?.results_soon ?? [],
    brief: premium ? bundle?.brief ?? null : null,
    exMoves: bundle?.ex_moves ?? {},
  });
  const stories = isBrandNew
    ? buildStarterStories({
        lang,
        when,
        todayIso: isoToday,
        mood: marketState?.mood ?? null,
        marketIndex,
        movers,
        recordDates: calendarRows,
        premium,
      })
    : ownStories;
  const quietStories = !isBrandNew && (hasPortfolio || hasWatchlist) && ownStories.every((st) => st.kind === "today");

  // Gold counts on the icons: the Buy List's joiners this week, Discover's new picks today.
  const forYouNew = bundle?.for_you && !isBrandNew ? (bundle.for_you.counts?.new ?? bundle.for_you.new ?? 0) : 0;
  const badges = { buylist: bundle?.buy_list?.week_joined ?? 0, discover: forYouNew };

  // One delegated listener: any link tapped inside a `[data-card]` wrapper
  // records which card it came from. No per-component wiring.
  function onTap(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement | null;
    const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    const card = link.closest("[data-card]")?.getAttribute("data-card");
    if (card) trackHomeTap(card, link.getAttribute("href") ?? undefined);
  }

  // The bKash-style home (2026-11-17, mockup
  // https://claude.ai/artifact/PzbGUGyZQpwFEpCTTo5jDJ). Six blocks, one job
  // each; the page behind every icon / row does the explaining and the selling:
  //   1 the band: greeting + ONE button for the reader's money (hidden until
  //     tapped on a new device, then remembered)
  //   2 what you can do: 8 icons + See more (replaced the screener, compare,
  //     ranking, research, learn and explore cards)
  //   3 one offer slot, swipe only (the ৳99 month, the Premium banner, the
  //     install card and the setup step share it)
  //   4 the story rings, unchanged, beside 5 the market in one line
  //   6 today for you: Buy List · record dates · Discover, counts for a free
  //     reader, names for Premium (replaced the Buy List, dividend and Picked
  //     for you cards)
  return (
    <PullToRefresh onRefresh={() => runFetches()}>
      <div className="hm pb-4" onClickCapture={onTap}>
        <div className="hm-top">
          <HomeHeader
            name={user?.display_name}
            dateStr={dateStr}
            isNew={isNewUser}
            premium={premium}
            holdings={holdings}
            priceMap={priceMap}
            todayMove={todayMove}
            when={when}
            lang={lang}
          />
          <ServiceGrid lang={lang} premium={premium} badges={badges} />
        </div>

        {/* The last shares opened on this device, one tap back (+ the free analyses left). */}
        <RecentStrip lang={lang} premium={premium} priceMap={priceMap} reportKeys={user?.report_keys ?? null} />

        <OfferSlot
          lang={lang}
          brandNew={isBrandNew}
          hasWatchlist={hasWatchlist}
          hasPortfolio={hasPortfolio}
          week={bundle?.week_watch ?? null}
          brief={premium ? bundle?.brief ?? null : null}
          research={bundle?.research ?? null}
        />

        <div className="hm-side">
          <div data-card="stories">
            <StoriesRow
              stories={stories}
              loading={holdings === null || ((hasPortfolio || hasWatchlist) && priceMap.size === 0)}
              quiet={quietStories}
              starter={isBrandNew}
              userId={userId}
              lang={lang}
            />
          </div>
          <MarketLine
            index={marketIndex}
            mood={marketState?.mood ?? null}
            history={marketState?.history ?? null}
            lang={lang}
          />
        </div>

        <TodayForYou
          lang={lang}
          premium={premium}
          loading={!bundle && !bundleSettled}
          buyList={bundle?.buy_list ?? null}
          recordDates={calendarRows}
          forYou={bundle?.for_you ?? null}
          mine={mineSet}
          todayIso={isoToday}
          resultsSoon={bundle?.results_soon ?? []}
          ownDividends={dividendCash}
        />
      </div>
    </PullToRefresh>
  );
}
