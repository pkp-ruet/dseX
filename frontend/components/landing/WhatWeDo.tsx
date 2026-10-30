import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import SectionHead from "@/components/i18n/SectionHead";
import { getTier, TIER_LABELS, TIER_LABELS_BN } from "@/lib/constants";
import { plainQuestions, shortName, type LandingStock } from "@/lib/landing";
import type { SampleView } from "@/lib/landing-portfolio";
import ScoreBadge from "@/components/ui/ScoreBadge";
import SignalChip from "@/components/ui/SignalChip";

/**
 * Block 3 — what the site does, as three jobs (2026-10-31). Each card opens on
 * a small piece of the real product, worked out from today's data — a
 * company's plain questions, today's top Buy signals, the portfolio check run
 * on a sample portfolio — then one title, one line and one link. This is
 * where a first-time visitor learns what TopStockBD is for.
 */

const GRADE_TONE: Record<string, string> = {
  A: "var(--positive)",
  B: "var(--positive)",
  C: "var(--watch)",
  D: "var(--negative)",
  F: "var(--negative)",
};

function Job({
  shot,
  title,
  line,
  href,
  link,
}: {
  shot: ReactNode;
  title: ReactNode;
  line: ReactNode;
  href: string;
  link: ReactNode;
}) {
  return (
    <article className="soft-card flex flex-col p-3">
      <div className="lp-shot">{shot}</div>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-1 pt-5">
        <h3 className="text-xl font-bold text-text-main">{title}</h3>
        <p className="text-base leading-relaxed text-text-main">{line}</p>
        <Link href={href} className="mt-auto inline-flex min-h-10 items-center pt-2 text-sm font-semibold text-primary-ink hover:underline">
          {link}
        </Link>
      </div>
    </article>
  );
}

export default function WhatWeDo({
  questionStock,
  buys,
  sample,
}: {
  /** A familiar company whose plain answers fill the first card. */
  questionStock: LandingStock | null;
  /** Today's top Buy signals, best grade first. */
  buys: LandingStock[];
  /** The portfolio check on the well-spread sample portfolio. */
  sample: SampleView | null;
}) {
  const questions = questionStock ? plainQuestions(questionStock) : [];

  return (
    <section aria-labelledby="what-title">
      <SectionHead
        id="what-title"
        eyebrow={<T en="What TopStockBD does" bn="TopStockBD কী করে" />}
        title={<T en="Three things every investor needs, in one place." bn="বিনিয়োগকারীর দরকারি তিনটি কাজ, এক জায়গায়।" />}
        sub={
          <T
            en="Understand a share, find the next one, and keep an eye on what you own."
            bn="একটি শেয়ার বুঝুন, পরেরটি খুঁজুন, আর নিজের শেয়ারে নজর রাখুন।"
          />
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Job
          shot={
            questionStock && questions.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-text-main">
                  {shortName(questionStock)} · <T en="in plain questions" bn="সহজ প্রশ্নে" />
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {questions.map((q) => (
                    <li key={q.q.en} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1 text-sm font-semibold text-text-main">
                        <T en={q.q.en} bn={q.q.bn} />
                      </span>
                      <span className="lp-word" data-tone={q.a.tone}>
                        <T en={q.a.en} bn={q.a.bn} />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null
          }
          title={<T en="Understand any share" bn="যেকোনো শেয়ার বুঝুন" />}
          line={
            <T
              en="Every company answers the same plain questions, from its own accounts. No jargon, just what it means for you."
              bn="প্রতিটি কোম্পানি একই সহজ প্রশ্নের উত্তর দেয়, তার নিজের হিসাব থেকে। কঠিন শব্দ নয়, আপনার জন্য কী মানে, শুধু সেটুকু।"
            />
          }
          href={questionStock ? `/stock/${questionStock.code}` : "/stocks"}
          link={<T en="See a full report →" bn="একটি পূর্ণ রিপোর্ট দেখুন →" />}
        />

        <Job
          shot={
            buys.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-text-main">
                  <T en="Today’s Buy signals" bn="আজকের কেনার সংকেত" />
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {buys.map((s) => {
                    const tier = getTier(s.score);
                    return (
                      <li key={s.code} className="flex items-center gap-3 py-2.5">
                        <ScoreBadge score={s.score} tier={tier} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-text-main">{shortName(s)}</span>
                          <span className="block text-xs text-text-main">
                            {s.code} · <T en={TIER_LABELS[tier]} bn={TIER_LABELS_BN[tier]} />
                          </span>
                        </span>
                        <SignalChip signal="buy" strength={s.strong ? "strong" : null} size="sm" />
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null
          }
          title={<T en="Find shares worth a look" bn="দেখার মতো শেয়ার খুঁজুন" />}
          line={
            <T
              en="Daily Buy signals, every company ranked, and a screener that asks six simple questions instead of formulas."
              bn="প্রতিদিনের কেনার সংকেত, সব কোম্পানির র‍্যাঙ্কিং, আর সূত্রের বদলে ছয়টি সহজ প্রশ্নের স্ক্রিনার।"
            />
          }
          href="/buy-sell-signals"
          link={<T en="See today’s signals →" bn="আজকের সংকেত দেখুন →" />}
        />

        <Job
          shot={
            sample ? (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 bg-surface text-lg font-bold text-text-main"
                    style={{ borderColor: GRADE_TONE[sample.grade] ?? "var(--tier-average)" }}
                    aria-hidden
                  >
                    {sample.grade}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-main">
                      <T en={`A sample portfolio · ${sample.companies} shares`} bn={`একটি নমুনা পোর্টফোলিও · ${sample.companies}টি শেয়ার`} />
                    </p>
                    <p className="text-base font-bold text-text-main">
                      <T en={`Grade ${sample.grade} · ${sample.gradeLabel}`} bn={`গ্রেড ${sample.grade} · ${sample.gradeLabelBn}`} />
                    </p>
                  </div>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {sample.good && (
                    <li className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main">
                      <span className="lp-dot mt-1.5" data-tone="good" aria-hidden />
                      <T en={sample.good.en} bn={sample.good.bn} />
                    </li>
                  )}
                  {sample.watch && (
                    <li className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main">
                      <span className="lp-dot mt-1.5" data-tone="watch" aria-hidden />
                      <T en={sample.watch.en} bn={sample.watch.bn} />
                    </li>
                  )}
                </ul>
              </>
            ) : null
          }
          title={<T en="Keep watch on your shares" bn="নিজের শেয়ারে নজর রাখুন" />}
          line={
            <T
              en="Add what you own. Get a grade from A to F, the dividends coming to you, and an alert when something changes."
              bn="শেয়ার যোগ করুন। পাবেন A থেকে F গ্রেড, আসন্ন ডিভিডেন্ড, আর কিছু বদলালে অ্যালার্ট।"
            />
          }
          href="/register"
          link={<T en="Track your shares free →" bn="ফ্রি-তে শুরু করুন →" />}
        />
      </div>
    </section>
  );
}
