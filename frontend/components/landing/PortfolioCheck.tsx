"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import SectionHead from "@/components/i18n/SectionHead";
import Button from "@/components/ui/Button";
import type { Grade } from "@/lib/portfolio-analysis";
import type { Line, SampleView } from "@/lib/landing-portfolio";

/**
 * Block 5b — the portfolio check, explained properly.
 *
 * Left: what the feature does, as four plain steps (add → grade → good / watch
 * → what to do next). Right: the real thing — `analyzePortfolio` run on the two
 * curated sample portfolios against today's scores (built server-side in
 * `lib/landing-portfolio.ts`), with a tab to compare a well-spread portfolio
 * with one that is all in a single stock. The contrast is the explanation.
 *
 * No profit/loss anywhere: the sample buy prices are illustrative, and the
 * landing page makes no performance claim of any kind.
 */

const GRADE_ACCENT: Record<Grade, string> = {
  A: "var(--positive)",
  B: "var(--positive)",
  C: "var(--watch)",
  D: "color-mix(in srgb, var(--watch) 55%, var(--negative))",
  F: "var(--negative)",
};

/** Sector colours for the spread bar — decorative tokens only, never the
 *  market up/down pair. */
const SECTOR_TONES = ["var(--info)", "var(--primary)", "var(--gold)", "var(--warm)", "var(--navy)", "var(--text-muted)"];

function scoreTone(v: number): string {
  if (v >= 7) return "var(--positive)";
  if (v >= 5) return "var(--watch)";
  return "var(--negative)";
}

interface Step {
  title: string;
  titleBn: string;
  line: string;
  bn: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Add what you own",
    titleBn: "আপনার শেয়ার যোগ করুন",
    line: "The company, how many shares and the price you paid. That is all.",
    bn: "কোম্পানি, কতগুলো শেয়ার আর কত দামে কিনেছেন। শুধু এটুকুই।",
    icon: <><path d="M12 5v14M5 12h14" /></>,
  },
  {
    title: "Get one grade, from A to F",
    titleBn: "A থেকে F একটি গ্রেড পান",
    line: "Three checks: is your money spread out, are the companies strong, and did you pay a fair price?",
    bn: "তিনটি যাচাই: টাকা কয়েক জায়গায় ছড়ানো কি না, কোম্পানিগুলো শক্ত কি না, আর দাম ন্যায্য দিয়েছেন কি না।",
    icon: <><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></>,
  },
  {
    title: "See what is going well and what to watch",
    titleBn: "কোনটি ভালো আর কোনটিতে নজর দরকার, দেখুন",
    line: "In plain sentences, not charts. A weak company, or too much money in one sector, is named.",
    bn: "চার্ট নয়, সহজ বাক্যে। কোন কোম্পানি দুর্বল বা কোন সেক্টরে বেশি টাকা আছে, তা সরাসরি বলা হয়।",
    icon: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  },
  {
    title: "Know what to do next",
    titleBn: "এরপর কী করবেন, জানুন",
    line: "For each share, whether to buy more or sell, with the reason, and which sectors you are missing.",
    bn: "প্রতিটি শেয়ারে আরও কিনবেন না বিক্রি করবেন, কারণসহ, আর কোন সেক্টর আপনার নেই।",
    icon: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  },
];

function SubBar({ label, value }: { label: ReactNode; value: number }) {
  const tone = scoreTone(value);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-xs font-semibold text-text-muted">{label}</span>
        <span className="text-sm font-extrabold tabular-nums nums" style={{ color: tone }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value * 10))}%`, background: tone }} />
      </div>
    </div>
  );
}

function Bullet({ kind, text }: { kind: "good" | "watch" | "next"; text: Line }) {
  const tone = kind === "good" ? "var(--positive)" : kind === "watch" ? "var(--watch)" : "var(--info)";
  const label =
    kind === "good"
      ? { en: "Going well", bn: "ভালো দিক" }
      : kind === "watch"
        ? { en: "Needs attention", bn: "মনোযোগ দরকার" }
        : { en: "Worth considering", bn: "ভেবে দেখার মতো" };
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
        style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
        aria-hidden
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {kind === "good" ? <path d="M5 12l5 5L20 7" /> : kind === "watch" ? <path d="M12 6v7M12 18h.01" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-text-main">
          <span className="font-bold" style={{ color: tone }}>
            <T en={`${label.en}: `} bn={`${label.bn}: `} />
          </span>
          <T en={text.en} bn={text.bn} />
        </p>
      </div>
    </li>
  );
}

function SampleCard({ view }: { view: SampleView }) {
  const acc = GRADE_ACCENT[view.grade];
  return (
    <article className="soft-card relative overflow-hidden">

      {/* Grade + the one-line verdict */}
      <div
        className="flex items-start gap-3.5 p-4 sm:p-5"
      >
        <div
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-2"
          style={{ color: acc, borderColor: `color-mix(in srgb, ${acc} 45%, transparent)`, background: `color-mix(in srgb, ${acc} 10%, transparent)` }}
        >
          <span className="font-display text-3xl font-extrabold leading-none">{view.grade}</span>
          <span className="mt-0.5 text-xs font-bold">
            <T en={view.gradeLabel} bn={view.gradeLabelBn} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-muted">
            <T
              en={`Portfolio grade · ${view.companies} ${view.companies === 1 ? "company" : "companies"}`}
              bn={`পোর্টফোলিওর গ্রেড · ${view.companies}টি কোম্পানি`}
            />
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-text-main">
            <T en={view.headline.en} bn={view.headline.bn} />
          </p>
        </div>
      </div>

      {/* The three checks */}
      <div className="grid grid-cols-3 gap-3 border-y border-border px-4 py-3.5 sm:px-5">
        <SubBar label={<T en="Spread" bn="ছড়ানো" />} value={view.sub.spread} />
        <SubBar label={<T en="Quality" bn="মান" />} value={view.sub.quality} />
        <SubBar label={<T en="Price paid" bn="কেনার দাম" />} value={view.sub.entry} />
      </div>

      {/* Where the money sits */}
      {view.sectors.length > 0 && (
        <div className="px-4 py-3.5 sm:px-5">
          <p className="text-xs font-semibold text-text-muted">
            <T en="Where the money sits" bn="টাকা কোথায় আছে" />
          </p>
          <div className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-full">
            {view.sectors.map((s, i) => (
              <span
                key={s.name}
                title={`${s.name} ${s.weightPct.toFixed(0)}%`}
                style={{ width: `${s.weightPct}%`, background: SECTOR_TONES[Math.min(i, SECTOR_TONES.length - 1)] }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {view.sectors.slice(0, 4).map((s, i) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SECTOR_TONES[Math.min(i, SECTOR_TONES.length - 1)] }} aria-hidden />
                <T en={s.name} bn={sectorBn(s.name)} /> {s.weightPct.toFixed(0)}%
              </span>
            ))}
            {view.sectors.length > 4 && (
              <span className="text-xs font-semibold text-text-muted">
                <T en={`+${view.sectors.length - 4} more`} bn={`আরও ${view.sectors.length - 4}টি`} />
              </span>
            )}
          </div>
        </div>
      )}

      {/* What the check says, in sentences */}
      {(view.good || view.watch || view.next) && (
        <ul className="flex flex-col gap-3 border-t border-border px-4 py-3.5 sm:px-5">
          {view.good && <Bullet kind="good" text={view.good} />}
          {view.watch && <Bullet kind="watch" text={view.watch} />}
          {!view.watch && view.next && <Bullet kind="next" text={view.next} />}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-2.5 sm:px-5">
        <span className="text-xs font-semibold text-text-muted">
          <T en="Sample portfolio · today's scores" bn="নমুনা পোর্টফোলিও · আজকের স্কোর" />
        </span>
        <Link href={`/sample-portfolio/${view.slug}`} prefetch={false} className="shrink-0 text-xs font-bold text-primary-ink hover:underline">
          <T en="Full check →" bn="পূর্ণ যাচাই →" />
        </Link>
      </div>
    </article>
  );
}

export default function PortfolioCheck({ samples }: { samples: SampleView[] }) {
  const [slug, setSlug] = useState(samples[0]?.slug);
  const view = samples.find((s) => s.slug === slug) ?? samples[0];

  return (
    <section aria-labelledby="portfolio-check-title">
      <SectionHead
        eyebrow={<T en="Portfolio check" bn="পোর্টফোলিও যাচাই" />}
        id="portfolio-check-title"
        title={
          <T
            en="Already own shares? We check all of them at once."
            bn="শেয়ার কিনেছেন? সবগুলো একসঙ্গে যাচাই করে দেখাই।"
          />
        }
        sub={
          <T
            en="Add the shares you bought and see, on one page, how sound your portfolio is, where the risks are and what to do next."
            bn="কেনা শেয়ারগুলো যোগ করুন। পুরো পোর্টফোলিও কতটা ভালো, কোথায় ঝুঁকি আর এরপর কী করবেন, এক পেজেই দেখবেন।"
          />
        }
      />

      <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_minmax(0,27rem)] md:gap-10">
        {/* What it does */}
        <div>
          <ol className="flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="acc-card flex items-start gap-3.5 p-4"
                style={{ "--acc": "var(--positive)" } as CSSProperties}
              >
                <span className="icon-tile icon-tile-sm" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-snug text-text-main">
                    <span className="mr-1.5 tabular-nums nums text-text-muted">{i + 1}.</span>
                    <T en={s.title} bn={s.titleBn} />
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">
                    <T en={s.line} bn={s.bn} />
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button href="/portfolio" variant="primary">
              <T en="Check my portfolio" bn="আমার পোর্টফোলিও যাচাই করুন" />
            </Button>
            {view && (
              <Link
                href={`/sample-portfolio/${view.slug}`}
                className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
              >
                <T en="See a full sample check →" bn="একটি পূর্ণ নমুনা যাচাই দেখুন →" />
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs font-semibold text-text-muted">
            <T
              en="It is free, and your shares stay private. Only you can see them."
              bn="এটি ফ্রি, আর আপনার শেয়ারের তথ্য গোপন থাকে। শুধু আপনিই দেখতে পাবেন।"
            />
          </p>
        </div>

        {/* The real check, on two sample portfolios */}
        {view && (
          <div className="flex flex-col gap-3">
            {samples.length > 1 && (
              <div role="tablist" aria-label="Sample portfolios" className="flex flex-wrap gap-2">
                {samples.map((s) => (
                  <Button
                    key={s.slug}
                    variant="tab"
                    size="md"
                    active={s.slug === view.slug}
                    onClick={() => setSlug(s.slug)}
                    role="tab"
                    aria-selected={s.slug === view.slug}
                  >
                    <T en={s.tab.en} bn={s.tab.bn} />
                  </Button>
                ))}
              </div>
            )}
            <SampleCard view={view} />
          </div>
        )}
      </div>
    </section>
  );
}
