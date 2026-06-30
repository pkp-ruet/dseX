/**
 * Personalized responders — read the signed-in user's own watchlist and
 * portfolio. Everything degrades gracefully: logged-out users get a friendly
 * "sign in" nudge, empty users get a "set this up" nudge, and any data failure
 * falls through to the dispatcher's error handling.
 */
import { isLoggedIn } from "@/lib/auth";
import {
  apiGetPortfolio,
  getWatchlistNews,
  getDividendsUpcoming,
  type PortfolioHolding,
  type ScoreItem,
} from "@/lib/api";
import { loadWatchlist } from "@/lib/watchlist";
import { pct, taka, formatDate, signed } from "@/lib/formatters";
import { loadScoreUniverse, indexByCode } from "../company-index";
import { analyzePortfolio, portfolioTodayMove, type ComputedRow } from "@/lib/portfolio-analysis";
import { STARTER_CHIPS } from "../chips";
import { COPY } from "../copy";
import type { Chip, MessageBlock, StockRow } from "../types";

/** "Sign in to use this" block. */
function signInBlocks(): MessageBlock[] {
  return [
    {
      type: "text",
      text: COPY.mine.signIn,
      bn: COPY.mine.signInBn,
      link: { href: "/login", label: COPY.brief.signIn },
    },
    { type: "chips", chips: STARTER_CHIPS, layout: "wrap" },
  ];
}

function priceMapOrEmpty(): Promise<Map<string, ScoreItem>> {
  return loadScoreUniverse()
    .then((u) => indexByCode(u))
    .catch(() => new Map<string, ScoreItem>());
}

export async function myWatchlistResponder(): Promise<MessageBlock[]> {
  if (!isLoggedIn()) return signInBlocks();
  const codes = await loadWatchlist();
  if (!codes.length) {
    return [{ type: "text", text: COPY.mine.watchlistEmpty, bn: COPY.mine.watchlistEmptyBn }];
  }
  const priceMap = await priceMapOrEmpty();
  const rows: StockRow[] = codes
    .map((c) => priceMap.get(c.toUpperCase()))
    .filter((s): s is ScoreItem => !!s)
    .sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0))
    .slice(0, 8)
    .map((s) => ({
      trading_code: s.trading_code,
      company_name: s.company_name,
      ltp: s.ltp,
      change_pct: s.change_pct,
      metricValue: s.score != null ? String(Math.round(s.score)) : "—",
      metricTone: "neutral" as const,
    }));

  if (!rows.length) {
    // Watched codes exist but no live prices resolved yet.
    return [{ type: "text", text: COPY.empty.text, bn: COPY.empty.bn }];
  }
  const up = rows.filter((r) => (r.change_pct ?? 0) > 0).length;
  return [
    { type: "text", text: COPY.mine.watchlistLead, bn: COPY.mine.watchlistLeadBn },
    {
      type: "stock-list",
      title: "Your watchlist",
      subtitle: `${up} up · ${rows.length - up} down today`,
      metricLabel: "Today",
      items: rows,
      seeAllHref: "/watchlist",
      seeAllLabel: "Open watchlist",
    },
  ];
}

export async function myPortfolioResponder(): Promise<MessageBlock[]> {
  if (!isLoggedIn()) return signInBlocks();
  let holdings: PortfolioHolding[] = [];
  try {
    holdings = (await apiGetPortfolio()).holdings ?? [];
  } catch {
    holdings = [];
  }
  if (!holdings.length) {
    return [
      {
        type: "text",
        text: COPY.mine.portfolioEmpty,
        bn: COPY.mine.portfolioEmptyBn,
        link: { href: "/portfolio", label: "Add holdings" },
      },
    ];
  }

  const priceMap = await priceMapOrEmpty();
  const rows: ComputedRow[] = holdings.map((h) => {
    const item = priceMap.get(h.trading_code.toUpperCase());
    const ltp = item?.ltp ?? null;
    const cost = h.buy_price * h.qty;
    const current = ltp != null ? ltp * h.qty : null;
    const pnl = current != null ? current - cost : null;
    return {
      holding: h,
      ltp,
      company_name: item?.company_name ?? null,
      cost_basis: cost,
      current_value: current,
      pnl,
      pnl_pct: pnl != null && cost > 0 ? (pnl / cost) * 100 : null,
    };
  });

  const totalCost = rows.reduce((a, r) => a + r.cost_basis, 0);
  const totalValue = rows.reduce((a, r) => a + (r.current_value ?? r.cost_basis), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const today = portfolioTodayMove(holdings, priceMap);
  const analysis = analyzePortfolio(rows, priceMap);

  const blocks: MessageBlock[] = [
    { type: "text", text: COPY.mine.portfolioLead, bn: COPY.mine.portfolioLeadBn },
    {
      type: "text",
      text: `Value ${taka(totalValue, 0)} · ${totalPnl >= 0 ? "Profit" : "Loss"} ${signed(totalPnl, 0)} (${signed(totalPnlPct, 1)}%)`,
    },
  ];
  if (today) {
    blocks.push({
      type: "text",
      text: `Today: ${today.delta >= 0 ? "up" : "down"} ৳${Math.abs(today.delta).toLocaleString("en-US", { maximumFractionDigits: 0 })} (${signed(today.pct, 2)}%)`,
    });
  }
  blocks.push({
    type: "text",
    text: `Overall grade: ${analysis.grade} — ${analysis.gradeLabel}.`,
  });
  // The single most useful action point, in the app's plain-English voice.
  const point = analysis.bad[0] ?? analysis.consider[0];
  if (point) blocks.push({ type: "text", text: `• ${point}` });
  blocks.push({
    type: "text",
    text: "",
    link: { href: "/portfolio", label: "Open portfolio" },
  });
  return blocks;
}

export async function myNewsResponder(): Promise<MessageBlock[]> {
  if (!isLoggedIn()) return signInBlocks();
  const codes = await loadWatchlist();
  if (!codes.length) {
    return [{ type: "text", text: COPY.mine.watchlistEmpty, bn: COPY.mine.watchlistEmptyBn }];
  }
  const watched = new Set(codes.map((c) => c.toUpperCase()));
  const news = (await getWatchlistNews(codes))
    .filter((n) => watched.has(n.trading_code.toUpperCase()))
    .slice(0, 6);
  if (!news.length) {
    return [{ type: "text", text: COPY.mine.newsNone, bn: COPY.mine.newsNoneBn }];
  }
  const blocks: MessageBlock[] = [
    { type: "text", text: COPY.mine.newsLead, bn: COPY.mine.newsLeadBn },
  ];
  for (const n of news) {
    blocks.push({ type: "text", text: `📰 ${n.title} (${n.trading_code})` });
  }
  const chips: Chip[] = Array.from(new Set(news.map((n) => n.trading_code)))
    .slice(0, 5)
    .map((code) => ({ label: code, action: { intentId: "stock_detail", entities: { code } } }));
  blocks.push({ type: "chips", chips, layout: "scroll" });
  return blocks;
}

export async function myDividendsResponder(): Promise<MessageBlock[]> {
  if (!isLoggedIn()) return signInBlocks();
  const codes = await loadWatchlist();
  if (!codes.length) {
    return [{ type: "text", text: COPY.mine.watchlistEmpty, bn: COPY.mine.watchlistEmptyBn }];
  }
  const watched = new Set(codes.map((c) => c.toUpperCase()));
  const res = await getDividendsUpcoming();
  const all = [...(res.upcoming_declarations ?? []), ...(res.upcoming_record_dates ?? [])].filter(
    (d) => watched.has(d.trading_code.toUpperCase()),
  );
  const seen = new Set<string>();
  const picked: typeof all = [];
  for (const it of all) {
    if (seen.has(it.trading_code)) continue;
    seen.add(it.trading_code);
    picked.push(it);
    if (picked.length >= 6) break;
  }
  if (!picked.length) {
    return [{ type: "text", text: COPY.mine.divNone, bn: COPY.mine.divNoneBn }];
  }
  const blocks: MessageBlock[] = [
    { type: "text", text: COPY.mine.divLead, bn: COPY.mine.divLeadBn },
  ];
  for (const d of picked) {
    const date = d.record_date ?? d.projected_date;
    const parts: string[] = [];
    if (d.dividend_pct != null) parts.push(`${pct(d.dividend_pct)} cash`);
    if (date) parts.push(`by ${formatDate(date)}`);
    const detail = parts.length ? ` — ${parts.join(", ")}` : "";
    blocks.push({
      type: "text",
      text: `💰 ${d.company_name ?? d.trading_code} (${d.trading_code})${detail}`,
    });
  }
  const chips: Chip[] = picked.slice(0, 5).map((d) => ({
    label: d.trading_code,
    action: { intentId: "stock_detail", entities: { code: d.trading_code } },
  }));
  blocks.push({ type: "chips", chips, layout: "scroll" });
  return blocks;
}
