import type { Metadata } from "next";
import Link from "next/link";
import { getResearchSummary } from "@/lib/api";
import { REPORTS, type ReportSlug, type ResearchSummary } from "@/lib/research-reports";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import { IconArrowRight, IconCrown } from "@/components/ui/icons";
import { REPORT_ICON } from "@/components/research-reports/reportIcons";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const TITLE = "DSE Research: Risks, Owners, Profit Quality and Dividends";
const DESCRIPTION =
  "Research on the whole Dhaka Stock Exchange: companies with serious problems, what the auditors found, the results season, who is buying and selling, whether profit turns into cash, and dividends you can count on.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE research",
    "Dhaka Stock Exchange analysis",
    "DSE risky companies",
    "DSE auditor qualified opinion",
    "DSE results season",
    "DSE going concern",
    "Bangladesh company accounts",
  ],
  alternates: { canonical: `${BASE_URL}/stock-insights` },
  openGraph: {
    title: `${TITLE} | TopStockBD`,
    description: DESCRIPTION,
    url: `${BASE_URL}/stock-insights`,
    type: "website",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/stock-insights`,
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Premium research", item: `${BASE_URL}/stock-insights` },
    ],
  },
];

/** The one figure under each report card, from /api/research/summary. */
function reportFigure(slug: ReportSlug, s: ResearchSummary | null): { en: string; bn: string } | null {
  if (!s) return null;
  if (slug === "risk-register" && s.risks)
    return {
      en: `${s.risks.flagged} of ${s.risks.universe} companies have a serious problem today`,
      bn: `আজ ${s.risks.universe}টির মধ্যে ${s.risks.flagged}টি কোম্পানির গুরুতর সমস্যা আছে`,
    };
  if (slug === "auditor-warnings" && s.auditors)
    return {
      en: `${s.auditors.companies} companies' accounts not fully approved, ${s.auditors.counts.going_concern} with doubt they can keep going`,
      bn: `${s.auditors.companies}টি কোম্পানির হিসাব পুরোপুরি অনুমোদিত হয়নি, ${s.auditors.counts.going_concern}টির টিকে থাকা নিয়ে সন্দেহ`,
    };
  if (slug === "who-is-buying" && s.owners)
    return {
      en: `${s.owners.trade_buyers} companies' owners bought and ${s.owners.trade_sellers} sold this year; institutions moved in ${s.owners.inst_in} last month`,
      bn: `এ বছর ${s.owners.trade_buyers}টি কোম্পানির মালিকেরা কিনেছেন, ${s.owners.trade_sellers}টির বেচেছেন; গত মাসে প্রতিষ্ঠান ঢুকেছে ${s.owners.inst_in}টিতে`,
    };
  if (slug === "is-the-profit-real" && s.quality) {
    const paper = s.quality.counts.paper + s.quality.counts.none;
    return {
      en: `${s.quality.counts.backed} companies' profit is backed by cash; ${paper} show profit that mostly stayed on paper`,
      bn: `${s.quality.counts.backed}টি কোম্পানির মুনাফা নগদে সমর্থিত; ${paper}টির মুনাফা বেশির ভাগই কাগজে`,
    };
  }
  if (slug === "dividends-you-can-count-on" && s.dividends)
    return {
      en: `${s.dividends.every_year} paid cash every year for 5 years; ${s.dividends.at_risk} dividends look at risk`,
      bn: `${s.dividends.every_year}টি টানা 5 বছর নগদ দিয়েছে; ${s.dividends.at_risk}টির ডিভিডেন্ড ঝুঁকিতে`,
    };
  if (slug === "results-season" && s.season)
    return {
      en: `${s.season.reported} reports so far: ${s.season.counts.up} made more profit`,
      bn: `এখন পর্যন্ত ${s.season.reported}টি ফল: ${s.season.counts.up}টির মুনাফা বেড়েছে`,
    };
  return null;
}

/**
 * The research hub (redone 2026-11-05, user: the six lists "are not premium
 * standards", build "more analytical and depth reports", "change the whole
 * view to a more clean and premium"). The six research lists and the four
 * free rankings were removed the same day (user decision); their URLs 301 to
 * this hub or to the screener's ready-made screens.
 */
export default async function StockInsightsPage() {
  const summary = await getResearchSummary().catch(() => null);

  return (
    <div className="rr-hub">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHeader
        eyebrow={
          <span className="rr-eyebrow">
            <span className="rr-crown" aria-hidden="true">
              <IconCrown size={14} />
            </span>
            <T en="Premium research" bn="প্রিমিয়াম গবেষণা" />
          </span>
        }
        title={<T en="Our research on the DSE" bn="ডিএসই নিয়ে আমাদের গবেষণা" />}
        lead={
          <T
            en="Six reports where we check every company for you, in plain words."
            bn="ছয়টি প্রতিবেদন, যেখানে আমরা আপনার হয়ে প্রতিটি কোম্পানি যাচাই করি, সহজ ভাষায়।"
          />
        }
      />

      {/* ── Reports ── */}
      <section className="rr-shelf" aria-labelledby="rr-shelf-reports">
        <div className="rr-shelf-head">
          <h2 id="rr-shelf-reports" className="rr-h2">
            <T en="Reports" bn="প্রতিবেদন" />
          </h2>
          <p className="rr-lead">
            <T en="Updated after every close." bn="প্রতিদিন বাজার বন্ধের পর হালনাগাদ।" />
          </p>
        </div>
        <div className="rr-reports">
          {REPORTS.map((r) => {
            const Icon = REPORT_ICON[r.slug];
            const fig = reportFigure(r.slug, summary);
            return (
              <Link key={r.slug} href={`/stock-insights/${r.slug}`} prefetch={false} className="rr-report">
                <span className="rr-report-top">
                  <span className="rr-report-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="rr-badge">
                    <IconCrown size={12} />
                    <T en="Premium" bn="প্রিমিয়াম" />
                  </span>
                </span>
                <span className="rr-report-t">
                  <T en={r.title.en} bn={r.title.bn} />
                </span>
                <span className="rr-report-q">
                  <T en={r.question.en} bn={r.question.bn} />
                </span>
                {fig && (
                  <span className="rr-report-fig">
                    <T en={fig.en} bn={fig.bn} />
                  </span>
                )}
                <span className="rr-report-go">
                  <T en="Read the report" bn="প্রতিবেদন পড়ুন" />
                  <IconArrowRight size={16} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="rr-hub-foot">
        <T
          en="Looking for a list of shares instead? The free screener has ready-made screens: high dividend, biggest companies, most traded and more."
          bn="শেয়ারের তালিকা খুঁজছেন? ফ্রি স্ক্রিনারে তৈরি করা স্ক্রিন আছে: বেশি ডিভিডেন্ড, সবচেয়ে বড় কোম্পানি, সবচেয়ে বেশি লেনদেন আর আরও।"
        />{" "}
        <Link href="/screener" prefetch={false} className="rr-hub-link">
          <T en="Open the screener" bn="স্ক্রিনার খুলুন" />
        </Link>
      </p>
    </div>
  );
}
