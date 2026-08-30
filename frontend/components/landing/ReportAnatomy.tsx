import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";
import type { LandingStock } from "@/lib/landing";

/**
 * Block 6 — what is actually inside one company's page.
 *
 * This is the "look how deep this goes" block, and it earns that by listing only
 * sections that really render on /stock/[code] — score + health checks, price
 * chart, valuation, five-year financials, dividends, ownership, peers, news and
 * the Bengali summary. Compact by design: the list + one link out to a real
 * page. The live example panel that used to sit beside the list was cut
 * 2026-08-30 — the hero's MiniReport already shows a real report, and one proof
 * per page is enough.
 */

const CONTENTS = [
  {
    title: "The score, the grade, and why",
    bn: "5টা দিকের প্রতিটিতে কোম্পানি কেমন করল, সহজ বাংলায় লেখা।",
  },
  {
    title: "Price chart",
    bn: "1 মাস থেকে 5 বছর — দাম আর কতটা লেনদেন হয়েছে।",
  },
  {
    title: "Whether the price is high or low",
    bn: "একই খাতের অন্য কোম্পানির তুলনায় এই দামটা কোথায় দাঁড়ায়।",
  },
  {
    title: "Five years of profit, sales and cash",
    bn: "প্রতি বছরের আয়, খরচ, লাভ আর হাতে আসা নগদ টাকা।",
  },
  {
    title: "Dividend history",
    bn: "কোন বছর কত নগদ বা বোনাস দিয়েছে, আর এখন কত ঘোষণা হয়েছে।",
  },
  {
    title: "Who owns the shares",
    bn: "উদ্যোক্তা, প্রতিষ্ঠান, বিদেশি আর সাধারণ বিনিয়োগকারীর ভাগ — আগের বারের সাথে তুলনাসহ।",
  },
  {
    title: "The rest of the sector",
    bn: "পাশাপাশি রেখে দেখুন কে এগিয়ে, কে পিছিয়ে।",
  },
  {
    title: "Every company announcement",
    bn: "সব খবর এক জায়গায় সাজানো — খুঁজতে হবে না।",
  },
];

export default function ReportAnatomy({
  stock,
  totalCount,
}: {
  stock: LandingStock | null;
  totalCount: number;
}) {
  return (
    <section aria-labelledby="anatomy-title">
      <SectionHead
        eyebrow="Inside one report"
        id="anatomy-title"
        title="Open one company and this is"
        highlight="what you get."
        accent="var(--navy)"
        icon={<><path d="M4 4h11l5 5v11H4z" /><path d="M15 4v5h5" /></>}
        bn={`${totalCount}টি কোম্পানির প্রত্যেকটার জন্য একই — কোনোটার পাতা ছোট নয়।`}
      />

      {/* The contents, numbered — two columns on wider screens so the block
          stays short; each item keeps its one-line Bengali explanation. */}
      <ol className="mt-8 border-t border-[var(--border)] sm:columns-2 sm:gap-10">
        {CONTENTS.map((c, i) => (
          <li key={c.title} className="flex items-start gap-3.5 break-inside-avoid border-b border-[var(--border)] py-3">
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-display text-[0.72rem] font-extrabold tabular-nums nums"
              style={{
                color: "var(--info-ink)",
                background: "color-mix(in srgb, var(--info) 13%, transparent)",
              }}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-[0.9rem] font-bold text-[var(--text)]">{c.title}</h3>
              <Bn className="mt-0.5 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
                {c.bn}
              </Bn>
            </div>
          </li>
        ))}
      </ol>

      {/* One proof link instead of a second report panel — the hero already
          shows a real report. */}
      <Link
        href={stock ? `/stock/${stock.code}` : "/stocks"}
        prefetch={false}
        className="mt-6 inline-block text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
      >
        {stock ? `See all 8 sections on ${stock.code}'s page →` : "Open any company and see →"}
      </Link>
    </section>
  );
}
