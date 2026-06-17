import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_CATEGORIES, BLOG_POSTS } from "@/lib/blog-bn";
import CategoryNav from "@/components/learn/CategoryNav";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "বাংলা ব্লগ — সহজ ভাষায় শেয়ার বাজার",
  description:
    "ঢাকা স্টক এক্সচেঞ্জে (ডিএসই) বিনিয়োগ শিখুন সহজ বাংলায় — বিও অ্যাকাউন্ট খোলা, আইপিওতে আবেদন, ডিভিডেন্ড আর শেয়ার বাজারের প্রাথমিক ধারণা।",
  keywords: [
    "শেয়ার বাজার",
    "শেয়ার বাজার বাংলা",
    "ডিএসই",
    "ঢাকা স্টক এক্সচেঞ্জ",
    "বিও অ্যাকাউন্ট",
    "আইপিও",
    "ডিভিডেন্ড",
    "শেয়ার বাজার গাইড",
    "বাংলায় বিনিয়োগ শিক্ষা",
    "DSE Bangla guide",
    "share bazar Bangla",
    "how to invest in Bangladesh stock market in Bangla",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "বাংলা ব্লগ — সহজ ভাষায় শেয়ার বাজার",
    description:
      "ঢাকা স্টক এক্সচেঞ্জে (ডিএসই) বিনিয়োগ শিখুন সহজ বাংলায় — বিও অ্যাকাউন্ট, আইপিও, ডিভিডেন্ড আর প্রাথমিক ধারণা।",
    url: "/blog",
    type: "website",
  },
};

export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/blog`,
        url: `${BASE_URL}/blog`,
        name: "বাংলা ব্লগ — সহজ ভাষায় শেয়ার বাজার",
        description:
          "ঢাকা স্টক এক্সচেঞ্জে (ডিএসই) বিনিয়োগ শিখুন সহজ বাংলায় — বিও অ্যাকাউন্ট খোলা, আইপিওতে আবেদন, ডিভিডেন্ড আর শেয়ার বাজারের প্রাথমিক ধারণা।",
        inLanguage: "bn",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "বাংলা ব্লগ", item: `${BASE_URL}/blog` },
        ],
      },
    ],
  };

  const totalPosts = BLOG_POSTS.length;

  const categories = BLOG_CATEGORIES.map((category) => ({
    key: category.id,
    label: category.label,
    short: category.short,
    blurb: category.blurb,
    anchor: category.id,
    icon: category.icon,
    count: BLOG_POSTS.filter((p) => p.categoryId === category.id).length,
  })).filter((c) => c.count > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Sticky jump bar — appears once you scroll past the index */}
      <CategoryNav categories={categories} />

      <main lang="bn" className="font-bn max-w-3xl mx-auto px-4 py-10 sm:py-12 space-y-12">
        {/* Hero */}
        <section className="soft-card ambient-panel p-6 sm:p-8 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] px-3 py-1 text-[0.78rem] font-bold tracking-wide text-[var(--primary-ink)]">
            📚 বাংলা ব্লগ · {totalPosts}টি লেখা
          </span>
          <h1 className="text-[1.85rem] sm:text-[2.4rem] font-bold leading-[1.25] tracking-tight text-[var(--ink)]">
            সহজ ভাষায় শেয়ার বাজার
          </h1>
          <p className="text-[1.0625rem] leading-[1.85] text-[var(--ink-2)] max-w-xl mx-auto">
            বাংলাদেশে বিনিয়োগে একদম নতুন? কঠিন কোনো শব্দ ছাড়া, গল্পের মতো করে — এখান থেকেই শুরু করুন।
          </p>
        </section>

        {/* Category index — tap to jump to a section */}
        <section aria-label="বিষয় অনুযায়ী দেখুন" className="space-y-3">
          <h2 className="text-center text-[0.85rem] font-bold tracking-wide text-[var(--ink-muted)]">
            বিষয় অনুযায়ী দেখুন
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
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.72rem] font-bold text-[var(--ink-muted)]">
                    {c.count}টি
                  </span>
                </div>
                <span className="font-bold text-[var(--ink)] text-[0.98rem] leading-snug group-hover:text-[var(--primary)] transition-colors">
                  {c.label}
                </span>
                <span className="text-[0.82rem] leading-snug text-[var(--ink-2)] line-clamp-2">
                  {c.blurb}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Post sections, grouped by category */}
        {BLOG_CATEGORIES.map((category) => {
          const postsInCategory = BLOG_POSTS.filter((p) => p.categoryId === category.id);
          if (postsInCategory.length === 0) return null;
          return (
            <section key={category.id} id={category.id} className="scroll-mt-28 space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--primary-soft)]"
                  />
                  <h2 className="text-[1.4rem] font-bold tracking-tight text-[var(--ink)]">
                    {category.label}
                  </h2>
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[0.74rem] font-bold text-[var(--ink-muted)]">
                    {postsInCategory.length}টি
                  </span>
                </div>
                <p className="text-[0.95rem] leading-relaxed text-[var(--ink-2)] pl-4">
                  {category.blurb}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {postsInCategory.map((post) => (
                  <Link
                    key={post.slug}
                    prefetch={false}
                    href={`/blog/${post.slug}`}
                    className="soft-card hover-lift group flex flex-col gap-3 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-2))] text-2xl">
                        {post.icon}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[0.74rem] font-medium text-[var(--ink-muted)]">
                        {post.readTime}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--ink)] text-[1.08rem] leading-snug group-hover:text-[var(--primary)] transition-colors">
                        {post.title}
                      </h3>
                      <p className="mt-1.5 text-[0.92rem] text-[var(--ink-2)] leading-[1.7]">
                        {post.description}
                      </p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1 text-[0.86rem] font-semibold text-[var(--primary)]">
                      পড়ুন
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
            শেখা শেষ? এবার কাজে লাগান।
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dsestockranking" className="ui-btn ui-btn-md ui-btn-primary">
              সেরা স্কোরের শেয়ার দেখুন
            </Link>
            <Link href="/learn" className="ui-btn ui-btn-md ui-btn-ghost">
              English Guides
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
