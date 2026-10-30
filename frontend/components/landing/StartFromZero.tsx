import Link from "next/link";
import SectionHead from "@/components/i18n/SectionHead";
import { T } from "@/components/i18n/T";
import { BLOG_TO_LEARN } from "@/lib/i18n-pairs";

/**
 * Block 6 — the door for someone who has never bought a share: three short
 * guides as three cards. Bengali readers go to the Bengali blog post, English
 * readers to its paired English guide (`lib/i18n-pairs.ts`).
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
    slug: "good-stock-key-numbers",
    title: "How to tell a good company",
    titleBn: "ভালো কোম্পানি চেনার উপায়",
    line: "The few numbers that matter, in plain words.",
    bn: "যে কয়েকটি সংখ্যা জরুরি, সহজ ভাষায়।",
  },
];

export default function StartFromZero() {
  return (
    <section aria-labelledby="learn-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead
          eyebrow={<T en="New to shares?" bn="শেয়ার বাজারে নতুন?" />}
          id="learn-title"
          title={<T en="Start here, from zero." bn="শূন্য থেকে শুরু করুন।" />}
        />
        <T
          en={<Link href="/learn" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-ink hover:underline">All guides →</Link>}
          bn={<Link href="/blog" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-ink hover:underline">সব গাইড →</Link>}
        />
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {STARTERS.map((s, i) => {
          const card = (href: string, title: string, line: string, step: string) => (
            <Link href={href} className="soft-card flex h-full flex-col p-5 no-underline transition-shadow hover:shadow-lift">
              <span className="text-sm font-semibold text-text-main">{step}</span>
              <span className="mt-2 block text-lg font-bold leading-snug text-text-main">{title}</span>
              <span className="mt-1.5 block text-base leading-relaxed text-text-main">{line}</span>
            </Link>
          );
          const learn = BLOG_TO_LEARN[s.slug];
          return (
            <li key={s.slug}>
              <T
                en={card(learn ? `/learn/${learn}` : `/blog/${s.slug}`, s.title, s.line, `Guide ${i + 1}`)}
                bn={card(`/blog/${s.slug}`, s.titleBn, s.bn, `গাইড ${i + 1}`)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
