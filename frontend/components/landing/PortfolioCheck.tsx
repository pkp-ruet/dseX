"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
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
  line: string;
  bn: string;
  icon: ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Add what you own",
    line: "Company, how many shares, the price you paid. That is all.",
    bn: "কোন কোম্পানির কতটা শেয়ার, কত দামে কিনেছেন — শুধু এটুকু লিখুন।",
    icon: <><path d="M12 5v14M5 12h14" /></>,
  },
  {
    title: "Get one grade, A to F",
    line: "Three checks: is it spread out, are the companies strong, did you pay a fair price.",
    bn: "তিনটা যাচাই: টাকা ছড়ানো কি না, কোম্পানিগুলো মজবুত কি না, দাম ন্যায্য দিয়েছেন কি না।",
    icon: <><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></>,
  },
  {
    title: "See what is good and what to watch",
    line: "Plain sentences, not charts — a weak company or too much in one sector is named.",
    bn: "সহজ ভাষায় লেখা — কোন কোম্পানি দুর্বল, কোথায় বেশি টাকা আটকে আছে, সরাসরি বলে দেয়।",
    icon: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  },
  {
    title: "Know what to do next",
    line: "Buy more or sell, with the reason, for each holding — and which sectors you are missing.",
    bn: "প্রতিটা শেয়ারে আরও কিনবেন না বিক্রি করবেন, কারণসহ — আর কোন খাত আপনার নেই।",
    icon: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  },
];

function SubBar({ label, value }: { label: string; value: number }) {
  const tone = scoreTone(value);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-xs font-bold uppercase tracking-wide text-text-muted">{label}</span>
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
  const label = kind === "good" ? "Good" : kind === "watch" ? "Watch out" : "Consider";
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
          <span className="font-bold" style={{ color: tone }}>{label}: </span>
          {text.en}
        </p>
        <Bn className="mt-0.5 text-sm leading-relaxed text-text-muted">{text.bn}</Bn>
      </div>
    </li>
  );
}

function SampleCard({ view }: { view: SampleView }) {
  const acc = GRADE_ACCENT[view.grade];
  return (
    <article className="soft-card relative overflow-hidden">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${acc}, transparent 88%)` }} />

      {/* Grade + the one-line verdict */}
      <div
        className="flex items-start gap-3.5 p-4 sm:p-5"
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${acc} 8%, transparent), transparent)` }}
      >
        <div
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-2"
          style={{ color: acc, borderColor: `color-mix(in srgb, ${acc} 45%, transparent)`, background: `color-mix(in srgb, ${acc} 10%, transparent)` }}
        >
          <span className="font-display text-3xl font-extrabold leading-none">{view.grade}</span>
          <span className="mt-0.5 text-xs font-bold">{view.gradeLabel}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
            Portfolio grade · {view.companies} {view.companies === 1 ? "company" : "companies"}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-text-main">{view.headline.en}</p>
          <Bn className="mt-1 text-sm leading-relaxed text-text-muted">
            {view.gradeLabelBn} — {view.headline.bn}
          </Bn>
        </div>
      </div>

      {/* The three checks */}
      <div className="grid grid-cols-3 gap-3 border-y border-border px-4 py-3.5 sm:px-5">
        <SubBar label="Spread" value={view.sub.spread} />
        <SubBar label="Quality" value={view.sub.quality} />
        <SubBar label="Price paid" value={view.sub.entry} />
      </div>

      {/* Where the money sits */}
      {view.sectors.length > 0 && (
        <div className="px-4 py-3.5 sm:px-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Where the money sits</p>
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
                {s.name} {s.weightPct.toFixed(0)}%
              </span>
            ))}
            {view.sectors.length > 4 && (
              <span className="text-xs font-semibold text-text-muted">+{view.sectors.length - 4} more</span>
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
        <span className="text-xs font-semibold text-text-muted">Sample portfolio · today&apos;s scores</span>
        <Link href={`/sample-portfolio/${view.slug}`} prefetch={false} className="shrink-0 text-xs font-bold text-primary-ink hover:underline">
          Full check →
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
        eyebrow="Portfolio check"
        id="portfolio-check-title"
        title="Already own shares? We check"
        highlight="all of them at once."
        accent="var(--positive)"
        icon={<><path d="M3 17l5-5 4 3 5-7 4 4" /><path d="M3 21h18" /></>}
        bn="যে শেয়ারগুলো কিনেছেন লিখে দিন — পুরো পোর্টফোলিও কতটা ভালো, কোথায় ঝুঁকি আর এরপর কী করবেন, এক পাতায় বলে দেব।"
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
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">{s.line}</p>
                  <Bn className="mt-1 text-sm leading-relaxed text-text-main">{s.bn}</Bn>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button href="/portfolio" variant="primary">
              Check my portfolio
            </Button>
            {view && (
              <Link
                href={`/sample-portfolio/${view.slug}`}
                className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
              >
                See a full sample check →
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs font-semibold text-text-muted">
            Free. Your holdings are private — only you can see them.
          </p>
          <Bn className="mt-0.5 text-sm text-text-muted">ফ্রি। আপনার শেয়ারের তালিকা শুধু আপনিই দেখতে পাবেন।</Bn>
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
                    {s.tab.en}
                    <Bn as="span" className="ml-1.5 text-xs font-medium">
                      {s.tab.bn}
                    </Bn>
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
