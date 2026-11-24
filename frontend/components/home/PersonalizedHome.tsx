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
import { primeAlerts } from "@/lib/price-alerts";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import { consumeJustSignedUp } from "@/lib/welcome";
import { portfolioTodayMove } from "@/lib/portfolio-analysis";
import { visibleFeed } from "@/lib/feed";
import { buildDates } from "@/lib/home-dates";
import { marketSession, isTradingDay, bstDateStr } from "@/lib/market-hours";
import { bnDate } from "@/lib/bn";
import { trackHomeTap } from "@/lib/track";

import PullToRefresh from "@/components/home/personalized/PullToRefresh";
import HomeHeader from "@/components/home/personalized/HomeHeader";
import OnYourShares from "@/components/home/personalized/OnYourShares";
import YourShares from "@/components/home/personalized/YourShares";
import HomeCard from "@/components/home/personalized/HomeCard";
import MarketLine from "@/components/home/personalized/MarketLine";

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

/**
 * The signed-in home: four blocks and one card (2026-11-25, step 2 of the
 * simplify review https://claude.ai/artifact/VG8A1sU8F5q9grFDCsrHnb — user
 * decisions the same day: feed rows over story rings, the bottom bar as the
 * one menu, one Premium card). Home owns nothing; each block is a door to
 * one page and says nothing another block says.
 *   1 the band: greeting, ONE button for the reader's money, search (→ Portfolio)
 *   2 New on your shares: the Updates feed's newest rows, the next date (→ Updates)
 *   3 Your shares: what they own and watch, one status each (→ My shares)
 *   4 the market in one line (→ Market today)
 *   + at most one card, only when there's something to do (`HomeCard`)
 * Gone the same day: the icon grid and "What is each one?" (the bottom bar
 * is the menu), the story rings, the swipe slot, Today for you and the plan
 * chip. A brand-new account gets the band, the first-step card and the
 * market line.
 */
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
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem>>(() =>
    flatten(readCache<ScoresResponse>(cacheKeys.scores)),
  );
  const [marketState, setMarketState] = useState<MarketStateData | null>(
    () => readCache<MarketStateData>(cacheKeys.marketState),
  );
  // True only on the first render right after signup (one-shot flag).
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (consumeJustSignedUp()) setIsNewUser(true);
  }, []);

  // THREE requests: the personal bundle, the scores, the market state. The
  // bundle also feeds the shared watchlist + alerts stores, so the navbar
  // badge needs no request of its own.
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
    return () => {
      alive = false;
      unsub();
    };
  }, [runFetches]);

  // holdings: null while unknown, [] once we know there are none.
  const holdings = bundle ? bundle.holdings : bundleSettled ? [] : null;
  const marketIndex = bundle?.market_index ?? null;
  const hasWatchlist = codes.length > 0;
  const hasPortfolio = (holdings?.length ?? 0) > 0;
  const isBrandNew = holdings !== null && !hasPortfolio && !hasWatchlist;
  const loading = !bundle && !bundleSettled;

  const isoToday = bstDateStr();
  const dateStr = bn
    ? bnDate(isoToday, true)
    : new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  // The portfolio's move today (the money button shows it).
  const todayMove = hasPortfolio ? portfolioTodayMove(holdings!, priceMap, bundle?.ex_moves) : null;
  // Before the open (or on a non-trading day) the prices are the previous close.
  const when = marketSession() === "pre" || !isTradingDay() ? "last" : "today";

  // The feed rows this reader may see, and this week's dates: "New on your
  // shares" and the share rows read the same two lists.
  const feed = bundle?.feed;
  const shownFeed = useMemo(() => (feed ? visibleFeed(feed.items, feed.premium).shown : []), [feed]);
  const resultsSoon = bundle?.results_soon ?? [];
  const ownDividends = bundle?.dividend_cash ?? [];
  const dates = useMemo(() => buildDates(isoToday, resultsSoon, ownDividends), [isoToday, resultsSoon, ownDividends]);

  // One delegated listener: any link tapped inside a `[data-card]` wrapper
  // records which card it came from. No per-component wiring.
  function onTap(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement | null;
    const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    const card = link.closest("[data-card]")?.getAttribute("data-card");
    if (card) trackHomeTap(card, link.getAttribute("href") ?? undefined);
  }

  return (
    <PullToRefresh onRefresh={() => runFetches()}>
      <div className="hm pb-4" onClickCapture={onTap}>
        <div className="hm-top">
          <HomeHeader
            name={user?.display_name}
            dateStr={dateStr}
            isNew={isNewUser}
            premium={planState === "premium"}
            holdings={holdings}
            priceMap={priceMap}
            todayMove={todayMove}
            when={when}
            lang={lang}
          />
        </div>

        {!isBrandNew && (
          <OnYourShares
            lang={lang}
            feed={feed}
            loading={loading}
            todayIso={isoToday}
            resultsSoon={resultsSoon}
            ownDividends={ownDividends}
          />
        )}

        {!isBrandNew && (
          <YourShares
            lang={lang}
            holdings={holdings}
            watchlist={codes}
            priceMap={priceMap}
            exMoves={bundle?.ex_moves}
            shown={shownFeed}
            dates={dates}
            todayIso={isoToday}
          />
        )}

        <HomeCard
          lang={lang}
          brandNew={isBrandNew}
          hasShares={hasPortfolio || hasWatchlist}
          holdings={holdings}
          priceMap={priceMap}
        />

        <div className="hm-mline">
          <MarketLine
            index={marketIndex}
            mood={marketState?.mood ?? null}
            history={marketState?.history ?? null}
            lang={lang}
          />
        </div>
      </div>
    </PullToRefresh>
  );
}
