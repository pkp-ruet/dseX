import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { notFound } from "next/navigation";
import { getGlanceCached, getSamplePlan, getScores, getUpcomingResults } from "@/lib/api";
import {
  SAMPLE_PORTFOLIOS,
  SAMPLE_SLUGS,
  getSamplePortfolio,
  type SampleSlug,
} from "@/lib/sample-portfolios";
import { buildSampleReport } from "@/lib/sample-portfolio-report";
import { OpenScope } from "@/components/premium/LockScope";
import PortfolioAnswer from "@/components/portfolio/report/PortfolioAnswer";
import PfReportChapter from "@/components/portfolio/report/PfReportChapter";
import PfPlanSection from "@/components/portfolio/report/PfPlanSection";
import SampleHoldings from "@/components/sample-portfolio/SampleHoldings";
import SampleNav from "@/components/sample-portfolio/SampleNav";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  return SAMPLE_SLUGS.map((slug) => ({ slug }));
}

const META: Record<SampleSlug, { title: string; description: string; keywords: string[] }> = {
  diversified: {
    title: "Diversified DSE Portfolio: Sample Check",
    description:
      "The full TopStockBD check on a well-built Dhaka Stock Exchange portfolio, at today's prices: the answer, its companies, spread, prices paid, warnings and a plan, in plain words.",
    keywords: [
      "diversified DSE portfolio",
      "Bangladesh stock portfolio example",
      "well-built DSE portfolio",
      "DSE blue chip stocks",
      "portfolio diversification Bangladesh",
      "TopStockBD",
    ],
  },
  risky: {
    title: "Risky DSE Portfolio: Sample Check",
    description:
      "The full TopStockBD check on a risky Dhaka Stock Exchange portfolio, everything in one company bought near its peak: what goes wrong, and the plan to fix it, in plain words.",
    keywords: [
      "risky DSE portfolio",
      "concentrated stock portfolio",
      "DSE portfolio mistakes",
      "Bangladesh stock market risk",
      "portfolio analysis example",
      "TopStockBD",
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = getSamplePortfolio(slug);
  if (!portfolio) return {};
  const m = META[portfolio.slug];
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    alternates: { canonical: `/sample-portfolio/${portfolio.slug}` },
    openGraph: {
      title: m.title,
      description: m.description,
      url: `/sample-portfolio/${portfolio.slug}`,
      type: "article",
    },
  };
}

function buildJsonLd(slug: SampleSlug, title: string, description: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      url: `${BASE_URL}/sample-portfolio/${slug}`,
      publisher: {
        "@type": "Organization",
        name: "TopStockBD",
        url: BASE_URL,
      },
      inLanguage: "en",
      about: {
        "@type": "Thing",
        name: "Dhaka Stock Exchange portfolio analysis",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: SAMPLE_PORTFOLIOS[slug].name,
          item: `${BASE_URL}/sample-portfolio/${slug}`,
        },
      ],
    },
  ];
}

export default async function SamplePortfolioPage({ params }: Props) {
  const { slug } = await params;
  const portfolio = getSamplePortfolio(slug);
  if (!portfolio) notFound();

  const codes = portfolio.holdings.map((h) => h.trading_code.toUpperCase());
  // The scores are the page's primary data: no catch, so a failure keeps the
  // last good page (ISR). The rest only adds detail and may be missing.
  const [scores, glance, upcoming, buyNext] = await Promise.all([
    getScores(),
    getGlanceCached(codes).catch(() => []),
    getUpcomingResults().catch(() => null),
    getSamplePlan(portfolio.holdings).catch(() => null),
  ]);

  const { report, rows, analysis } = buildSampleReport(portfolio, scores, glance, upcoming?.meetings ?? [], buyNext);
  const meta = META[portfolio.slug];
  const other = portfolio.slug === "diversified" ? SAMPLE_PORTFOLIOS.risky : SAMPLE_PORTFOLIOS.diversified;

  return (
    <div className="smp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(portfolio.slug, meta.title, meta.description)),
        }}
      />

      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/" className="hover:text-primary transition-colors">
          <T en="Home" bn="হোম" />
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text-main">
          <T en={portfolio.name} bn={portfolio.nameBn} />
        </span>
      </nav>

      <PageHeader
        eyebrow={<T en="Sample portfolio check" bn="নমুনা পোর্টফোলিও যাচাই" />}
        title={<T en={portfolio.name} bn={portfolio.nameBn} />}
        lead={<T en={portfolio.tagline} bn={portfolio.taglineBn} />}
      />
      <p className="smp-story">
        <T en={portfolio.narrative} bn={portfolio.narrativeBn} />
      </p>

      {/* What this page is: the full check, open, on a made-up portfolio. */}
      <p className="smp-note" role="note">
        <T
          en="A made-up portfolio, checked with today's prices. Every part of the full check is open on this page, so you can see what TopStockBD does with your own shares."
          bn="এটি একটি বানানো পোর্টফোলিও, আজকের দামে যাচাই করা। পূর্ণ যাচাইয়ের প্রতিটি অংশ এই পেজে খোলা, যাতে দেখতে পারেন আপনার নিজের শেয়ার নিয়ে টপস্টকবিডি কী করে।"
        />
      </p>

      <SampleNav loss={report.chapters.some((c) => c.key === "loss")} />

      <SampleHoldings rows={rows} analysis={analysis} />

      {/* The full check, as a Premium reader sees it on their own portfolio. */}
      <OpenScope>
        <div className="smp-report">
          <PortfolioAnswer answer={report.answer} />
          {report.chapters.map((c) => (
            <PfReportChapter key={c.key} chapter={c} />
          ))}
          <PfPlanSection plan={report.plan} grade={analysis.grade} />
        </div>
      </OpenScope>

      <section className="smp-cta soft-card" aria-labelledby="smp-cta-h">
        <h2 id="smp-cta-h" className="text-xl font-bold text-text-main">
          <T en="Get this check on your own shares" bn="নিজের শেয়ারে এই যাচাই নিন" />
        </h2>
        <p className="text-base text-text-main">
          <T
            en="Add your shares for free and see your money, your grade and what the check found. Premium opens every answer and checks your shares again after every close."
            bn="ফ্রিতে আপনার শেয়ার যোগ করুন, দেখুন আপনার টাকা, গ্রেড আর যাচাইয়ে কী পাওয়া গেল। প্রিমিয়াম প্রতিটি উত্তর খুলে দেয়, আর প্রতিদিন বাজার বন্ধের পর আবার যাচাই করে।"
          />
        </p>
        <div className="smp-cta-actions">
          <Button href="/register" size="lg">
            <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
          </Button>
          <Button href="/portfolio" variant="quiet" size="lg">
            <T en="Open my portfolio" bn="আমার পোর্টফোলিও খুলুন" />
          </Button>
        </div>
      </section>

      <p className="smp-other">
        <Link href={`/sample-portfolio/${other.slug}`} className="font-semibold text-primary-ink hover:underline active:opacity-70">
          <T en={`See the other sample: ${other.name}`} bn={`অন্য নমুনাটি দেখুন: ${other.nameBn}`} /> →
        </Link>
      </p>

      <p className="pf-disclaimer">
        <T
          en="A sample for learning, not advice. Always do your own research before making investment decisions."
          bn="শেখার জন্য একটি নমুনা, পরামর্শ নয়। বিনিয়োগের সিদ্ধান্ত নেওয়ার আগে সবসময় নিজে যাচাই করুন।"
        />
      </p>
    </div>
  );
}
