import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllCodes, getCompanyDetail } from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";
import HeroSection from "@/components/stock/HeroSection";
import QuickSummary from "@/components/stock/QuickSummary";
import MetricStrip from "@/components/stock/MetricStrip";
import SectionNav from "@/components/stock/SectionNav";
import PillarScores from "@/components/stock/PillarScores";
import ValuationCard from "@/components/stock/ValuationCard";
import FinancialCharts from "@/components/stock/FinancialCharts";
import CashFlowPanel from "@/components/stock/CashFlowPanel";
import DividendSection from "@/components/stock/DividendSection";
import ShareholdingPie from "@/components/stock/ShareholdingPie";
import CompanyFundamentals from "@/components/stock/CompanyFundamentals";
import NewsSection from "@/components/stock/NewsSection";
import SectionLabel from "@/components/ui/SectionLabel";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  const codes = await getAllCodes().catch(() => [] as string[]);
  return codes.map((code) => ({ code }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const detail = await getCompanyDetail(code).catch(() => null);
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
  const detail = await getCompanyDetail(code).catch(() => null);
  if (!detail) notFound();

  const { profile, score_row, signal_flags, financials, extended_financials,
          shareholding, dividend_declaration, news } = detail;

  const score = score_row?.score as number | null;

  // JSON-LD
  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${profile.company_name ?? code} (${profile.trading_code})`,
    description: `DSE listed equity. DSEF score: ${score ?? "--"}/100 (${TIER_LABELS[getTier(score)]}).`,
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

      {/* ZONE 1: Hero */}
      <HeroSection detail={detail} />

      {/* ZONE 2: Quick Summary */}
      <QuickSummary detail={detail} />

      {/* ZONE 3: Metric Strip */}
      <MetricStrip detail={detail} />

      {/* ZONE 4: Section Navigation */}
      <SectionNav />

      {/* ZONE 5: Content Sections */}

      {/* Performance */}
      <div id="section-performance" className="scroll-mt-14">
        <SectionLabel>Performance</SectionLabel>
        {(financials.length > 0 || extended_financials.length > 0) && (
          <FinancialCharts financials={financials} extFinancials={extended_financials} />
        )}
      </div>

      {/* Valuation & Quality */}
      <div id="section-valuation" className="scroll-mt-14">
        <SectionLabel>Valuation & Quality</SectionLabel>
        {score_row && <PillarScores scoreRow={score_row} />}
        <ValuationCard detail={detail} />
        {extended_financials.length > 0 && (
          <CashFlowPanel extFinancials={extended_financials} />
        )}
      </div>

      {/* Dividends */}
      <div id="section-dividends" className="scroll-mt-14">
        {financials.length > 0 && (
          <DividendSection
            financials={financials}
            declaration={dividend_declaration}
            faceValue={profile.face_value}
          />
        )}
      </div>

      {/* Ownership & Fundamentals */}
      <div id="section-ownership" className="scroll-mt-14">
        <SectionLabel>Ownership & Fundamentals</SectionLabel>
        <ShareholdingPie shareholding={shareholding} />
        <CompanyFundamentals profile={profile} />
      </div>

      {/* News */}
      <div id="section-news" className="scroll-mt-14">
        <SectionLabel>News</SectionLabel>
        <NewsSection news={news} />
      </div>
    </>
  );
}
