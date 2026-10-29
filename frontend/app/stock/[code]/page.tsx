import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ApiNotFoundError, getCompanyDetail, getInsightScores, getStockLists, getDividendHistory, getDeepAnalysis,
  type DividendDeclarationRecord, type DeepAnalysisReport as DeepReport,
} from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";
import { computeFeaturedIn } from "@/lib/featured-lists";
import FeaturedInStrip from "@/components/stock/FeaturedInStrip";
import HeroSection from "@/components/stock/HeroSection";
import PriceChart from "@/components/stock/PriceChart";
import ValuationPanel from "@/components/stock/ValuationPanel";
import CompanyFacts from "@/components/stock/CompanyFacts";
import FinancialTrends from "@/components/stock/FinancialTrends";
import DividendTimeline from "@/components/stock/DividendTimeline";
import MomentumStrip from "@/components/stock/MomentumStrip";
import PeerComparison from "@/components/stock/PeerComparison";
import ProfitsAndDividends from "@/components/stock/ProfitsAndDividends";
import ShareholdingPie from "@/components/stock/ShareholdingPie";
import NewsSection from "@/components/stock/NewsSection";
import StickySummaryBar from "@/components/stock/StickySummaryBar";
import { type NavSection } from "@/components/stock/StockSectionNav";
import StockVisitTracker from "@/components/analytics/StockVisitTracker";
import DeepAnalysisReport from "@/components/stock/DeepAnalysisReport";
import StockLockScope from "@/components/premium/LockScope";
import Scorecard from "@/components/stock/report/Scorecard";
import StockReportBody from "@/components/stock/report/StockReportBody";
import DataRoom, { type RoomPanel } from "@/components/stock/report/DataRoom";
import { REPORT_PARTS } from "@/lib/stock-report";
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
  // "Top" = highest score, not the first 50 codes alphabetically (AAMRANET,
  // AAMRATECH, …) that `getAllCodes()` returns.
  try {
    const items = await getInsightScores();
    if (!Array.isArray(items) || items.length === 0) return [];
    return [...items]
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .slice(0, 50)
      .map((i) => ({ code: i.trading_code }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  let detail: Awaited<ReturnType<typeof getCompanyDetail>> | null = null;
  try {
    detail = await getCompanyDetail(code);
  } catch (err) {
    // Only a real 404 gets the minimal noindex title (the page 404s anyway).
    // A transient error throws: returning noindex for it cached a live stock
    // page as noindex until the next rebuild.
    if (!(err instanceof ApiNotFoundError)) throw err;
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

  const details: string[] = [];
  if (epsFmt) details.push(`EPS ৳${epsFmt}`);
  if (divFmt != null) details.push(`last dividend ${divFmt}%`);
  const detailStr = details.length ? ` ${details.join(", ")}.` : "";
  const description = `${name} (${code}) share price today ৳${ltpFmt}${chgFmt ? ` (${chgFmt}%)` : ""} on the Dhaka Stock Exchange.${detailStr} Dividend history, fundamental score, buy/sell signal and financials — free on TopStockBD.`;

  const ogDesc = `${name} · ৳${ltpFmt} today${epsFmt ? ` · EPS ৳${epsFmt}` : ""}${divFmt != null ? ` · Dividend ${divFmt}%` : ""}. Free DSE stock analysis on TopStockBD.`;

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

  return {
    // Company name first — people search "grameenphone share price", never "GP stock price".
    // The price stays out of the title so it does not change on every crawl.
    title: `${name} (${code}) Share Price, Dividend & Analysis`,
    description,
    alternates: { canonical: `/stock/${code}` },
    ...(unscored ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${name} (${code}) — ৳${ltpFmt}${chgFmt ? ` (${chgFmt}%)` : ""} | TopStockBD`,
      description: ogDesc,
      type: "website",
      url: `${BASE}/stock/${code}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} (${code}) — ৳${ltpFmt}${chgFmt ? ` (${chgFmt}%)` : ""} | TopStockBD`,
      description: ogDesc,
    },
  };
}

export default async function StockDetailPage({ params }: PageProps) {
  const { code } = await params;
  // Start the side fetches with the detail rather than after it — they only
  // need the code, and waiting doubled the page's time on a slow backend. Each
  // carries its own .catch, so a 404 below leaves no unhandled rejection.
  const sideFetches = Promise.all([
    getStockLists().catch(() => null),
    getDividendHistory(code.toUpperCase()).catch(() => [] as DividendDeclarationRecord[]),
    // The written analyst note folds into the report (2026-10-28); most codes
    // have none, and the 404 just means "no note".
    getDeepAnalysis(code.toUpperCase()).then((r) => r.report).catch(() => null as DeepReport | null),
  ]);
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
          related_stocks, momentum, valuation } = detail;

  const score = score_row?.score as number | null;

  // Which free stock lists does this stock appear in, plus the full dividend
  // ledger. Both sources are cached and each is best-effort.
  let featuredIn: ReturnType<typeof computeFeaturedIn> = [];
  let dividendRows: DividendDeclarationRecord[] = [];
  let deepReport: DeepReport | null = null;
  try {
    const [stockLists, ledger, deep] = await sideFetches;
    featuredIn = computeFeaturedIn(profile.trading_code, stockLists);
    dividendRows = Array.isArray(ledger) ? ledger : [];
    deepReport = deep;
  } catch {
    featuredIn = [];
    dividendRows = [];
  }
  const report = detail.report ?? null;

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
  const name = profile.company_name ?? code;
  const tierLabel = TIER_LABELS[getTier(score)];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Corporation",
    name,
    tickerSymbol: profile.trading_code,
    ...(profile.sector ? { industry: profile.sector } : {}),
    description: `${name} (${profile.trading_code}) is listed on the Dhaka Stock Exchange${profile.sector ? ` in the ${profile.sector} sector` : ""}. TopStockBD fundamental score: ${score ?? "--"}/100 (${tierLabel}).`,
    url: `${BASE}/stock/${code}`,
    sameAs: `https://www.dsebd.org/company/${encodeURIComponent(profile.trading_code)}`,
  };

  // Paywall markup: part of the page (every `.premium-locked` block —
  // components/premium/AnswerLock.tsx) is in the HTML but shown in full only
  // to Premium readers. Google's structured-data way of saying so.
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${name} (${profile.trading_code}) share price and analysis`,
    url: `${BASE}/stock/${code}`,
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ".premium-locked",
    },
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
    // The signal word is free; its reason and the verdict prose are Premium, so
    // neither goes into a rich-result answer.
    const sigText =
      sig === "buy"
        ? ` Our rules currently show a ${detail.signal?.strength === "strong" ? "Strong Buy" : "Buy"} signal.`
        : sig === "sell"
          ? " Our rules currently show a Sell signal."
          : " Our rules show no buy or sell signal right now.";
    faqs.push({
      q: `Is ${name} (${code}) a good stock to buy?`,
      a: `TopStockBD scores ${code} ${Math.round(score)} out of 100 on fundamentals, which we call "${tierLabel}".${sigText} This is educational information, not investment advice.`,
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
    faqs.push({
      q: `Which sector is ${code} in?`,
      a: `${name} is listed in the ${profile.sector} sector of the Dhaka Stock Exchange${profile.market_category ? `, category ${String(profile.market_category).toUpperCase()}` : ""}.`,
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
  // "Facts are free, our judgement is Premium": every judgement on the stock
  // lives in the report's Premium panels; the data room carries only public
  // numbers and has no locks.
  const hasValuation = financials.length > 0;
  const hasFinancials = financials.length > 0;
  const hasFacts =
    detail.latest_price.ltp != null || profile.total_shares != null ||
    profile.reserve_surplus_mn != null || profile.paid_up_capital_mn != null || financials.length > 0;
  const hasDividends = dividendRows.length > 0;
  const hasMomentum = !!momentum && momentum.momentum_grade !== "unknown";
  const hasPeers = (related_stocks?.length ?? 0) > 0;

  // Report mode (2026-10-28): the chips jump to the cover, the report's three
  // parts (2026-10-29 — one chip per part, not per check), the analyst note
  // and the data room.
  const reportSections: NavSection[] = report
    ? [
        { id: "ch-overview", label: "Overview", labelBn: "এক নজরে" },
        ...REPORT_PARTS
          .filter((p) => p.sections.some((k) => report.sections[k] != null))
          .map((p) => ({ id: p.id, label: p.chip.en, labelBn: p.chip.bn })),
        ...(deepReport ? [{ id: "note", label: "Analyst note", labelBn: "বিশ্লেষকের নোট" }] : []),
        { id: "ch-data", label: "Data", labelBn: "তথ্য" },
      ]
    : [];
  // Without a report (it failed to build — every company had one on
  // 2026-10-29) the page is the cover and the data room.
  const sections: NavSection[] = report
    ? reportSections
    : [
        { id: "ch-overview", label: "Overview", labelBn: "এক নজরে" },
        ...(deepReport ? [{ id: "note", label: "Analyst note", labelBn: "বিশ্লেষকের নোট" }] : []),
        { id: "ch-data", label: "Data", labelBn: "তথ্য" },
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

  // The data room's tabs (report mode): every raw number, free.
  const roomPanels: RoomPanel[] = [
    ...(hasFinancials
      ? [{
          key: "profit",
          label: { en: "Profit", bn: "মুনাফা" },
          anchors: ["financials"],
          body: (
            <div id="financials" className="stock-anchor">
              <ProfitsAndDividends financials={financials} extFinancials={extended_financials} declaration={dividend_declaration} />
              <FinancialTrends extFinancials={extended_financials} />
            </div>
          ),
        }]
      : []),
    ...(hasDividends
      ? [{
          key: "dividends",
          label: { en: "Dividends", bn: "ডিভিডেন্ড" },
          anchors: ["dividends"],
          body: (
            <DividendTimeline
              code={profile.trading_code}
              rows={dividendRows}
              faceValue={num(profile.face_value)}
              ltp={num(detail.latest_price.ltp)}
            />
          ),
        }]
      : []),
    ...(hasValuation || hasMomentum || hasPeers
      ? [{
          key: "price",
          label: { en: "Price and peers", bn: "দাম ও তুলনা" },
          anchors: ["valuation", "momentum", "peers"],
          body: (
            <>
              {hasValuation && (
                <ValuationPanel
                  financials={financials}
                  latestPrice={detail.latest_price}
                  scoreRow={score_row}
                  valuation={valuation}
                  verdictHref={report?.sections.price ? "#rp-price" : undefined}
                />
              )}
              {hasMomentum && <MomentumStrip momentum={momentum} />}
              {hasPeers && (
                <PeerComparison current={currentPeerRow} peers={related_stocks} sector={profile.sector} note={detail.peer_note ?? null} />
              )}
            </>
          ),
        }]
      : []),
    {
      key: "ownership",
      label: { en: "Ownership", bn: "মালিকানা" },
      anchors: ["ownership"],
      body: (
        <div id="ownership" className="stock-anchor">
          <ShareholdingPie shareholding={shareholding} previous={detail.shareholding_prev ?? null} ownership={detail.ownership ?? null} />
        </div>
      ),
    },
    ...(hasFacts
      ? [{
          key: "company",
          label: { en: "Company", bn: "কোম্পানি" },
          anchors: ["numbers"],
          body: (
            <div id="numbers" className="stock-anchor">
              <CompanyFacts detail={detail} />
            </div>
          ),
        }]
      : []),
    {
      key: "news",
      label: { en: "News", bn: "খবর" },
      anchors: ["news"],
      body: (
        <div id="news" className="stock-anchor">
          <NewsSection news={news} />
        </div>
      ),
    },
  ];

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <StockVisitTracker code={profile.trading_code} />

      {/* The free report of the day opens every lock for everyone. In report
          mode every other lock on the page points at the one offer. */}
      <StockLockScope code={profile.trading_code} anchor="ch-premium">
      {/* Cover: dateline, hero, the chart with every event pinned, the
          scorecard (eight checks, words free) and the lists it is in. */}
      <HeroSection detail={detail} />
      <PriceChart code={profile.trading_code} events={report?.events} />
      {report && <Scorecard detail={detail} report={report} />}
      <FeaturedInStrip entries={featuredIn} />

      <StickySummaryBar
        code={profile.trading_code}
        score={score}
        rank={num(score_row?.overall_rank)}
        total={num(score_row?.total_scored)}
        signal={detail.signal ?? null}
        ltp={num(detail.latest_price.ltp)}
        changePct={num(detail.latest_price.change_pct)}
        sections={sections}
      />

      {/* The report: one section per check, free face + Premium body, then
          the analyst note and the one offer (#ch-premium). The old five-chapter
          page that stood in when there was no report was removed 2026-10-29
          (the Free vs Premium plan, step 8). */}
      {report ? (
        <StockReportBody detail={detail} report={report} deep={deepReport} />
      ) : (
        deepReport && (
          <section id="note" className="stock-anchor mb-8">
            <DeepAnalysisReport report={deepReport} fairValue={detail.fair_value ?? null} code={profile.trading_code} />
          </section>
        )
      )}

      {/* The data room: every raw number, in tabs, all free. */}
      <DataRoom panels={roomPanels} />
      </StockLockScope>
    </>
  );
}
