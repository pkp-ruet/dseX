"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { ACC, accVars } from "@/components/home/personalized/accents";
import DashHeader from "@/components/home/personalized/DashHeader";
import { IconBook, IconChevron } from "@/components/home/personalized/DashIcons";

interface Row {
  href: string;
  title: string;
  description: string;
  tag: string;
  bn: boolean;
}

type LinkSource = { slug: string; title: string; description: string };
type BlogSource = LinkSource & { categoryId?: string };

function pickRows(
  posts: readonly BlogSource[],
  guides: readonly LinkSource[],
  brandNew: boolean,
  lang: Lang,
): Row[] {
  if (brandNew) {
    return posts.filter((p) => p.categoryId === "getting-started")
      .slice(0, 3)
      .map((p) => ({ href: `/blog/${p.slug}`, title: p.title, description: p.description, tag: t(lang, "guideBn"), bn: true }));
  }
  const d = dayIndex();
  const post = posts[d % posts.length];
  const guide = guides[(d + 3) % guides.length];
  return [
    post && { href: `/blog/${post.slug}`, title: post.title, description: post.description, tag: t(lang, "guideBn"), bn: true },
    guide && { href: `/learn/${guide.slug}`, title: guide.title, description: guide.description, tag: t(lang, "guideEn"), bn: false },
  ].filter((r): r is Row => !!r);
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
  const [rows, setRows] = useState<Row[] | null>(null);

  // The blog + guide modules carry every article body (~260 KB). Loading them
  // on demand keeps them out of the dashboard bundle; the card appears once
  // they arrive.
  useEffect(() => {
    let alive = true;
    Promise.all([import("@/lib/blog-bn"), import("@/lib/guides")])
      .then(([{ BLOG_POSTS }, { GUIDES }]) => {
        if (alive) setRows(pickRows(BLOG_POSTS, GUIDES, brandNew, lang));
      })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [brandNew, lang]);

  if (!rows || rows.length === 0) return null;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.steel} icon={<IconBook size={15} />}
        title={t(lang, brandNew ? "startHere" : "learnTitle")}
        href={bn || brandNew ? "/blog" : "/learn"}
        linkLabel={t(lang, "allGuides")}
      />
      <p className="px-4 pt-3 text-sm leading-snug text-text-muted sm:px-5">{t(lang, brandNew ? "startHereSub" : "learnSub")}</p>
      <ul className="mt-2 divide-y divide-cell-rule">
        {rows.map((r) => (
          <li key={r.href} lang={r.bn ? "bn" : "en"}>
            <Link
              prefetch={false}
              href={r.href}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 active:bg-surface-2 sm:px-5 ${r.bn ? "font-bn" : ""}`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                style={{ ...accVars(ACC.steel), color: "var(--acc)", background: "color-mix(in srgb, var(--acc) 13%, transparent)" }}
                aria-hidden
              >
                <IconBook size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-xs font-extrabold uppercase tracking-[0.08em] text-text-muted ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : "en"}>
                  {r.tag}
                </span>
                <span className="block text-sm font-bold leading-snug text-text-main">{r.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-text-muted line-clamp-2">{r.description}</span>
              </span>
              <span className="shrink-0 text-text-muted" aria-hidden>
                <IconChevron size={15} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
