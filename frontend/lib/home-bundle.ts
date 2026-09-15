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
  const news = codes.length ? await settle(getWatchlistNews(codes), []) : [];
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
