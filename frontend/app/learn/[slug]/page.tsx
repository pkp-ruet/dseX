import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/lib/guides";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: `${guide.title} — TopStockBD`,
    description: guide.description,
    keywords: [
      guide.title,
      "DSE beginner guide",
      "Bangladesh stock market",
      "Dhaka Stock Exchange",
      "TopStockBD",
    ],
    alternates: { canonical: `/learn/${slug}` },
    openGraph: {
      title: `${guide.title} — TopStockBD`,
      description: guide.description,
      url: `/learn/${slug}`,
      type: "article",
    },
  };
}

function buildJsonLd(slug: string, title: string, description: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      url: `${BASE_URL}/learn/${slug}`,
      publisher: {
        "@type": "Organization",
        name: "TopStockBD",
        url: BASE_URL,
      },
      inLanguage: "en",
      about: {
        "@type": "Thing",
        name: "Dhaka Stock Exchange investing",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Beginner's Guide", item: `${BASE_URL}/learn` },
        { "@type": "ListItem", position: 3, name: title, item: `${BASE_URL}/learn/${slug}` },
      ],
    },
  ];
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 space-y-10">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(slug, guide.title, guide.description)),
        }}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-2 text-xs text-[var(--ink-muted)]"
      >
        <Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/learn" className="hover:text-[var(--primary)] transition-colors">Beginner&apos;s Guide</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--ink)]">{guide.title}</span>
      </nav>

      {/* Hero */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{guide.icon}</span>
          <span className="text-xs text-[var(--ink-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
            {guide.readTime}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--ink)] leading-snug">
          {guide.title}
        </h1>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          {guide.description}
        </p>
      </section>

      {/* Divider */}
      <hr className="border-[var(--border)]" />

      {/* Sections */}
      <div className="space-y-8">
        {guide.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--ink)]">
              {section.heading}
            </h2>
            {Array.isArray(section.body) ? (
              <ul className="space-y-2 text-[var(--ink-muted)] text-sm leading-relaxed list-disc list-inside">
                {section.body.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--ink-muted)] leading-relaxed text-sm">
                {section.body}
              </p>
            )}
          </section>
        ))}
      </div>

      {/* Divider */}
      <hr className="border-[var(--border)]" />

      {/* Navigation */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/learn"
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
        >
          ← All Guides
        </Link>
        <Link
          href="/dsestockranking"
          className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          View Score Leaderboard
        </Link>
      </div>

    </main>
  );
}
