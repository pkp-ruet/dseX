import Link from "next/link";
import type { CSSProperties } from "react";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";

/**
 * Block 8a — the entry point for someone who has never bought a share.
 *
 * Sits near the bottom on purpose: by here the page has shown the product, the
 * data and the method, and the reader who is still unsure whether any of this is
 * for them needs a door that starts at zero. Every link goes to a real page in
 * the Bengali blog, so these are guides, not a promise.
 */

const STARTERS = [
  {
    slug: "how-to-start-investing",
    title: "How to start investing",
    bn: "একদম গোড়া থেকে — শেয়ার বাজারে শুরু করবেন যেভাবে।",
  },
  {
    slug: "open-bo-account",
    title: "Opening a BO account",
    bn: "শেয়ার কেনার আগে যেটা লাগে — বিও অ্যাকাউন্ট খোলার নিয়ম।",
  },
  {
    slug: "buy-sell-shares",
    title: "How to buy and sell",
    bn: "প্রথম কেনাকাটা — শেয়ার কেনাবেচা করবেন যেভাবে।",
  },
  {
    slug: "good-stock-key-numbers",
    title: "The numbers that matter",
    bn: "EPS, P/E আর বাকি সংখ্যাগুলো সহজ ভাষায়।",
  },
];

export default function StartFromZero() {
  return (
    <section aria-labelledby="learn-title">
      <SectionHead
        eyebrow="Completely new?"
        id="learn-title"
        title="You can start"
        highlight="knowing nothing."
        accent="var(--info)"
        icon={<><path d="M12 4 3 8l9 4 9-4z" /><path d="M3 8v5c0 2.5 4 4.5 9 4.5s9-2 9-4.5V8" /></>}
        bn="সহজ বাংলায় লেখা গাইড — কোনো কঠিন শব্দ নেই, ইংরেজি জানার দরকার নেই। যেখানে আটকে আছেন, সেখান থেকেই পড়ুন।"
      />

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STARTERS.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/blog/${s.slug}`}
              className="acc-card flex items-start gap-4 p-4 no-underline"
              style={{ "--acc": "var(--info)" } as CSSProperties}
            >
              <span className="icon-tile icon-tile-sm font-display text-[0.85rem] font-extrabold tabular-nums nums" aria-hidden>
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.92rem] font-bold leading-snug text-[var(--text)]">
                  {s.title}
                </span>
                <Bn as="span" className="mt-1 block text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                  {s.bn}
                </Bn>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          href="/blog"
          className="text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
        >
          All Bengali guides →
        </Link>
        <Link
          href="/learn"
          className="text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
        >
          Guides in English →
        </Link>
      </div>
    </section>
  );
}
