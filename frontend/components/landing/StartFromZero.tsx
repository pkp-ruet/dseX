import Link from "next/link";
import type { CSSProperties } from "react";
import SectionHead from "@/components/i18n/SectionHead";
import { T } from "@/components/i18n/T";
import { BLOG_TO_LEARN } from "@/lib/i18n-pairs";

/**
 * Block 8a — the entry point for someone who has never bought a share.
 *
 * Sits near the bottom on purpose: by here the page has shown the product, the
 * data and the method, and the reader who is still unsure whether any of this is
 * for them needs a door that starts at zero. Bengali readers go to the Bengali
 * blog post, English readers to its paired English guide (`lib/i18n-pairs.ts`).
 */

const STARTERS = [
  {
    slug: "how-to-start-investing",
    title: "How to start investing",
    titleBn: "বিনিয়োগ শুরু করবেন যেভাবে",
    line: "Where to begin in the share market, step by step.",
    bn: "একদম শুরু থেকে, ধাপে ধাপে শেয়ার বাজারে যাত্রা।",
  },
  {
    slug: "open-bo-account",
    title: "Opening a BO account",
    titleBn: "বিও অ্যাকাউন্ট খোলা",
    line: "What you need before you can buy your first share.",
    bn: "প্রথম শেয়ার কেনার আগে যা দরকার।",
  },
  {
    slug: "buy-sell-shares",
    title: "How to buy and sell",
    titleBn: "শেয়ার কেনাবেচা",
    line: "Your first trade, from placing the order to settlement.",
    bn: "প্রথম লেনদেন, অর্ডার দেওয়া থেকে নিষ্পত্তি পর্যন্ত।",
  },
  {
    slug: "good-stock-key-numbers",
    title: "The numbers that matter",
    titleBn: "যে সংখ্যাগুলো জরুরি",
    line: "EPS, P/E and the other key figures, in plain words.",
    bn: "ইপিএস, পিই আর অন্য জরুরি সংখ্যা, সহজ ভাষায়।",
  },
];

const linkCls = "text-sm font-bold text-primary-ink underline-offset-4 hover:underline";

export default function StartFromZero() {
  return (
    <section aria-labelledby="learn-title">
      <SectionHead
        eyebrow={<T en="Completely new?" bn="একেবারে নতুন?" />}
        id="learn-title"
        title={<T en="You can start knowing nothing." bn="কিছু না জেনেও শুরু করতে পারেন।" />}
        sub={
          <T
            en="Short guides in plain words, with no hard terms. Start wherever you are stuck."
            bn="সহজ ভাষায় লেখা ছোট গাইড, কোনো কঠিন শব্দ নেই। যেখানে আটকে আছেন, সেখান থেকেই পড়ুন।"
          />
        }
      />

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STARTERS.map((s, i) => {
          const card = (href: string, title: string, line: string) => (
            <Link
              href={href}
              className="acc-card flex items-start gap-4 p-4 no-underline"
              style={{ "--acc": "var(--info)" } as CSSProperties}
            >
              <span className="icon-tile icon-tile-sm font-display text-sm font-extrabold tabular-nums nums" aria-hidden>
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold leading-snug text-text-main">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-text-muted">{line}</span>
              </span>
            </Link>
          );
          const learn = BLOG_TO_LEARN[s.slug];
          return (
            <li key={s.slug}>
              <T
                en={card(learn ? `/learn/${learn}` : `/blog/${s.slug}`, s.title, s.line)}
                bn={card(`/blog/${s.slug}`, s.titleBn, s.bn)}
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/blog" className={linkCls}>
          <T en="All Bengali guides →" bn="সব বাংলা গাইড →" />
        </Link>
        <Link href="/learn" className={linkCls}>
          <T en="All English guides →" bn="ইংরেজিতে গাইড →" />
        </Link>
      </div>
    </section>
  );
}
