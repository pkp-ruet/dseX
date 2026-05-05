import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiNotFoundError, getCompanyDetail } from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";
import HeroSection from "@/components/stock/HeroSection";
import PriceChart from "@/components/stock/PriceChart";
import VerdictHero from "@/components/stock/VerdictHero";
import HealthCheck from "@/components/stock/HealthCheck";
import KeyNumbers from "@/components/stock/KeyNumbers";
import ProfitsAndDividends from "@/components/stock/ProfitsAndDividends";
import ShareholdingPie from "@/components/stock/ShareholdingPie";
import NewsSection from "@/components/stock/NewsSection";
import RelatedStocks from "@/components/stock/RelatedStocks";
import StockVisitTracker from "@/components/analytics/StockVisitTracker";

export const revalidate = 3600;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  // All stock pages render on-demand (dynamicParams = true) and are ISR-cached.
  // Returning [] avoids fanning out 360 backend fetches at build time, which
  // can intermittently bake static 404s when Render's free tier is cold-starting.
  return [];
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
          shareholding, dividend_declaration, news } = detail;

  const score = score_row?.score as number | null;

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

      <StockVisitTracker code={profile.trading_code} />

      {/* Chapter 1 — The Stock at a Glance */}
      <HeroSection detail={detail} />

      {/* Chapter 2 — The Price Story */}
      <PriceChart code={profile.trading_code} />

      {/* Chapter 3 — Our Verdict */}
      <VerdictHero detail={detail} />

      {/* Chapter 4 — The Health Check */}
      {score_row && <HealthCheck scoreRow={score_row} />}

      {/* Key Numbers — raw metrics reference */}
      <KeyNumbers detail={detail} />

      {/* Chapter 5 — Profits & Dividends */}
      {(financials.length > 0) && (
        <ProfitsAndDividends
          financials={financials}
          extFinancials={extended_financials}
          declaration={dividend_declaration}
        />
      )}

      {/* Chapter 6 — Who Owns It & What's New */}
      <ShareholdingPie shareholding={shareholding} />
      <NewsSection news={news} />

      {/* Chapter 7 — Related Stocks */}
      <RelatedStocks
        stocks={detail.related_stocks ?? []}
        currentSector={profile.sector}
      />
    </>
  );
}
