"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePremiumOpen } from "@/components/premium/PremiumMask";
import { IconCrown, IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { SectionBase } from "@/lib/stock-report";
import { ToneChip, tx } from "@/components/stock/report/fmt";
import { MaskedSentence, PartTag, PartsProvider, numberLines, type NumberedLine } from "@/components/stock/report/preview";
import { freeReportCode } from "@/lib/free-report";

/**
 * Screen-only lock for an inline part (a scorecard number, a summary line):
 * the text stays in the HTML under `.premium-locked` (the paywall JSON-LD
 * selector) and is hidden until the reader may see it.
 */
export function Locked({ children, as = "div", className = "" }: { children: ReactNode; as?: "div" | "span"; className?: string }) {
  const open = usePremiumOpen();
  const Tag = as;
  return (
    <Tag className={`premium-locked ${className}`.trim()} data-locked={open ? "false" : "true"} data-preview="mask">
      <Tag className="premium-locked-body" aria-hidden={open ? undefined : true} {...(open ? {} : { inert: true })}>
        {children}
      </Tag>
    </Tag>
  );
}

/** "Premium shows you" — the section's own lines, built from counts, each
 *  numbered to match a part of the masked preview above it. Then the way to
 *  see one filled in: the same section on today's free report, open to
 *  everyone. Fires the lock analytics once when it scrolls into view and
 *  stores the reason for /premium when tapped. */
export function Inside({ lines, code, lock, anchor }: {
  lines: NumberedLine[];
  code: string;
  lock: string;
  /** The section's id on another stock's page (`rp-price`), for the example link. */
  anchor?: string;
}) {
  const { bn } = useLang();
  const { state } = usePremium();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const [sample, setSample] = useState<string | null>(null);
  useEffect(() => setSample(freeReportCode()), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "stock", lock: `report-${lock}`, state });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lock, state]);

  if (!lines.length) return null;
  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: `report-${lock}`, state });
    savePremiumContext({
      from: "stock",
      label: bn ? `${code}-এর পূর্ণ রিপোর্ট` : `The full report on ${code}`,
      stakes: lines.slice(0, 3).map((l) => (bn ? l.bn || l.en : l.en)),
    });
  };

  return (
    <div ref={ref} className="rp-inside">
      <p className="flex items-center gap-1.5 text-sm font-bold text-gold-ink">
        <IconCrown size={14} />
        <T en="Premium shows you" bn="প্রিমিয়ামে দেখবেন" />
      </p>
      <ul>
        {lines.map((l) => (
          <li key={l.n} className="text-sm leading-snug text-text-main">
            <span className="rp-tag" aria-hidden="true">{l.n}</span>
            <span>{tx(l)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex flex-wrap items-center gap-x-4">
        <a
          href="#ch-premium"
          onClick={onTap}
          className="inline-flex min-h-10 items-center text-sm font-bold text-primary-ink hover:underline active:opacity-70"
        >
          <T en="See what Premium includes" bn="প্রিমিয়ামে কী আছে দেখুন" /> <span aria-hidden="true">&nbsp;→</span>
        </a>
        {sample && sample !== code && (
          <Link
            href={`/stock/${encodeURIComponent(sample)}${anchor ? `#${anchor}` : "#ch-report"}`}
            onClick={() => trackEvent("premium_sample_tap", { area: "stock", lock: `report-${lock}`, sample })}
            className="inline-flex min-h-10 items-center text-sm font-semibold text-text-muted hover:underline active:opacity-70"
          >
            <T en={`See one filled in: ${sample}, free today`} bn={`পূর্ণ উদাহরণ দেখুন: ${sample}, আজ ফ্রি`} />
          </Link>
        )}
      </div>
    </div>
  );
}

/** What a free reader sees where the answer goes: the headline with its
 *  figures hidden, the section's own free sample with every other figure a
 *  gold pill (`preview`), each part numbered, then the "Premium shows you"
 *  lines with the same numbers. */
export function LockedPreview({
  lines, preview, hasWatch, code, lock, anchor, bare = false, meaning = [], headline,
}: {
  lines: NumberedLine[];
  preview?: ReactNode;
  hasWatch: boolean;
  /** The section's "what it means" paragraphs: with two or more, the first
   *  is the free sample; the rest are counted, not shown. */
  meaning?: SectionBase["meaning"];
  /** The answer sentence: shown with every figure hidden in a pill. */
  headline?: SectionBase["headline"];
  /** No headline and no "What it means" line (a section without them). */
  bare?: boolean;
  code: string;
  lock: string;
  anchor?: string;
}) {
  const shown = meaning.length >= 2 ? 1 : 0;
  const more = meaning.length - shown;
  return (
    <>
      <PartsProvider lines={lines}>
        <div className="rp-preview" aria-hidden="true">
          <p className="rp-preview-label">
            <IconCrown size={12} />
            <T en="Free sample · the rest is in Premium" bn="ফ্রি নমুনা · বাকিটা প্রিমিয়ামে" />
          </p>
          {!bare && headline && (
            <p className="text-base font-bold leading-relaxed text-text-main sm:text-lg">
              <MaskedSentence b={headline} />
            </p>
          )}
          {preview}
          {!bare && meaning.length > 0 && (
            <>
              {shown > 0 && (
                <p className="mt-4 text-sm leading-relaxed text-text-main">{tx(meaning[0])}</p>
              )}
              <p className="rp-more">
                <IconLock size={14} />
                <T
                  en={shown ? `${more} more ${more === 1 ? "paragraph" : "paragraphs"} on what this means for you, in Premium`
                    : "What this means for you, in Premium"}
                  bn={shown ? `আপনার জন্য এর অর্থ নিয়ে আরও ${more}টি অনুচ্ছেদ, প্রিমিয়ামে` : "আপনার জন্য এর অর্থ, প্রিমিয়ামে"}
                />
                <PartTag part="meaning" />
              </p>
            </>
          )}
          {hasWatch && (
            <p className="rp-more">
              <IconLock size={14} />
              <T en="What to watch next, in Premium" bn="এরপর যা খেয়াল রাখবেন, প্রিমিয়ামে" />
              <PartTag part="watch" />
            </p>
          )}
        </div>
      </PartsProvider>
      <Inside lines={lines} code={code} lock={lock} anchor={anchor} />
    </>
  );
}

/**
 * THE section anatomy of the stock report: the question, the verdict chip,
 * the free facts (`free`), then the answer (`headline` + `children` + what it
 * means + what to watch) behind a screen-only lock. A free reader sees the
 * masked preview (`preview`) and the numbered "Premium shows you" lines
 * instead, then the source line.
 */
export default function ReportSection({
  s,
  code,
  n,
  free,
  children,
  action,
  preview,
}: {
  s: SectionBase;
  code: string;
  /** Position in the report (the report is an ordered read). */
  n: number;
  /** Free facts under the title (public numbers, dates, red flags). */
  free?: ReactNode;
  /** The Premium body (charts, lists) — shown under the headline. */
  children?: ReactNode;
  /** A control on the title row (e.g. share). */
  action?: ReactNode;
  /** The masked preview of the Premium body (previews.tsx) for a free reader. */
  preview?: ReactNode;
}) {
  const open = usePremiumOpen();
  return (
    <section id={`rp-${s.key}`} className="soft-card rp-sec stock-anchor" aria-labelledby={`rp-${s.key}-t`}>
      <div className="rp-head">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rp-n" aria-hidden="true">{n}</span>
          <h3 id={`rp-${s.key}-t`} className="min-w-0 pt-0.5 text-lg font-bold leading-snug text-text-main sm:text-xl">
            {tx(s.title)}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <ToneChip word={s.word} tone={s.tone} />
        </div>
      </div>

      {!open && s.free_line && (
        <p className="mt-3 text-base font-semibold leading-snug text-text-main">{tx(s.free_line)}</p>
      )}

      {free && <div className="mt-1">{free}</div>}

      <Locked>
        <p className="mt-4 text-base font-bold leading-snug text-text-main sm:text-lg">{tx(s.headline)}</p>
        {children}
        {s.meaning.map((m, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-text-main sm:text-base">{tx(m)}</p>
        ))}
        {s.watch && (
          <div className="rp-note text-sm leading-snug text-text-main">
            <p className="text-xs font-bold text-text-muted">
              <T en="What to watch" bn="যা খেয়াল রাখবেন" />
            </p>
            <p className="mt-0.5">{tx(s.watch)}</p>
          </div>
        )}
      </Locked>

      {!open && s.inside.length > 0 && (
        <LockedPreview
          lines={numberLines(s.key, s.inside, !!s.watch)}
          preview={preview}
          hasWatch={!!s.watch}
          meaning={s.meaning}
          headline={s.headline}
          code={code}
          lock={s.key}
          anchor={`rp-${s.key}`}
        />
      )}

      <p className="rp-source text-xs text-text-muted">{tx(s.source)}</p>
    </section>
  );
}
