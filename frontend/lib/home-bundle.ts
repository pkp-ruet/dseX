/**
 * Loads the logged-in homepage bundle.
 *
 * One request to `/api/user/home` in the normal case. If that endpoint is not
 * there yet (a frontend deploy that lands before the backend) or fails, the
 * same shape is assembled from the individual endpoints — so the home never
 * blanks during a deploy. An older backend's bundle has no `feed`: the home
 * then reads the feed itself (`apiGetNotifications`).
 */
import {
  apiGetHomeBundle,
  apiGetNotifications,
  apiGetPortfolio,
  apiGetWatchlist,
  apiGetAlerts,
  getMarketIndex,
  getNearExtremes,
  type HomeBundle,
  type HomeFeed,
} from "@/lib/api";

async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/** The Updates feed, light, for the home (a letter's parts and a brief's items stay on Updates). */
async function loadFeed(): Promise<HomeFeed | null> {
  const f = await settle(apiGetNotifications(), null);
  if (!f) return null;
  return {
    items: f.items.slice(0, 40).map(({ parts: _p, items: _i, ...rest }) => rest),
    unread: f.unread,
    has_shares: f.has_shares,
    premium: f.premium,
  };
}

async function legacyBundle(): Promise<HomeBundle> {
  const [portfolio, watchlist, alerts, index, extremes, feed] = await Promise.all([
    settle(apiGetPortfolio(), { holdings: [] }),
    settle(apiGetWatchlist(), { codes: [] }),
    settle(apiGetAlerts(), { alerts: [] }),
    settle(getMarketIndex(), null),
    settle(getNearExtremes(), null),
    loadFeed(),
  ]);
  return {
    generated_at: new Date().toISOString(),
    holdings: portfolio.holdings ?? [],
    watchlist,
    alerts: alerts.alerts ?? [],
    market_index: index,
    near_extremes: extremes,
    dividend_cash: [],
    feed,
  };
}

export async function loadHomeBundle(): Promise<HomeBundle> {
  try {
    const b = await apiGetHomeBundle();
    // A backend from before 2026-11-25 sends no feed.
    if (!("feed" in b)) return { ...b, feed: await loadFeed() };
    return b;
  } catch (err) {
    // AUTH_EXPIRED must surface (apiAuthFetch already logged the user out).
    if (err instanceof Error && err.message === "AUTH_EXPIRED") throw err;
    return legacyBundle();
  }
}
