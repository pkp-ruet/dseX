import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ApiNotFoundError, getDeepAnalysis, getDeepAnalysisCodes, getCompanyDetail,
} from "@/lib/api";
import { money, changePct as fmtChangePct, changeTone } from "@/lib/formatters";
import DeepAnalysisReport from "@/components/stock/DeepAnalysisReport";
import StockVisitTracker from "@/components/analytics/StockVisitTracker";

export const revalidate = 86400;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  // Only codes that actually have a report get a baked /analysis page.
  try {
    const codes = await getDeepAnalysisCodes();
    if (!Array.isArray(codes)) return [];
    return codes.map((code) => ({ code }));
  } catch {
    return [];
  }
}

function truncate(s: string, n = 155): string {
  if (!s) return s;
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  let data: Awaited<ReturnType<typeof getDeepAnalysis>> | null = null;
  try {
    data = await getDeepAnalysis(code);
  } catch {
    // 404 / transient → minimal title, never block the page
  }
  if (!data) return { title: `${code} In-Depth Analysis`, robots: { index: false, follow: true } };

  const name = data.report.company_name ?? code;
  const description = truncate(
    data.report.headline_en ||
      `A plain-language, in-depth fundamental analysis of ${name} (${code}) on the Dhaka Stock Exchange.`,
  );
  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const title = `${code} In-Depth Analysis — ${name}`;

  return {
    title,
    description,
    keywords: [
      `${code}`, `${name}`, `${code} analysis`, `${code} share analysis`,
      "DSE", "Dhaka Stock Exchange", "Bangladesh stock analysis",
      "fundamental analysis", `${code} fundamentals`,
    ],
    alternates: { canonical: `/stock/${code}/analysis` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${BASE}/stock/${code}/analysis`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StockAnalysisPage({ params }: PageProps) {
  const { code } = await params;
  // Live price for the header, fetched alongside the report instead of after it.
  const detailFetch = getCompanyDetail(code.toUpperCase()).catch(() => null);

  let data: Awaited<ReturnType<typeof getDeepAnalysis>>;
  try {
    data = await getDeepAnalysis(code);
  } catch (err) {
    if (err instanceof ApiNotFoundError) notFound();
    throw err; // transient → error.tsx, don't bake a 404
  }

  const { report, fair_value } = data;
  const tradingCode = report.trading_code;
  const name = report.company_name ?? tradingCode;

  // Live header bits (name/price) are a nice-to-have — never block the report.
  let ltp: number | null = null;
  let changePct: number | null = null;
  const detail = await detailFetch; // null → report-only header
  if (detail) {
    ltp = detail.latest_price?.ltp ?? null;
    changePct = detail.latest_price?.change_pct ?? null;
  }

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.headline_en,
    description: truncate(report.headline_en, 300),
    inLanguage: ["en", "bn"],
    datePublished: report.generated_at ?? undefined,
    dateModified: report.generated_at ?? undefined,
    author: { "@type": "Organization", name: "TopStockBD" },
    publisher: { "@type": "Organization", name: "TopStockBD" },
    mainEntityOfPage: `${BASE}/stock/${tradingCode}/analysis`,
    about: {
      "@type": "FinancialProduct",
      name: `${name} (${tradingCode})`,
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Stock Rankings", item: `${BASE}/dsestockranking` },
      { "@type": "ListItem", position: 3, name: tradingCode, item: `${BASE}/stock/${tradingCode}` },
      { "@type": "ListItem", position: 4, name: "In-Depth Analysis", item: `${BASE}/stock/${tradingCode}/analysis` },
    ],
  };


  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <StockVisitTracker code={tradingCode} />

      <div className="page-narrow py-4 sm:py-6">
        {/* Breadcrumb / back to the full stock page */}
        <Link
          href={`/stock/${tradingCode}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm mb-4 text-text-muted hover:text-text-main"
        >
          <span aria-hidden>←</span> {tradingCode} · {name}
        </Link>

        {/* Live price header (falls back to name-only when the detail fetch fails) */}
        {ltp != null && (
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-bold tabular-nums text-text-main">
              {money(ltp)}
            </span>
            {changePct != null && (
              <span className={`text-sm font-semibold tabular-nums ${changeTone(changePct)}`}>
                {fmtChangePct(changePct)} today
              </span>
            )}
          </div>
        )}

        <DeepAnalysisReport report={report} fairValue={fair_value} />

        {/* Back to the numbers */}
        <Link
          href={`/stock/${tradingCode}`}
          className="btn-quiet mt-10 whitespace-normal text-left"
        >
          See price chart, financials &amp; signals for {tradingCode}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </>
  );
}
