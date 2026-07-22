import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ApiNotFoundError, getDeepAnalysis, getDeepAnalysisCodes, getCompanyDetail,
} from "@/lib/api";
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
  if (!data) return { title: `${code} In-Depth Analysis — TopStockBD` };

  const name = data.report.company_name ?? code;
  const description = truncate(
    data.report.headline_en ||
      `A plain-language, in-depth fundamental analysis of ${name} (${code}) on the Dhaka Stock Exchange.`,
  );
  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const title = `${code} In-Depth Analysis — ${name} | TopStockBD`;

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
  try {
    const detail = await getCompanyDetail(tradingCode);
    ltp = detail.latest_price?.ltp ?? null;
    changePct = detail.latest_price?.change_pct ?? null;
  } catch {
    /* fall back to report-only header */
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

  const chgColor = changePct == null ? "var(--text-muted)" : changePct >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <StockVisitTracker code={tradingCode} />

      <div className="max-w-3xl mx-auto py-4 sm:py-6">
        {/* Breadcrumb / back to the full stock page */}
        <Link
          href={`/stock/${tradingCode}`}
          className="inline-flex items-center gap-1.5 text-sm mb-4 hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
        >
          <span aria-hidden>←</span> {tradingCode} · {name}
        </Link>

        {/* Live price header (falls back to name-only when the detail fetch fails) */}
        {ltp != null && (
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
              ৳{ltp >= 100 ? Math.round(ltp).toLocaleString("en-US") : ltp.toFixed(1)}
            </span>
            {changePct != null && (
              <span className="text-sm font-semibold tabular-nums" style={{ color: chgColor }}>
                {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}% today
              </span>
            )}
          </div>
        )}

        <DeepAnalysisReport report={report} fairValue={fair_value} />

        {/* Back to the numbers */}
        <Link
          href={`/stock/${tradingCode}`}
          className="inline-flex items-center gap-1.5 mt-10 rounded-full px-5 py-2.5 text-sm font-semibold"
          style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
        >
          See price chart, financials &amp; signals for {tradingCode}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </>
  );
}
