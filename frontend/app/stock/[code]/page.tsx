import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiNotFoundError, getCompanyDetail, getAllCodes, getInsightScores, getStockLists } from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";
import { computeFeaturedIn } from "@/lib/featured-lists";
import FeaturedInStrip from "@/components/stock/FeaturedInStrip";
import HeroSection from "@/components/stock/HeroSection";
import PriceChart from "@/components/stock/PriceChart";
import VerdictHero from "@/components/stock/VerdictHero";
import BengaliSummary from "@/components/stock/BengaliSummary";
import HealthCheck from "@/components/stock/HealthCheck";
import ValuationPanel from "@/components/stock/ValuationPanel";
import KeyNumbers from "@/components/stock/KeyNumbers";
import FinancialTrends from "@/components/stock/FinancialTrends";
import MomentumStrip from "@/components/stock/MomentumStrip";
import SignalBoard from "@/components/stock/SignalBoard";
import PeerComparison from "@/components/stock/PeerComparison";
import ProfitsAndDividends from "@/components/stock/ProfitsAndDividends";
import ShareholdingPie from "@/components/stock/ShareholdingPie";
import NewsSection from "@/components/stock/NewsSection";
import StickySummaryBar from "@/components/stock/StickySummaryBar";
import StockSectionNav, { type NavSection } from "@/components/stock/StockSectionNav";
import StockVisitTracker from "@/components/analytics/StockVisitTracker";

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
  if (!detail) return { title: `${code} — TopStockBD` };

  const name = detail.profile.company_name ?? code;

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
    title: `${code} Stock Price & Analysis — ৳${ltpFmt} | TopStockBD`,
    description,
    alternates: { canonical: `/stock/${code}` },
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
          related_stocks, momentum, verdict, valuation } = detail;

  const score = score_row?.score as number | null;

  // Which curated pick lists does this stock appear in? Reuses the same
  // selection logic the list pages use; both sources are cached (ISR 24h).
  let featuredIn: ReturnType<typeof computeFeaturedIn> = [];
  try {
    const [scores, stockLists] = await Promise.all([
      getInsightScores().catch(() => []),
      getStockLists().catch(() => null),
    ]);
    featuredIn = computeFeaturedIn(profile.trading_code, scores, stockLists);
  } catch {
    featuredIn = [];
  }

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${profile.company_name ?? code} (${profile.trading_code})`,
    description: `DSE listed equity. Fundamental analysis score: ${score ?? "--"}/100 (${TIER_LABELS[getTier(score)]}).`,
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

  // --- Decide which sections render, then build the jump-nav from that ---------
  const num = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const hasHealth = !!score_row;
  const hasValuation = financials.length > 0;
  const hasFinancials = financials.length > 0;
  const hasMomentum = !!momentum && momentum.momentum_grade !== "unknown";
  const hasSignals = (signal_flags?.green?.length ?? 0) + (signal_flags?.red?.length ?? 0) > 0;
  const hasPeers = (related_stocks?.length ?? 0) > 0;

  const sections: NavSection[] = [
    { id: "verdict", label: "Verdict" },
    ...(hasHealth ? [{ id: "health", label: "Health" }] : []),
    ...(hasValuation ? [{ id: "valuation", label: "Value" }] : []),
    ...(hasFinancials ? [{ id: "numbers", label: "Numbers" }] : []),
    ...(hasFinancials ? [{ id: "financials", label: "Financials" }] : []),
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <StockVisitTracker code={profile.trading_code} />

      {/* The Stock at a Glance */}
      <HeroSection detail={detail} />

      {/* The Price Story */}
      <PriceChart code={profile.trading_code} />

      {/* এক নজরে — plain-Bangla at-a-glance summary (cached, SEO content) */}
      <BengaliSummary detail={detail} />

      {/* Sticky stack: summary bar (on scroll) + section jump-nav */}
      <div className="sticky top-14 z-40 -mx-4 sm:-mx-6">
        <StickySummaryBar
          code={profile.trading_code}
          score={score}
          rank={num(score_row?.overall_rank)}
          total={num(score_row?.total_scored)}
          stance={verdict?.stance ?? null}
          horizon={verdict?.horizon_hint ?? null}
          ltp={num(detail.latest_price.ltp)}
          changePct={num(detail.latest_price.change_pct)}
        />
        <StockSectionNav sections={sections} />
      </div>

      {/* Our Verdict */}
      <div id="verdict" className="scroll-mt-[112px]">
        <VerdictHero detail={detail} />
      </div>

      {/* Featured in our curated pick lists */}
      <FeaturedInStrip entries={featuredIn} />

      {/* The Health Check */}
      {hasHealth && score_row && <HealthCheck scoreRow={score_row} detail={detail} />}

      {/* Is the Price Right? */}
      {hasValuation && (
        <ValuationPanel
          financials={financials}
          latestPrice={detail.latest_price}
          scoreRow={score_row}
          valuation={valuation}
        />
      )}

      {/* Key Numbers — the raw figures behind the verdict (EPS, P/E, yield, reserve, loan) */}
      {hasFinancials && (
        <div id="numbers" className="scroll-mt-[112px]">
          <KeyNumbers detail={detail} />
        </div>
      )}

      {/* Profits & Dividends + Financial Trends */}
      {hasFinancials && (
        <div id="financials" className="scroll-mt-[112px]">
          <ProfitsAndDividends
            financials={financials}
            extFinancials={extended_financials}
            declaration={dividend_declaration}
          />
          <FinancialTrends extFinancials={extended_financials} />
        </div>
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
      <div id="ownership" className="scroll-mt-[112px]">
        <ShareholdingPie shareholding={shareholding} previous={detail.shareholding_prev ?? null} />
      </div>

      {/* What's New */}
      <div id="news" className="scroll-mt-[112px]">
        <NewsSection news={news} />
      </div>
    </>
  );
}
