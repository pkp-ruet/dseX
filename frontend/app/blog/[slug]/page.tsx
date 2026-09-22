import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost, getBlogCategory } from "@/lib/blog-bn";
import { blogLanguages } from "@/lib/i18n-pairs";

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
    alternates: { canonical: `/blog/${slug}`, languages: blogLanguages(slug) },
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
    <div lang="bn" className="font-bn page-narrow space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(slug, post.title, post.description)),
        }}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-muted"
      >
        <Link href="/" className="hover:text-primary transition-colors">হোম</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <Link href="/blog" className="hover:text-primary transition-colors">বাংলা ব্লগ</Link>
        <span aria-hidden="true" className="opacity-50">/</span>
        <span className="text-text-muted">{post.title}</span>
      </nav>

      <PageHeader
        size="article"
        eyebrow={<>{category?.label ?? "বাংলা ব্লগ"} · {post.readTime}</>}
        title={post.title}
        bn="A beginner guide in everyday Bangla."
        subLang="en"
        lead={post.description}
      />

      {/* Article body */}
      <article className="space-y-9">
        {post.sections.map((section) => (
          <section key={section.heading} className="space-y-3.5">
            <h2 className="text-xl sm:text-2xl font-bold leading-[1.4] tracking-tight text-text-main">
              {section.heading}
            </h2>
            {Array.isArray(section.body) ? (
              <ul className="space-y-3">
                {section.body.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-lg leading-[1.85] text-text-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.7em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-lg leading-[1.9] text-text-muted">
                {section.body}
              </p>
            )}
          </section>
        ))}
      </article>

      {/* More in this category */}
      {related.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="text-base font-bold tracking-tight text-text-main">
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
                  <span className="block font-semibold text-text-main leading-snug group-hover:text-primary transition-colors">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-muted">{p.readTime}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="soft-card ambient-panel p-6 sm:p-7 text-center space-y-4">
        <p className="text-lg font-semibold text-text-main">
          এবার শেখাটা কাজে লাগানোর পালা।
        </p>
        <p className="text-base leading-[1.8] text-text-muted max-w-md mx-auto">
          কোন কোম্পানিগুলো আসল হিসাবের দিক থেকে সবচেয়ে শক্তিশালী, এক নজরে দেখুন — কোনো স্প্রেডশিট বা বার্ষিক প্রতিবেদন ঘাঁটতে হবে না।
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <Link href="/dsestockranking" className="btn-primary">
            সেরা স্কোরের শেয়ার দেখুন
          </Link>
          <Link href="/blog" className="btn-quiet">
            ← সব ব্লগ
          </Link>
        </div>
      </section>
    </div>
  );
}
