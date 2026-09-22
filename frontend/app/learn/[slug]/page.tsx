import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/lib/guides";
import { guideLanguages } from "@/lib/i18n-pairs";

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
    title: `${guide.title}`,
    description: guide.description,
    keywords: [
      guide.title,
      "DSE beginner guide",
      "Bangladesh stock market",
      "Dhaka Stock Exchange",
      "TopStockBD",
    ],
    alternates: { canonical: `/learn/${slug}`, languages: guideLanguages(slug) },
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
    <div className="page-narrow space-y-10">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(slug, guide.title, guide.description)),
        }}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs font-medium text-text-muted"
      >
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <Link href="/learn" className="hover:text-primary transition-colors">Learn</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <span className="text-text-muted">{guide.title}</span>
      </nav>

      <PageHeader
        size="article"
        eyebrow={<>{guide.category} · {guide.readTime}</>}
        title={guide.title}
        bn="সহজ ভাষায় লেখা একটি গাইড — ধীরে ধীরে পড়ুন, উদাহরণগুলো দেখুন।"
        lead={guide.description}
      />

      {/* Article body */}
      <article className="space-y-9">
        {guide.sections.map((section) => (
          <section key={section.heading} className="space-y-3.5">
            <h2 className="text-xl sm:text-2xl font-bold leading-snug tracking-tight text-text-main">
              {section.heading}
            </h2>
            {Array.isArray(section.body) ? (
              <ul className="space-y-3">
                {section.body.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-lg leading-[1.7] text-text-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-lg leading-[1.78] text-text-muted">
                {section.body}
              </p>
            )}
          </section>
        ))}
      </article>

      {/* More in this category */}
      {related.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="text-base font-bold uppercase tracking-[0.08em] text-text-main">
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
                  <span className="block font-semibold text-text-main leading-snug group-hover:text-primary transition-colors">
                    {g.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">{g.readTime}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-lg font-semibold text-text-main">
          Ready to put this into practice?
        </p>
        <p className="text-sm leading-relaxed text-text-muted max-w-md mx-auto">
          See which DSE companies score highest on real fundamentals — no spreadsheets, no annual reports.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Link href="/dsestockranking" className="btn-primary">
            View Score Leaderboard
          </Link>
          <Link href="/learn" className="btn-quiet">
            ← All Guides
          </Link>
        </div>
      </section>

    </div>
  );
}
