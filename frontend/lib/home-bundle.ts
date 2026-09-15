/**
 * Loads the logged-in homepage bundle.
 *
 * One request to `/api/user/home` in the normal case. If that endpoint is not
 * there yet (the Vercel frontend usually deploys before the Render backend) or
 * fails, the same shape is assembled from the individual endpoints the page
 * used before — so the dashboard never blanks during a deploy.
 */
import {
  apiGetHomeBundle,
  apiGetPortfolio,
  apiGetWatchlist,
  apiGetAlerts,
  apiGetSignalEvents,
  getDailyPicks,
  getDailyTips,
  getWatchlistNews,
  getMarketIndex,
  getDividendsUpcoming,
  getNearExtremes,
  getMarketMovers,
  getTodaysNews,
  getTop20,
  getPopularStocks,
  getDividendCalendar,
  type HomeBundle,
} from "@/lib/api";

async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

async function legacyBundle(): Promise<HomeBundle> {
  const [portfolio, watchlist, alerts, events, picks, tips, index, dividends, extremes] = await Promise.all([
    settle(apiGetPortfolio(), { holdings: [] }),
    settle(apiGetWatchlist(), { codes: [] }),
    settle(apiGetAlerts(), { alerts: [] }),
    settle(apiGetSignalEvents(), { events: [] }),
    settle(getDailyPicks(), null),
    settle(getDailyTips(), { date: null, tips: [] }),
    settle(getMarketIndex(), null),
    settle(getDividendsUpcoming(), { upcoming_declarations: [], upcoming_record_dates: [] }),
    settle(getNearExtremes(), null),
  ]);
  const codes = Array.from(
    new Set([
      ...(watchlist.codes ?? []).map((c) => c.toUpperCase()),
      ...(portfolio.holdings ?? []).map((h) => h.trading_code.toUpperCase()),
    ]),
  ).sort();
  const [news, movers, marketNews, top20, popular, calendar] = await Promise.all([
    codes.length ? settle(getWatchlistNews(codes), []) : Promise.resolve([]),
    settle(getMarketMovers(), null),
    settle(getTodaysNews(), []),
    settle(getTop20(), null),
    settle(getPopularStocks(), null),
    settle(getDividendCalendar(), null),
  ]);
  return {
    generated_at: new Date().toISOString(),
    holdings: portfolio.holdings ?? [],
    watchlist,
    alerts: alerts.alerts ?? [],
    signal_events: events.events ?? [],
    daily_picks: picks,
    tips,
    news,
    market_index: index,
    dividends,
    near_extremes: extremes,
    dividend_cash: [],
    report_codes: [],
    summaries_bn: {},
    movers,
    market_news: marketNews.slice(0, 12),
    top20: top20?.items?.slice(0, 8) ?? [],
    popular: popular?.items?.slice(0, 8) ?? [],
    calendar: {
      record_dates: (calendar?.record_dates ?? []).filter(
        (e) => e.record_days_left != null && e.record_days_left >= 0 && e.record_days_left <= 14,
      ).slice(0, 12),
      recent_declarations: (calendar?.recent_declarations ?? []).slice(0, 5),
    },
  };
}

export async function loadHomeBundle(): Promise<HomeBundle> {
  try {
    return await apiGetHomeBundle();
  } catch (err) {
    // AUTH_EXPIRED must surface (apiAuthFetch already logged the user out).
    if (err instanceof Error && err.message === "AUTH_EXPIRED") throw err;
    return legacyBundle();
  }
}
