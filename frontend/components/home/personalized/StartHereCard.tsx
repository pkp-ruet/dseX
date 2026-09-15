import Link from "next/link";
import type { Lang } from "@/context/LangContext";
import { BLOG_POSTS } from "@/lib/blog-bn";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import { IconBook, IconChevron } from "@/components/home/personalized/DashIcons";

const MAX = 3;

/**
 * "New to shares? Start here" — three beginner guides from the Bengali blog,
 * shown only while a user has neither a portfolio nor a watchlist. The blog
 * exists for exactly this reader and was one aside link away; a brand-new
 * account should meet it on the first screen.
 *
 * Titles are always Bengali (the guides are), so the rows carry lang="bn".
 * The blog data's emoji icons are not used — no emoji on the dashboard.
 */
export default function StartHereCard({ lang = "en" }: { lang?: Lang }) {
  const posts = BLOG_POSTS.filter((p) => p.categoryId === "getting-started").slice(0, MAX);
  if (posts.length === 0) return null;
  const bn = lang === "bn";
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "startHere")} href="/blog" linkLabel={t(lang, "allGuides")} />
      <p className="px-4 pt-3 text-[0.8rem] leading-snug text-[var(--text-muted)] sm:px-5">{t(lang, "startHereSub")}</p>
      <ul className="mt-2 divide-y divide-[var(--cell-rule)]" lang="bn">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              prefetch={false}
              href={`/blog/${p.slug}`}
              className="font-bn flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--primary)]"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
                aria-hidden
              >
                <IconBook size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9rem] font-bold leading-snug text-[var(--text)]">{p.title}</span>
                <span className="mt-0.5 block text-[0.75rem] leading-snug text-[var(--text-muted)] line-clamp-2">
                  {p.description}
                </span>
              </span>
              <span className="shrink-0 text-[var(--text-muted)]" aria-hidden>
                <IconChevron size={15} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
