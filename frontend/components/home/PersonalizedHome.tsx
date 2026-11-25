"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { usePremium } from "@/lib/premium";
import {
  getScores,
  getMarketState,
  getHomeToday,
  type HomeBundle,
  type HomeToday,
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
import { shortcutBadges } from "@/lib/home-today";

import PullToRefresh from "@/components/home/personalized/PullToRefresh";
import HomeHeader from "@/components/home/personalized/HomeHeader";
import YourShares from "@/components/home/personalized/YourShares";
import HomeCard from "@/components/home/personalized/HomeCard";
import MarketLine from "@/components/home/personalized/MarketLine";
import RecentShares from "@/components/home/daily/RecentShares";
import Shortcuts from "@/components/home/daily/Shortcuts";
import WeekOnDse from "@/components/home/daily/WeekOnDse";
import TodaysLists from "@/components/home/daily/TodaysLists";
import ExploreSite from "@/components/home/daily/ExploreSite";

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
 *
 * The fuller home (2026-11-25, later the same day — user: "the homepage looks
 * so small and empty. user has to find everything from menus", then "Build
 * all five" on https://claude.ai/artifact/RX71QgzkFto62nrNpZWZjm). Five
 * blocks came back as doors, never as explanations:
 *   A recently opened shares under the search (this device)
 *   B eight shortcuts in fixed places, one daily number at most
 *   — the four blocks and the card as above —
 *   C this week on the DSE: record dates and results meetings, five days
 *   D today's lists: Buy List, strongest companies, results this week
 *   E explore: the four tabs with every page, and today's read
 * C, D and the shortcut numbers read `/api/home/today` (the same for every
 * reader); the reader's own shares are marked here.
 *
 * "New on your shares" left the home the same evening (user: "remove New on
 * your shares from homepage only keep your shares"): Your shares carries one
 * status a share (the next date, else the newest update from 3 days), and
 * every update is on Updates (the bell) and My shares.
 */
export default function PersonalizedHome() {
  const { user } = useAuth();
  const { lang } = useLang();
  const { isPremium } = usePremium();
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
  // The home's daily public part (week strip, today's lists, shortcut numbers).
  const [today, setToday] = useState<HomeToday | null>(() => readCache<HomeToday>(cacheKeys.homeToday));
  // True only on the first render right after signup (one-shot flag).
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (consumeJustSignedUp()) setIsNewUser(true);
  }, []);

  // FOUR requests: the personal bundle, the scores, the market state and the
  // home's daily public part (the same answer for every reader). The
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
        getHomeToday()
          .then((d) => {
            if (!isAlive()) return;
            setToday(d);
            writeCache(cacheKeys.homeToday, d);
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

  const isoToday = bstDateStr();
  // Short, so the date line has room for the market state and the price time.
  const dateStr = bn
    ? bnDate(isoToday, true).replace(/\s\d{4}$/, "")
    : new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

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

  // The reader's own codes, for H / ★ in the week strip and "2 are your shares".
  const held = useMemo(() => [...new Set((holdings ?? []).map((h) => h.trading_code.toUpperCase()))], [holdings]);
  const watched = useMemo(() => codes.map((c) => c.toUpperCase()).filter((c) => !held.includes(c)), [codes, held]);
  const mine = useMemo(() => new Set([...held, ...watched]), [held, watched]);
  const badges = useMemo(() => shortcutBadges(today), [today]);
  // A day-old copy from the device would show yesterday's week as today's.
  const todayFresh = today && today.as_of === isoToday ? today : null;

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
            holdings={holdings}
            priceMap={priceMap}
            todayMove={todayMove}
            when={when}
            lang={lang}
          />
          <RecentShares lang={lang} priceMap={priceMap} />
        </div>

        <Shortcuts lang={lang} badges={todayFresh ? badges : {}} crowns={!isPremium} />


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

        {todayFresh?.days && (
          <WeekOnDse key={todayFresh.as_of} lang={lang} days={todayFresh.days} todayIso={isoToday} held={held} watched={watched} />
        )}

        <TodaysLists lang={lang} data={todayFresh} mine={mine} premium={isPremium} />

        <ExploreSite lang={lang} crowns={!isPremium} todayIso={isoToday} />
      </div>
    </PullToRefresh>
  );
}
