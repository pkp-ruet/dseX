import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ApiNotFoundError, getCompanyDetail, getAllCodes, getInsightScores, getStockLists, getDividendHistory,
  type DividendDeclarationRecord,
} from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";
import { computeFeaturedIn } from "@/lib/featured-lists";
import { StockLangProvider } from "@/context/StockLangContext";
import FeaturedInStrip from "@/components/stock/FeaturedInStrip";
import HeroSection from "@/components/stock/HeroSection";
import PriceChart from "@/components/stock/PriceChart";
import VerdictBlock from "@/components/stock/VerdictBlock";
import ValueTodayBox from "@/components/stock/ValueTodayBox";
import HealthCheck from "@/components/stock/HealthCheck";
import ValuationPanel from "@/components/stock/ValuationPanel";
import CompanyFacts from "@/components/stock/CompanyFacts";
import FinancialTrends from "@/components/stock/FinancialTrends";
import DividendTimeline from "@/components/stock/DividendTimeline";
import MomentumStrip from "@/components/stock/MomentumStrip";
import SignalBoard from "@/components/stock/SignalBoard";
import PeerComparison from "@/components/stock/PeerComparison";
import ProfitsAndDividends from "@/components/stock/ProfitsAndDividends";
import ShareholdingPie from "@/components/stock/ShareholdingPie";
import NewsSection from "@/components/stock/NewsSection";
import StickySummaryBar from "@/components/stock/StickySummaryBar";
import StickyStackMeasure from "@/components/stock/StickyStackMeasure";
import StockSectionNav, { type NavSection } from "@/components/stock/StockSectionNav";
import StockVisitTracker from "@/components/analytics/StockVisitTracker";
import { formatDate, money } from "@/lib/formatters";

export const revalidate = 86400;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  // Bake the top-50 codes at build time to cut Fast Origin Transfer.
  // Tail-end codes still render on-demand (dynamicParams = true).
  // If the backend is cold (Render free tier), fall back to [] — never
  // bake 404s for codes we couldn't verify.
  try {
    const codes = await getAllCodes();
    if (!Array.isArray(codes) || codes.length === 0) return [];
    return codes.slice(0, 50).map((code) => ({ code }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  let detail: Awaited<ReturnType<typeof getCompanyDetail>> | null = null;
  try {
    detail = await getCompanyDetail(code);
  } catch {
    // 404 or transient — fall through to a minimal title so metadata never blocks the page
  }
  if (!detail) return { title: code, robots: { index: false, follow: true } };

  const name = detail.profile.company_name ?? code;
  // Mutual funds / bonds and anything else without a DSEF score render a
  // near-identical "no rating" template — keep those out of the index.
  const unscored = detail.score_row?.score == null;

  const ltp = detail.latest_price?.ltp != null ? Number(detail.latest_price.ltp) : null;
  const changePct = detail.latest_price?.change_pct != null ? Number(detail.latest_price.change_pct) : null;
  const latestFin = [...(detail.financials ?? [])].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))[0];
  const eps = latestFin?.eps != null ? Number(latestFin.eps) : null;
  const divPct = latestFin?.cash_dividend_pct != null ? Number(latestFin.cash_dividend_pct) : null;

  const ltpFmt = ltp != null ? (ltp >= 100 ? Math.round(ltp).toLocaleString() : ltp.toFixed(1)) : "--";
  const chgFmt = changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}` : null;
  const epsFmt = eps != null ? eps.toFixed(1) : null;
  const divFmt = divPct != null ? Math.round(divPct) : null;

  const descParts = [`৳${ltpFmt}`];
  if (chgFmt) descParts.push(`${chgFmt}% today`);
  const lead = descParts.join(" · ");
  const details: string[] = [];
  if (epsFmt) details.push(`EPS ৳${epsFmt}`);
  if (divFmt != null) details.push(`last dividend ${divFmt}%`);
  const detailStr = details.length ? ` — ${details.join(", ")}` : "";
  const description = `${lead}. ${name}${detailStr}. Full stock analysis with buy/sell signals & fundamentals. Free on TopStockBD.`;

  const ogDesc = `${name} · ৳${ltpFmt} today${epsFmt ? ` · EPS ৳${epsFmt}` : ""}${divFmt != null ? ` · Dividend ${divFmt}%` : ""}. Free DSE stock analysis on TopStockBD.`;

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

  return {
    title: `${code} Stock Price & Analysis — ৳${ltpFmt}`,
    description,
    alternates: { canonical: `/stock/${code}` },
    ...(unscored ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${code} — ৳${ltpFmt}${chgFmt ? ` (${chgFmt}%)` : ""} | ${name} | TopStockBD`,
      description: ogDesc,
      type: "website",
      url: `${BASE}/stock/${code}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${code} — ৳${ltpFmt}${chgFmt ? ` (${chgFmt}%)` : ""} | ${name} | TopStockBD`,
      description: ogDesc,
    },
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export default async function StockDetailPage({ params }: PageProps) {
  const { code } = await params;
  let detail: Awaited<ReturnType<typeof getCompanyDetail>>;
  try {
    detail = await getCompanyDetail(code);
  } catch (err) {
    if (err instanceof ApiNotFoundError) notFound();
    // Transient error (timeout, 5xx, network) — re-throw so error.tsx renders
    // and Next.js does NOT bake a static 404 into the ISR cache.
    throw err;
  }

  const { profile, score_row, financials, extended_financials,
          shareholding, dividend_declaration, news, signal_flags,
          related_stocks, momentum, verdict, valuation, sector_context } = detail;

  const score = score_row?.score as number | null;

  // Which curated pick lists does this stock appear in, plus the full dividend
  // ledger. All three sources are cached (ISR 24h) and each is best-effort.
  let featuredIn: ReturnType<typeof computeFeaturedIn> = [];
  let dividendRows: DividendDeclarationRecord[] = [];
  try {
    const [scores, stockLists, ledger] = await Promise.all([
      getInsightScores().catch(() => []),
      getStockLists().catch(() => null),
      getDividendHistory(profile.trading_code).catch(() => [] as DividendDeclarationRecord[]),
    ]);
    featuredIn = computeFeaturedIn(profile.trading_code, scores, stockLists);
    dividendRows = Array.isArray(ledger) ? ledger : [];
  } catch {
    featuredIn = [];
    dividendRows = [];
  }

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const name = profile.company_name ?? code;
  const tierLabel = TIER_LABELS[getTier(score)];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${name} (${profile.trading_code})`,
    description: `DSE listed equity. Fundamental analysis score: ${score ?? "--"}/100 (${tierLabel}).`,
    provider: { "@type": "Organization", name: "Dhaka Stock Exchange" },
    url: `${BASE}/stock/${code}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Stock Rankings", item: `${BASE}/dsestockranking` },
      { "@type": "ListItem", position: 3, name: code, item: `${BASE}/stock/${code}` },
    ],
  };

  // --- FAQ rich-result: the questions people actually search for a ticker -----
  const num = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const ltpNum = num(detail.latest_price.ltp);
  const priceDate = detail.latest_price.date ? formatDate(String(detail.latest_price.date)) : null;
  const latestFin = [...financials].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))[0] as Record<string, unknown> | undefined;
  const lastCashPct = num(latestFin?.cash_dividend_pct);
  const lastStockPct = num(latestFin?.stock_dividend_pct);
  const divYield = num(score_row?.div_yield_pct);
  const faqs: { q: string; a: string }[] = [];

  if (score != null) {
    const sig = detail.signal?.signal;
    const sigText =
      sig === "buy"
        ? ` Our rules currently show a ${detail.signal?.strength === "strong" ? "Strong Buy" : "Buy"} signal: ${detail.signal?.reason_en ?? ""}`.trimEnd()
        : sig === "sell"
          ? ` Our rules currently show a Sell signal: ${detail.signal?.reason_en ?? ""}`.trimEnd()
          : " Our rules show no buy or sell signal right now.";
    faqs.push({
      q: `Is ${name} (${code}) a good stock to buy?`,
      a: `TopStockBD scores ${code} ${Math.round(score)} out of 100 on fundamentals, which we call "${tierLabel}".${verdict?.tagline ? ` ${verdict.tagline}` : ""}${sigText} This is educational information, not investment advice.`,
    });
  }
  if (ltpNum != null) {
    faqs.push({
      q: `What is the ${code} share price today?`,
      a: `${name} last closed at ${money(ltpNum)} on the Dhaka Stock Exchange${priceDate ? ` (${priceDate})` : ""}${detail.latest_price.change_pct != null ? `, ${Number(detail.latest_price.change_pct) >= 0 ? "up" : "down"} ${Math.abs(Number(detail.latest_price.change_pct)).toFixed(2)}% on the day` : ""}.`,
    });
  }
  if (lastCashPct != null || lastStockPct != null) {
    const parts: string[] = [];
    if (lastCashPct != null && lastCashPct > 0) parts.push(`${lastCashPct}% cash`);
    if (lastStockPct != null && lastStockPct > 0) parts.push(`${lastStockPct}% stock (bonus shares)`);
    const paid = parts.length ? parts.join(" and ") : "no dividend";
    faqs.push({
      q: `Does ${code} pay dividends?`,
      a: `For its latest reported year${latestFin?.year ? ` (${latestFin.year})` : ""}, ${name} declared ${paid}.${divYield != null && divYield > 0 ? ` At today's price that is a cash yield of about ${divYield.toFixed(2)}% before tax.` : ""} Dividend percentages on the DSE are a share of the ৳${profile.face_value ?? 10} face value, not of the share price.`,
    });
  }
  if (profile.sector) {
    const rank = sector_context?.rank_in_sector ?? null;
    const peers = sector_context?.peer_count ?? null;
    faqs.push({
      q: `Which sector is ${code} in?`,
      a: `${name} is listed in the ${profile.sector} sector of the Dhaka Stock Exchange${profile.market_category ? `, category ${String(profile.market_category).toUpperCase()}` : ""}.${rank != null && peers != null ? ` On fundamentals it ranks ${ordinal(rank)} of ${peers} companies in that sector on TopStockBD.` : ""}`,
    });
  }
  const faqLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  // --- Decide which sections render, then build the jump-nav from that ---------
  const hasHealth = !!score_row;
  const hasValuation = financials.length > 0;
  const hasFinancials = financials.length > 0;
  const hasFacts =
    detail.latest_price.ltp != null || profile.total_shares != null ||
    profile.reserve_surplus_mn != null || profile.paid_up_capital_mn != null || financials.length > 0;
  const hasDividends = dividendRows.length > 0;
  const hasMomentum = !!momentum && momentum.momentum_grade !== "unknown";
  const hasSignals = (signal_flags?.green?.length ?? 0) + (signal_flags?.red?.length ?? 0) > 0;
  const hasPeers = (related_stocks?.length ?? 0) > 0;

  // The verdict card sits above the sticky nav (right under the price story),
  // so it is intentionally NOT a jump-nav anchor.
  const sections: NavSection[] = [
    ...(hasHealth ? [{ id: "health", label: "Health" }] : []),
    ...(hasValuation ? [{ id: "valuation", label: "Value" }] : []),
    ...(hasFacts ? [{ id: "numbers", label: "Facts" }] : []),
    ...(hasFinancials ? [{ id: "financials", label: "Financials" }] : []),
    ...(hasDividends ? [{ id: "dividends", label: "Dividends" }] : []),
    ...(hasMomentum ? [{ id: "momentum", label: "Momentum" }] : []),
    ...(hasSignals ? [{ id: "signals", label: "Signals" }] : []),
    ...(hasPeers ? [{ id: "peers", label: "Peers" }] : []),
    { id: "ownership", label: "Owners" },
    { id: "news", label: "News" },
  ];

  // Current stock as the highlighted first row of the peer comparison.
  const currentPeerRow = {
    trading_code: profile.trading_code,
    company_name: profile.company_name,
    score: num(score_row?.score),
    ltp: num(detail.latest_price.ltp),
    change_pct: num(detail.latest_price.change_pct),
    pe: valuation?.current_pe ?? num(score_row?.current_pe),
    div_yield_pct: num(score_row?.div_yield_pct),
    roe_pct: num(score_row?.roe_pct),
    isCurrent: true,
  };

  return (
    <StockLangProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <StockVisitTracker code={profile.trading_code} />

      {/* The Stock at a Glance */}
      <HeroSection detail={detail} />

      {/* The Price Story */}
      <PriceChart code={profile.trading_code} />

      {/* Our Verdict — one card, right below the price story (not a nav anchor) */}
      <VerdictBlock detail={detail} />

      {/* Sticky stack: summary bar (on scroll) + section jump-nav */}
      <div className="sticky top-14 z-40 -mx-4 sm:-mx-6">
        <StickySummaryBar
          code={profile.trading_code}
          score={score}
          rank={num(score_row?.overall_rank)}
          total={num(score_row?.total_scored)}
          signal={detail.signal ?? null}
          ltp={num(detail.latest_price.ltp)}
          changePct={num(detail.latest_price.change_pct)}
        />
        <StockSectionNav sections={sections} />
        {/* writes the stack's live height to --stock-sticky-h for .stock-anchor */}
        <StickyStackMeasure />
      </div>

      {/* Featured in our curated pick lists */}
      <FeaturedInStrip entries={featuredIn} />

      {/* The Health Check */}
      {hasHealth && score_row && <HealthCheck scoreRow={score_row} detail={detail} />}

      {/* Is the Price Right? — live "value today" box, then the P/E history panel */}
      {hasValuation && (
        <>
          {detail.fair_value && (
            <ValueTodayBox fairValue={detail.fair_value} className="mb-4" />
          )}
          <ValuationPanel
            financials={financials}
            latestPrice={detail.latest_price}
            scoreRow={score_row}
            valuation={valuation}
          />
        </>
      )}

      {/* Company Facts — size, balance-sheet basics, listing facts, today's tape */}
      {hasFacts && (
        <div id="numbers" className="stock-anchor">
          <CompanyFacts detail={detail} />
        </div>
      )}

      {/* Profits & Dividends + Financial Trends */}
      {hasFinancials && (
        <div id="financials" className="stock-anchor">
          <ProfitsAndDividends
            financials={financials}
            extFinancials={extended_financials}
            declaration={dividend_declaration}
          />
          <FinancialTrends extFinancials={extended_financials} />
        </div>
      )}

      {/* Dividend Timeline — every declaration + the next record date countdown */}
      {hasDividends && (
        <DividendTimeline
          code={profile.trading_code}
          rows={dividendRows}
          faceValue={num(profile.face_value)}
          ltp={num(detail.latest_price.ltp)}
        />
      )}

      {/* Recent Momentum */}
      {hasMomentum && <MomentumStrip momentum={momentum} />}

      {/* Signals at a Glance */}
      {hasSignals && <SignalBoard flags={signal_flags} />}

      {/* How It Stacks Up */}
      {hasPeers && (
        <PeerComparison
          current={currentPeerRow}
          peers={related_stocks}
          sector={profile.sector}
        />
      )}

      {/* Who Owns It */}
      <div id="ownership" className="stock-anchor">
        <ShareholdingPie shareholding={shareholding} previous={detail.shareholding_prev ?? null} />
      </div>

      {/* What's New */}
      <div id="news" className="stock-anchor">
        <NewsSection news={news} />
      </div>
    </StockLangProvider>
  );
}
