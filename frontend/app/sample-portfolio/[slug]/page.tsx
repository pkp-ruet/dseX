import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { getScores } from "@/lib/api";
import {
  SAMPLE_PORTFOLIOS,
  SAMPLE_SLUGS,
  getSamplePortfolio,
  type SampleSlug,
} from "@/lib/sample-portfolios";
import { buildSampleAnalysis } from "@/lib/sample-portfolio-analysis";
import PortfolioAnalysisView from "@/components/portfolio/PortfolioAnalysisView";
import SamplePortfolioStats from "@/components/sample-portfolio/SamplePortfolioStats";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 86400;

export async function generateStaticParams() {
  return SAMPLE_SLUGS.map((slug) => ({ slug }));
}

const META: Record<SampleSlug, { title: string; description: string; keywords: string[] }> = {
  diversified: {
    title: "Diversified DSE Portfolio — Sample Analysis",
    description:
      "See a real example of a well-built Dhaka Stock Exchange portfolio. Spread across 6 sectors, strong companies, fair entry prices — analysed line by line.",
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
    title: "Risky DSE Portfolio — Sample Analysis",
    description:
      "What does a risky Dhaka Stock Exchange portfolio look like? See a sample concentrated DSE bet with a single mid-tier stock at a peak buy price — analysed in plain English.",
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

  const scores = await getScores().catch(() => null);
  if (!scores) {
    return (
      <div className="page-narrow py-12">
        <p className="text-text-muted text-center">
          Live data is unavailable right now. Please try again shortly.
        </p>
      </div>
    );
  }

  const { rows, analysis } = buildSampleAnalysis(portfolio, scores);
  const meta = META[portfolio.slug];

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(portfolio.slug, meta.title, meta.description)),
        }}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-xs text-text-muted"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text-main">{portfolio.name}</span>
      </nav>

      <PageHeader
        eyebrow="Sample portfolio analysis"
        title={portfolio.name}
        bn="একটি নমুনা পোর্টফোলিও — আসল স্কোর ও দাম দিয়ে বিশ্লেষণ করে দেখানো।"
        lead={portfolio.tagline}
      />
      <p className="text-text-main leading-relaxed text-sm sm:text-base">
        {portfolio.narrative}
      </p>

      {/* Quick stats */}
      <SamplePortfolioStats rows={rows} analysis={analysis} />

      <hr className="border-border" />

      {/* Full analysis (verdict, good/bad/consider, sector chart, detailed holdings, disclaimer) */}
      <PortfolioAnalysisView analysis={analysis} />

      <hr className="border-border" />

      {/* CTA */}
      <section
        className="relative overflow-hidden rounded-lg border border-border bg-surface"
        aria-label="Sign up CTA"
      >
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, var(--primary), var(--primary))" }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm sm:text-base font-semibold text-text-main leading-snug">
              Want this analysis for your real portfolio?
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Add your holdings and get the same plain-English report — free.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/register"
              className="btn-primary"
            >
              Sign up free
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </Link>
            <Link
              href="/portfolio"
              className="btn-quiet"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Other sample */}
      <section className="text-center">
        <p className="text-xs text-text-muted mb-2">See the other sample portfolio</p>
        {portfolio.slug === "diversified" ? (
          <Link
            href="/sample-portfolio/risky"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View the Risky Portfolio analysis →
          </Link>
        ) : (
          <Link
            href="/sample-portfolio/diversified"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View the Diversified Portfolio analysis →
          </Link>
        )}
      </section>
    </div>
  );
}
