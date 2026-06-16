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

  const related = GUIDES.filter(
    (g) => g.category === guide.category && g.slug !== guide.slug,
  ).slice(0, 4);

  return (
    <main className="max-w-[44rem] mx-auto px-4 py-10 sm:py-12 space-y-10">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(slug, guide.title, guide.description)),
        }}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--ink-muted)]"
      >
        <Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <Link href="/learn" className="hover:text-[var(--primary)] transition-colors">Learn</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <span className="text-[var(--ink-2)]">{guide.title}</span>
      </nav>

      {/* Hero */}
      <header className="soft-card ambient-panel p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--primary-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))]"
          >
            {guide.category}
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-[0.72rem] font-medium text-[var(--ink-muted)]">
            <span aria-hidden="true">🕑</span>
            {guide.readTime}
          </span>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-4xl sm:text-5xl leading-none shrink-0" aria-hidden="true">
            {guide.icon}
          </span>
          <h1 className="text-[1.75rem] sm:text-[2.25rem] font-bold leading-[1.12] tracking-tight text-[var(--ink)]">
            {guide.title}
          </h1>
        </div>
        <p className="text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]">
          {guide.description}
        </p>
      </header>

      {/* Article body */}
      <article className="space-y-9">
        {guide.sections.map((section) => (
          <section key={section.heading} className="space-y-3.5">
            <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold leading-snug tracking-tight text-[var(--ink)]">
              {section.heading}
            </h2>
            {Array.isArray(section.body) ? (
              <ul className="space-y-3">
                {section.body.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[1.0625rem] leading-[1.7] text-[var(--ink-2)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[1.0625rem] leading-[1.78] text-[var(--ink-2)]">
                {section.body}
              </p>
            )}
          </section>
        ))}
      </article>

      {/* More in this category */}
      {related.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="text-base font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
            More in {guide.category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {related.map((g) => (
              <Link
                key={g.slug}
                prefetch={false}
                href={`/learn/${g.slug}`}
                className="soft-card hover-lift group flex items-center gap-3.5 p-4"
              >
                <span className="text-2xl shrink-0" aria-hidden="true">{g.icon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--ink)] leading-snug group-hover:text-[var(--primary)] transition-colors">
                    {g.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">{g.readTime}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-[1.0625rem] font-semibold text-[var(--ink)]">
          Ready to put this into practice?
        </p>
        <p className="text-sm leading-relaxed text-[var(--ink-2)] max-w-md mx-auto">
          See which DSE companies score highest on real fundamentals — no spreadsheets, no annual reports.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Link href="/dsestockranking" className="ui-btn ui-btn-md ui-btn-primary">
            View Score Leaderboard
          </Link>
          <Link href="/learn" className="ui-btn ui-btn-md ui-btn-ghost">
            ← All Guides
          </Link>
        </div>
      </section>

    </main>
  );
}
