import Link from "@/components/ui/Link";
import SectionHead from "@/components/i18n/SectionHead";
import { T } from "@/components/i18n/T";
import { BLOG_TO_LEARN } from "@/lib/i18n-pairs";

/**
 * The door for someone who has never bought a share: three lessons of the
 * Start from zero path (2026-11-25, the Learn rebuild) as three cards. Bengali
 * readers go to the Bengali lesson, English readers to its English pair
 * (`lib/i18n-pairs.ts`).
 */

const STARTERS = [
  {
    n: 1,
    slug: "open-bo-account",
    title: "How to open a BO account",
    titleBn: "বিও অ্যাকাউন্ট খুলবেন যেভাবে",
    line: "Choose a broker, keep your papers ready, open the account.",
    bn: "ব্রোকার বাছুন, কাগজ তৈরি রাখুন, অ্যাকাউন্ট খুলুন।",
  },
  {
    n: 2,
    slug: "buy-sell-shares",
    title: "How to add money and buy your first share",
    titleBn: "টাকা জমা দিয়ে প্রথম শেয়ার কিনবেন যেভাবে",
    line: "Send money safely, place your order, know what you pay.",
    bn: "নিরাপদে টাকা পাঠান, অর্ডার দিন, মোট খরচ জানুন।",
  },
  {
    n: 3,
    slug: "sell-shares-get-your-money",
    title: "How to sell shares and get your money",
    titleBn: "শেয়ার বিক্রি করে টাকা তুলবেন যেভাবে",
    line: "Sell, wait two working days, take the money out.",
    bn: "বিক্রি করুন, দুই কর্মদিবস অপেক্ষা, টাকা তুলুন।",
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
          en={<Link href="/learn#getting-started" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-ink hover:underline">All three steps →</Link>}
          bn={<Link href="/blog#getting-started" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-ink hover:underline">তিনটি ধাপই দেখুন →</Link>}
        />
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {STARTERS.map((s) => {
          const card = (href: string, title: string, line: string, step: string) => (
            <Link href={href} className="soft-card flex h-full flex-col p-5 no-underline transition-shadow hover:shadow-lift">
              <span className="text-sm font-semibold text-text-main">{step}</span>
              <span className="mt-2 block text-lg font-semibold leading-snug text-text-main">{title}</span>
              <span className="mt-1.5 block text-base leading-relaxed text-text-main">{line}</span>
            </Link>
          );
          const learn = BLOG_TO_LEARN[s.slug];
          return (
            <li key={s.slug}>
              <T
                en={card(learn ? `/learn/${learn}` : `/blog/${s.slug}`, s.title, s.line, `Step ${s.n}`)}
                bn={card(`/blog/${s.slug}`, s.titleBn, s.bn, `ধাপ ${s.n}`)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
