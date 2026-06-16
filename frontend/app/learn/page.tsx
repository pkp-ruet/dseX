import type { Metadata } from "next";
import Link from "next/link";
import {
  GUIDES,
  GUIDE_CATEGORY_ORDER,
  GUIDE_CATEGORY_BLURB,
  GUIDE_CATEGORY_ICON,
  GUIDE_CATEGORY_SHORT,
  categoryAnchor,
} from "@/lib/guides";
import CategoryNav from "@/components/learn/CategoryNav";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Beginner's Guide to Stock Market — TopStockBD",
  description:
    "Everything you need to start investing in the Dhaka Stock Exchange — from opening a BO account to understanding fundamental analysis.",
  keywords: [
    "how to invest in Bangladesh stock market",
    "DSE beginner guide",
    "Dhaka Stock Exchange for beginners",
    "how to open BO account Bangladesh",
    "how to buy shares in Bangladesh",
    "stock market basics Bangladesh",
    "fundamental analysis DSE",
  ],
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Beginner's Guide to Stock Market — TopStockBD",
    description:
      "Everything you need to start investing in the Dhaka Stock Exchange — from opening a BO account to understanding fundamental analysis.",
    url: "/learn",
    type: "website",
  },
};

export default function LearnPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/learn`,
        url: `${BASE_URL}/learn`,
        name: "Beginner's Guide to Stock Market — TopStockBD",
        description:
          "Everything you need to start investing in the Dhaka Stock Exchange — from opening a BO account to understanding fundamental analysis.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Learn", item: `${BASE_URL}/learn` },
        ],
      },
    ],
  };

  const totalGuides = GUIDES.length;

  const categories = GUIDE_CATEGORY_ORDER.map((category) => ({
    key: category,
    label: category,
    short: GUIDE_CATEGORY_SHORT[category],
    blurb: GUIDE_CATEGORY_BLURB[category],
    anchor: categoryAnchor(category),
    icon: GUIDE_CATEGORY_ICON[category],
    count: GUIDES.filter((g) => g.category === category).length,
  })).filter((c) => c.count > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Sticky jump bar — appears once you scroll past the index */}
      <CategoryNav categories={categories} />

    <main className="max-w-3xl mx-auto px-4 py-10 sm:py-12 space-y-12">

      {/* Hero */}
      <section className="soft-card ambient-panel p-6 sm:p-8 text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--primary-ink)]">
          📚 Learn · {totalGuides} guides
        </span>
        <h1 className="text-[1.85rem] sm:text-[2.4rem] font-bold leading-[1.1] tracking-tight text-[var(--ink)]">
          Beginner&apos;s Guide to the Stock Market
        </h1>
        <p className="text-[1.0625rem] leading-[1.7] text-[var(--ink-2)] max-w-xl mx-auto">
          New to investing in Bangladesh? Start here.
        </p>
      </section>

      {/* Category index — tap to jump to a section */}
      <section aria-label="Browse by topic" className="space-y-3">
        <h2 className="text-center text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Browse by topic
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((c) => (
            <a
              key={c.anchor}
              href={`#${c.anchor}`}
              className="soft-card hover-lift group flex flex-col gap-1.5 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-2))] text-lg">
                  {c.icon}
                </span>
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.68rem] font-bold text-[var(--ink-muted)]">
                  {c.count}
                </span>
              </div>
              <span className="font-bold text-[var(--ink)] text-[0.92rem] leading-snug group-hover:text-[var(--primary)] transition-colors">
                {c.label}
              </span>
              <span className="text-[0.78rem] leading-snug text-[var(--ink-2)] line-clamp-2">
                {c.blurb}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Guide sections, grouped by category */}
      {GUIDE_CATEGORY_ORDER.map((category) => {
        const guidesInCategory = GUIDES.filter((g) => g.category === category);
        if (guidesInCategory.length === 0) return null;
        return (
          <section key={category} id={categoryAnchor(category)} className="scroll-mt-28 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--primary-soft)]"
                />
                <h2 className="text-[1.35rem] font-bold tracking-tight text-[var(--ink)]">
                  {category}
                </h2>
                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[0.7rem] font-bold text-[var(--ink-muted)]">
                  {guidesInCategory.length}
                </span>
              </div>
              <p className="text-[0.95rem] leading-relaxed text-[var(--ink-2)] pl-4">
                {GUIDE_CATEGORY_BLURB[category]}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {guidesInCategory.map((guide) => (
                <Link
                  key={guide.slug}
                  prefetch={false}
                  href={`/learn/${guide.slug}`}
                  className="soft-card hover-lift group flex flex-col gap-3 p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-2))] text-2xl">
                      {guide.icon}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[0.7rem] font-medium text-[var(--ink-muted)]">
                      {guide.readTime}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--ink)] text-[1.05rem] leading-snug group-hover:text-[var(--primary)] transition-colors">
                      {guide.title}
                    </h3>
                    <p className="mt-1.5 text-[0.9rem] text-[var(--ink-2)] leading-relaxed">
                      {guide.description}
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-[0.82rem] font-semibold text-[var(--primary)]">
                    Read guide
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Footer CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-[1.0625rem] font-semibold text-[var(--ink)]">
          Ready to put your knowledge to work?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/dsestockranking" className="ui-btn ui-btn-md ui-btn-primary">
            View Score Leaderboard
          </Link>
          <Link href="/" className="ui-btn ui-btn-md ui-btn-ghost">
            Back to Home
          </Link>
        </div>
      </section>

    </main>
    </>
  );
}
