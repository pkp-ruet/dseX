import Link from "next/link";
import type { CSSProperties } from "react";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";
import { getTier, TIER_VAR, TIER_GRADES, TIER_LABELS } from "@/lib/constants";
import type { LandingStock } from "@/lib/landing";

/**
 * Block 6 — what is actually inside one company's page.
 *
 * This is the "look how deep this goes" block, and it earns that by listing only
 * sections that really render on /stock/[code] — score + health checks, price
 * chart, valuation, five-year financials, dividends, ownership, peers, news and
 * the Bengali summary. No mocked screenshot: the example panel is built from the
 * same live payload as the hero, so it can't drift out of date or overstate.
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
  const tier = stock ? getTier(stock.score) : null;

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

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_minmax(0,20rem)] md:gap-10">
        {/* The contents, numbered */}
        <ol className="flex flex-col divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {CONTENTS.map((c, i) => (
            <li key={c.title} className="flex items-start gap-3.5 py-3.5">
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

        {/* A real example, not a mockup */}
        {stock && tier && (
          <aside
            className="acc-panel acc-top h-fit p-5 md:sticky md:top-24"
            style={{ "--acc": TIER_VAR[tier] } as CSSProperties}
          >
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              For example
            </span>
            <div className="mt-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[0.95rem] font-extrabold text-[var(--text)]">{stock.code}</p>
                <p className="mt-0.5 line-clamp-2 text-[0.78rem] font-semibold leading-snug text-[var(--text-muted)]">
                  {stock.name ?? stock.code}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="font-display text-[1.9rem] font-extrabold leading-none tabular-nums nums"
                  style={{ color: TIER_VAR[tier] }}
                >
                  {stock.score == null ? "—" : Math.round(stock.score)}
                </div>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded text-[0.6rem] font-extrabold text-white"
                    style={{ background: TIER_VAR[tier] }}
                  >
                    {TIER_GRADES[tier]}
                  </span>
                  <span className="text-[0.7rem] font-extrabold" style={{ color: TIER_VAR[tier] }}>
                    {TIER_LABELS[tier]}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                All eight sections above are on {stock.code}&apos;s page. Go and check.
              </p>
              <Bn className="mt-1 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                উপরের 8টা অংশই {stock.code}-এর পাতায় আছে। নিজেই দেখে নিন।
              </Bn>
            </div>

            <Link
              href={`/stock/${stock.code}`}
              prefetch={false}
              className="ui-btn ui-btn-md ui-btn-primary mt-4 w-full justify-center"
            >
              Open {stock.code}&apos;s report
            </Link>
          </aside>
        )}
      </div>
    </section>
  );
}
