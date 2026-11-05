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
  apiGetForYou,
  getWatchlistNews,
  getMarketIndex,
  getDividendsUpcoming,
  getNearExtremes,
  getMarketMovers,
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
  const [portfolio, watchlist, alerts, forYou, index, dividends, extremes] = await Promise.all([
    settle(apiGetPortfolio(), { holdings: [] }),
    settle(apiGetWatchlist(), { codes: [] }),
    settle(apiGetAlerts(), { alerts: [] }),
    settle(apiGetForYou(), null),
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
  const [news, movers, calendar] = await Promise.all([
    codes.length ? settle(getWatchlistNews(codes), []) : Promise.resolve([]),
    settle(getMarketMovers(), null),
    settle(getDividendCalendar(), null),
  ]);
  return {
    generated_at: new Date().toISOString(),
    holdings: portfolio.holdings ?? [],
    watchlist,
    alerts: alerts.alerts ?? [],
    news,
    market_index: index,
    dividends,
    near_extremes: extremes,
    dividend_cash: [],
    movers,
    // The research figures come only with the bundle; the card shows the
    // reports without them.
    research: null,
    calendar: {
      record_dates: (calendar?.record_dates ?? []).filter(
        (e) => e.record_days_left != null && e.record_days_left >= 0 && e.record_days_left <= 14,
      ).slice(0, 12),
      recent_declarations: (calendar?.recent_declarations ?? []).slice(0, 5),
    },
    new_results: [],
    results_week: null,
    week_watch: null,
    // The ready-made screens come only with the bundle; the card hides without them.
    screener: null,
    for_you: forYou,
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
