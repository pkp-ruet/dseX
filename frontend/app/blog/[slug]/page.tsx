import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost, getBlogCategory } from "@/lib/blog-bn";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: [
      post.title,
      "শেয়ার বাজার",
      "শেয়ার বাজার বাংলা",
      "ডিএসই",
      "ঢাকা স্টক এক্সচেঞ্জ",
      "বাংলায় বিনিয়োগ",
      "TopStockBD",
    ],
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${slug}`,
      type: "article",
      locale: "bn_BD",
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
      url: `${BASE_URL}/blog/${slug}`,
      inLanguage: "bn",
      publisher: {
        "@type": "Organization",
        name: "TopStockBD",
        url: BASE_URL,
      },
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
        { "@type": "ListItem", position: 2, name: "বাংলা ব্লগ", item: `${BASE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: title, item: `${BASE_URL}/blog/${slug}` },
      ],
    },
  ];
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const category = getBlogCategory(post.categoryId);
  const related = BLOG_POSTS.filter(
    (p) => p.categoryId === post.categoryId && p.slug !== post.slug,
  ).slice(0, 4);

  return (
    <main lang="bn" className="font-bn max-w-[44rem] mx-auto px-4 py-10 sm:py-12 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(slug, post.title, post.description)),
        }}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center gap-2 text-[0.8rem] font-medium text-[var(--ink-muted)]"
      >
        <Link href="/" className="hover:text-[var(--primary)] transition-colors">হোম</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <Link href="/blog" className="hover:text-[var(--primary)] transition-colors">বাংলা ব্লগ</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <span className="text-[var(--ink-2)]">{post.title}</span>
      </nav>

      {/* Hero */}
      <header className="soft-card ambient-panel p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] px-3 py-1 text-[0.78rem] font-bold tracking-wide text-[var(--primary-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))]"
          >
            {category?.label ?? "বাংলা ব্লগ"}
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-[0.8rem] font-medium text-[var(--ink-muted)]">
            <span aria-hidden="true">🕑</span>
            {post.readTime}
          </span>
        </div>
        <div className="flex items-start gap-4">
          <span className="text-4xl sm:text-5xl leading-none shrink-0" aria-hidden="true">
            {post.icon}
          </span>
          <h1 className="text-[1.65rem] sm:text-[2.1rem] font-bold leading-[1.3] tracking-tight text-[var(--ink)]">
            {post.title}
          </h1>
        </div>
        <p className="text-[1.0625rem] leading-[1.85] text-[var(--ink-2)]">
          {post.description}
        </p>
      </header>

      {/* Article body */}
      <article className="space-y-9">
        {post.sections.map((section) => (
          <section key={section.heading} className="space-y-3.5">
            <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold leading-[1.4] tracking-tight text-[var(--ink)]">
              {section.heading}
            </h2>
            {Array.isArray(section.body) ? (
              <ul className="space-y-3">
                {section.body.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[1.0625rem] leading-[1.85] text-[var(--ink-2)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.7em] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--primary)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[1.0625rem] leading-[1.9] text-[var(--ink-2)]">
                {section.body}
              </p>
            )}
          </section>
        ))}
      </article>

      {/* More in this category */}
      {related.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="text-[1.05rem] font-bold tracking-tight text-[var(--ink)]">
            আরও পড়ুন: {category?.label ?? "বাংলা ব্লগ"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {related.map((p) => (
              <Link
                key={p.slug}
                prefetch={false}
                href={`/blog/${p.slug}`}
                className="soft-card hover-lift group flex items-center gap-3.5 p-4"
              >
                <span className="text-2xl shrink-0" aria-hidden="true">{p.icon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--ink)] leading-snug group-hover:text-[var(--primary)] transition-colors">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-[0.78rem] text-[var(--ink-muted)]">{p.readTime}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-[1.0625rem] font-semibold text-[var(--ink)]">
          এবার শেখাটা কাজে লাগানোর পালা।
        </p>
        <p className="text-[0.92rem] leading-[1.8] text-[var(--ink-2)] max-w-md mx-auto">
          কোন কোম্পানিগুলো আসল হিসাবের দিক থেকে সবচেয়ে শক্তিশালী, এক নজরে দেখুন — কোনো স্প্রেডশিট বা বার্ষিক প্রতিবেদন ঘাঁটতে হবে না।
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Link href="/dsestockranking" className="ui-btn ui-btn-md ui-btn-primary">
            সেরা স্কোরের শেয়ার দেখুন
          </Link>
          <Link href="/blog" className="ui-btn ui-btn-md ui-btn-ghost">
            ← সব ব্লগ
          </Link>
        </div>
      </section>
    </main>
  );
}
