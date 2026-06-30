/**
 * The daily brief — the opening message for a returning user. Reuses the exact
 * data + builders that power the home "what's new" bell (buildHomeAlerts,
 * portfolioTodayMove) so the chat and the dashboard tell one story. Every fetch
 * is guarded; a logged-out or empty user still gets a market snapshot + a tip so
 * there's always a daily reason to open the chat.
 */
import { isLoggedIn } from "@/lib/auth";
import {
  apiGetPortfolio,
  getWatchlistNews,
  getNearExtremes,
  getDividendsUpcoming,
  getDailyTips,
  type ScoreItem,
  type PortfolioHolding,
  type PriceAlert,
} from "@/lib/api";
import { loadWatchlist } from "@/lib/watchlist";
import { loadAlerts } from "@/lib/price-alerts";
import { buildHomeAlerts } from "@/lib/home-alerts";
import { portfolioTodayMove } from "@/lib/portfolio-analysis";
import { getStreak } from "@/lib/streak";
import { loadScoreUniverse, indexByCode } from "../company-index";
import { marketPulseResponder } from "./marketPulse";
import { STARTER_CHIPS } from "../chips";
import { COPY } from "../copy";
import type { BriefRow, Chip, MessageBlock, MetricTone } from "../types";

function todayKey(): string {
  return new Date().toDateString();
}

async function appendTip(blocks: MessageBlock[]): Promise<void> {
  try {
    const tip = (await getDailyTips()).tips?.[0];
    if (tip?.text) blocks.push({ type: "text", text: `💡 ${tip.text}` });
  } catch {
    /* tips are optional */
  }
}

function briefFollowUps(hasPortfolio: boolean, hasWatchlist: boolean): Chip[] {
  const F = COPY.followups;
  const chips: Chip[] = [];
  if (hasPortfolio) chips.push({ label: F.myPortfolio.label, labelBn: F.myPortfolio.bn, emoji: "📂", action: { intentId: "my_portfolio" } });
  if (hasWatchlist) chips.push({ label: F.myWatchlist.label, labelBn: F.myWatchlist.bn, emoji: "⭐", action: { intentId: "my_watchlist" } });
  if (hasWatchlist) chips.push({ label: F.myNews.label, labelBn: F.myNews.bn, emoji: "📰", action: { intentId: "my_news" } });
  chips.push({ label: F.market.label, labelBn: F.market.bn, emoji: "📊", action: { intentId: "market_pulse" } });
  return chips;
}

const toneOf = (t: "positive" | "negative" | "neutral"): MetricTone =>
  t === "positive" ? "pos" : t === "negative" ? "neg" : "neutral";

export async function briefBlocks(): Promise<MessageBlock[]> {
  const loggedIn = isLoggedIn();

  let marketBlocks: MessageBlock[] = [];
  try {
    marketBlocks = await marketPulseResponder();
  } catch {
    marketBlocks = [];
  }

  const blocks: MessageBlock[] = [
    { type: "text", text: COPY.brief.headline, bn: COPY.brief.headlineBn },
  ];

  const streak = getStreak();
  if (streak && streak.current_streak >= 2) {
    blocks.push({
      type: "text",
      text: COPY.brief.streak(streak.current_streak),
      bn: COPY.brief.streakBn(streak.current_streak),
    });
  }

  // Logged-out: market + tip + a sign-in nudge.
  if (!loggedIn) {
    blocks.push(...marketBlocks);
    await appendTip(blocks);
    blocks.push({
      type: "text",
      text: COPY.brief.loggedOut,
      bn: COPY.brief.loggedOutBn,
      link: { href: "/login", label: COPY.brief.signIn },
    });
    blocks.push({ type: "chips", chips: STARTER_CHIPS, layout: "wrap" });
    return blocks;
  }

  // Logged-in: gather personal data (each guarded so one failure can't blank the brief).
  const [codes, holdings, priceMap, extremes, dividends, alerts] = await Promise.all([
    loadWatchlist().catch(() => [] as string[]),
    apiGetPortfolio().then((r) => r.holdings ?? []).catch(() => [] as PortfolioHolding[]),
    loadScoreUniverse().then(indexByCode).catch(() => new Map<string, ScoreItem>()),
    getNearExtremes().catch(() => null),
    getDividendsUpcoming().catch(() => null),
    loadAlerts().catch(() => [] as PriceAlert[]),
  ]);

  const news = codes.length ? await getWatchlistNews(codes).catch(() => []) : [];
  const todayMove = holdings.length ? portfolioTodayMove(holdings, priceMap) : null;
  const hasSetup = codes.length > 0 || holdings.length > 0;

  // Logged-in but nothing tracked yet → market + tip + a "set this up" nudge.
  if (!hasSetup) {
    blocks.push(...marketBlocks);
    await appendTip(blocks);
    blocks.push({ type: "text", text: COPY.brief.setup, bn: COPY.brief.setupBn });
    blocks.push({ type: "chips", chips: STARTER_CHIPS, layout: "wrap" });
    return blocks;
  }

  const alertRows = buildHomeAlerts({
    codes,
    priceMap,
    todayMove,
    extremes,
    dividends,
    news,
    triggeredAlerts: alerts,
    dateKey: todayKey(),
  });

  if (alertRows.length) {
    const rows: BriefRow[] = alertRows.slice(0, 6).map((a) => ({
      emoji: a.emoji,
      title: a.title,
      detail: a.detail,
      href: a.href,
      tone: toneOf(a.tone),
    }));
    blocks.push({ type: "brief", rows });
  } else {
    blocks.push({ type: "text", text: COPY.brief.nothingPersonal, bn: COPY.brief.nothingPersonalBn });
  }

  blocks.push(...marketBlocks);
  await appendTip(blocks);
  blocks.push({
    type: "chips",
    chips: briefFollowUps(holdings.length > 0, codes.length > 0),
    layout: "wrap",
  });
  blocks.push({ type: "disclaimer" });
  return blocks;
}
