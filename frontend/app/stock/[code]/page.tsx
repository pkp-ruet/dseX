import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCodes, getCompanyDetail } from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";
import VerdictBar from "@/components/stock/VerdictBar";
import SignalFlags from "@/components/stock/SignalFlags";
import PillarScores from "@/components/stock/PillarScores";
import ValuationCard from "@/components/stock/ValuationCard";
import PriceChart from "@/components/stock/PriceChart";
import FinancialCharts from "@/components/stock/FinancialCharts";
import CashFlowPanel from "@/components/stock/CashFlowPanel";
import DividendSection from "@/components/stock/DividendSection";
import ShareholdingPie from "@/components/stock/ShareholdingPie";
import NewsSection from "@/components/stock/NewsSection";
import SectionLabel from "@/components/ui/SectionLabel";
import { taka, millions } from "@/lib/formatters";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  // Skip build-time pre-rendering — pages are served via ISR on first request.
  // Pre-generating 360+ pages during build causes ECONNRESET failures when the
  // backend (Render free tier) cold-starts under concurrent load.
  return [] as { code: string }[];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const detail = await getCompanyDetail(code).catch(() => null);
  if (!detail) return { title: `${code} — TopStockBD` };

  const name = detail.profile.company_name ?? code;
  const score = detail.score_row?.score as number | null;
  const tier = getTier(score);
  const tierLabel = TIER_LABELS[tier];

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

  return {
    title: `${code} (${name}) Stock Analysis — DSEF Score | DSE`,
    description: `DSEF score for ${name} (${code}): ${score ?? "--"}/100 (${tierLabel}). Business Quality, Financial Health, Valuation, Dividend Quality. DSE stock analysis, price history, financials.`,
    alternates: { canonical: `/stock/${code}` },
    openGraph: {
      title: `${code} — DSEF Score: ${score ?? "--"}/100 | TopStockBD`,
      description: `${name} · ${tierLabel} · Score ${score ?? "--"}/100 on TopStockBD`,
      type: "website",
      url: `${BASE}/stock/${code}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${code} — DSEF Score: ${score ?? "--"}/100 | TopStockBD`,
      description: `${name} · ${tierLabel} · Score ${score ?? "--"}/100 on TopStockBD`,
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
  const tier = getTier(score);

  // JSON-LD
  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${profile.company_name ?? code} (${profile.trading_code})`,
    description: `DSE listed equity. DSEF score: ${score ?? "--"}/100 (${TIER_LABELS[tier]}).`,
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

      {/* Breadcrumb nav */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <li>
            <Link href="/" className="text-[var(--primary)] hover:underline font-medium">Home</Link>
          </li>
          <li aria-hidden="true" className="mx-1">›</li>
          <li>
            <Link href="/dsestockranking" className="text-[var(--primary)] hover:underline font-medium">Rankings</Link>
          </li>
          <li aria-hidden="true" className="mx-1">›</li>
          <li aria-current="page" className="font-semibold text-[var(--text)]">{code}</li>
        </ol>
      </nav>

      {/* Company header */}
      <div className="mb-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold">{code}</h1>
          {profile.company_name && (
            <span className="text-base text-[var(--text-muted)]">{profile.company_name}</span>
          )}
          {profile.sector && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-muted)] font-medium">
              {profile.sector}
            </span>
          )}
        </div>
      </div>

      {/* Verdict bar */}
      <VerdictBar detail={detail} />

      {/* Signal flags */}
      <SignalFlags flags={signal_flags} />

      {/* Pillar scores */}
      {score_row && <PillarScores scoreRow={score_row} />}

      {/* Price chart + valuation side-by-side */}
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div className="sm:col-span-2">
          <PriceChart code={code} />
        </div>
        <ValuationCard detail={detail} />
      </div>

      {/* Financial charts */}
      {(financials.length > 0 || extended_financials.length > 0) && (
        <FinancialCharts financials={financials} extFinancials={extended_financials} />
      )}

      {/* Cash flow */}
      {extended_financials.length > 0 && (
        <CashFlowPanel extFinancials={extended_financials} />
      )}

      {/* Dividends */}
      {financials.length > 0 && (
        <DividendSection
          financials={financials}
          declaration={dividend_declaration}
          faceValue={profile.face_value}
        />
      )}

      {/* Shareholding */}
      <ShareholdingPie shareholding={shareholding} />

      {/* Company fundamentals */}
      <div className="mb-4">
        <SectionLabel>Company Fundamentals</SectionLabel>
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 mt-2 grid sm:grid-cols-2 gap-2">
          {[
            ["Face Value", profile.face_value ? taka(profile.face_value) : "--"],
            ["Total Shares", profile.total_shares ? millions(profile.total_shares) : "--"],
            ["Reserve & Surplus", profile.reserve_surplus_mn ? millions(profile.reserve_surplus_mn) + " (mn)" : "--"],
            ["Total Loan", profile.total_loan_mn ? millions(profile.total_loan_mn) + " (mn)" : "--"],
            ["Paid-up Capital", profile.paid_up_capital_mn ? millions(profile.paid_up_capital_mn) + " (mn)" : "--"],
            ["Market Category", profile.market_category ?? "--"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm border-b border-[var(--border)] pb-1">
              <span className="text-[var(--text-muted)]">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* News */}
      <NewsSection news={news} />
    </>
  );
}
