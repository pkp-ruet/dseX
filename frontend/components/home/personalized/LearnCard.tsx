import Link from "next/link";
import type { Lang } from "@/context/LangContext";
import { BLOG_POSTS } from "@/lib/blog-bn";
import { GUIDES } from "@/lib/guides";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import { IconBook, IconChevron } from "@/components/home/personalized/DashIcons";

interface Row {
  href: string;
  title: string;
  description: string;
  tag: string;
  bn: boolean;
}

/** Whole days since the epoch — one step per calendar day, so the picks
 *  rotate every morning without a server. */
function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/**
 * "Learn something today". A brand-new account (no portfolio, no watchlist)
 * gets the three beginner guides in Bengali. Everyone else gets two short
 * reads that rotate daily: one from the Bengali blog, one from the English
 * guides. The blog's emoji icons are not used — no emoji on the dashboard.
 */
export default function LearnCard({ brandNew, lang = "en" }: { brandNew: boolean; lang?: Lang }) {
  const bn = lang === "bn";
  let rows: Row[];
  if (brandNew) {
    rows = BLOG_POSTS.filter((p) => p.categoryId === "getting-started")
      .slice(0, 3)
      .map((p) => ({ href: `/blog/${p.slug}`, title: p.title, description: p.description, tag: t(lang, "guideBn"), bn: true }));
  } else {
    const d = dayIndex();
    const post = BLOG_POSTS[d % BLOG_POSTS.length];
    const guide = GUIDES[(d + 3) % GUIDES.length];
    rows = [
      post && { href: `/blog/${post.slug}`, title: post.title, description: post.description, tag: t(lang, "guideBn"), bn: true },
      guide && { href: `/learn/${guide.slug}`, title: guide.title, description: guide.description, tag: t(lang, "guideEn"), bn: false },
    ].filter((r): r is Row => !!r);
  }
  if (rows.length === 0) return null;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        title={t(lang, brandNew ? "startHere" : "learnTitle")}
        href={bn || brandNew ? "/blog" : "/learn"}
        linkLabel={t(lang, "allGuides")}
      />
      <p className="px-4 pt-3 text-[0.8rem] leading-snug text-[var(--text-muted)] sm:px-5">{t(lang, brandNew ? "startHereSub" : "learnSub")}</p>
      <ul className="mt-2 divide-y divide-[var(--cell-rule)]">
        {rows.map((r) => (
          <li key={r.href} lang={r.bn ? "bn" : "en"}>
            <Link
              prefetch={false}
              href={r.href}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5 ${r.bn ? "font-bn" : ""}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--primary)]" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }} aria-hidden>
                <IconBook size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[var(--text-muted)] ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : "en"}>
                  {r.tag}
                </span>
                <span className="block text-[0.9rem] font-bold leading-snug text-[var(--text)]">{r.title}</span>
                <span className="mt-0.5 block text-[0.75rem] leading-snug text-[var(--text-muted)] line-clamp-2">{r.description}</span>
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
