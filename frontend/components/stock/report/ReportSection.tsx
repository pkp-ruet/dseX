"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePremiumOpen } from "@/components/premium/PremiumMask";
import { IconCrown, IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Bi, SectionBase } from "@/lib/stock-report";
import { ToneChip, tx } from "@/components/stock/report/fmt";

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

/** Said when a section has no "Premium shows you" line of its own. */
const FALLBACK_LINE: Bi = {
  en: "Our reading of these figures, and what to watch next",
  bn: "এই সংখ্যাগুলোর অর্থ, আর এরপর যা খেয়াল রাখবেন",
};

/**
 * THE Premium part of a report section (2026-10-29, "whole or nothing" —
 * user: the masked previews with gold pills read as messy and hard to
 * understand). A section's Premium answer always sits in this one gold
 * panel, never mixed into its free facts, so the reader learns the pattern
 * once:
 *  - open (Premium, today's free report, or a `sample` section that is open
 *    for everyone): a gold rule, "Premium analysis", then the answer whole;
 *  - closed (everyone else): a gold-tinted box naming what it holds (the
 *    backend's `inside` lines) and one link to the page's offer. The answer
 *    stays in the HTML under `.premium-locked`, hidden — no grey bars, no
 *    pills, no figures half shown.
 */
export function PremiumPanel({
  lines,
  code,
  lock,
  sample = false,
  children,
}: {
  /** What the panel holds, said without the answer (closed state). */
  lines: Bi[];
  code: string;
  /** Analytics label: `report-<lock>`. */
  lock: string;
  /** Open for everyone: one of the report's free sample sections. */
  sample?: boolean;
  children: ReactNode;
}) {
  const premiumOpen = usePremiumOpen();
  const { isPremium, state } = usePremium();
  const { bn } = useLang();
  const open = sample || premiumOpen;
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (open || !el || typeof IntersectionObserver === "undefined") return;
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
  }, [open, lock, state]);

  if (open) {
    // A free reader is told why this one is open: a sample, or today's free report.
    const tag = isPremium ? null : sample ? (
      <T en="Free sample" bn="ফ্রি নমুনা" />
    ) : (
      <T en="Free today" bn="আজ ফ্রি" />
    );
    return (
      <div className="rp-pp" data-open="true">
        <p className="rp-pp-label">
          <IconCrown size={14} />
          <T en="Premium analysis" bn="প্রিমিয়াম বিশ্লেষণ" />
          {tag && <span className="rp-pp-tag">{tag}</span>}
        </p>
        {children}
      </div>
    );
  }

  const shown = lines.length ? lines : [FALLBACK_LINE];
  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: `report-${lock}`, state });
    savePremiumContext({
      from: "stock",
      label: bn ? `${code}-এর পূর্ণ রিপোর্ট` : `The full report on ${code}`,
      stakes: shown.slice(0, 3).map((l) => (bn ? l.bn || l.en : l.en)),
    });
  };

  return (
    <>
      <Locked>{children}</Locked>
      <div ref={ref} className="rp-pp" data-open="false">
        <p className="rp-pp-label">
          <IconLock size={14} />
          <T en="Premium answers" bn="প্রিমিয়ামে যা জানবেন" />
        </p>
        <ul className="rp-pp-list">
          {shown.map((l, i) => (
            <li key={i} className="text-sm leading-snug text-text-main">{tx(l)}</li>
          ))}
        </ul>
        <a
          href="#ch-premium"
          onClick={onTap}
          className="mt-1 inline-flex min-h-10 items-center text-sm font-bold text-gold-ink hover:underline active:opacity-70"
        >
          <T en="Open with Premium" bn="প্রিমিয়ামে খুলুন" />
          <span aria-hidden="true">&nbsp;→</span>
        </a>
      </div>
    </>
  );
}

/**
 * THE section anatomy of the stock report: the question, the verdict chip,
 * the free facts (`free`, complete on their own), then the one Premium panel
 * holding the answer (`headline` + `children` + what it means + what to
 * watch), then the source line.
 */
export default function ReportSection({
  s,
  code,
  n,
  free,
  children,
  action,
  sample = false,
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
  /** Open in full for everyone (`freeReportSections`). */
  sample?: boolean;
}) {
  const premiumOpen = usePremiumOpen();
  const open = sample || premiumOpen;
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

      <PremiumPanel lines={s.inside} code={code} lock={s.key} sample={sample}>
        <p className="text-base font-bold leading-snug text-text-main sm:text-lg">{tx(s.headline)}</p>
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
      </PremiumPanel>

      <p className="rp-source text-xs text-text-muted">{tx(s.source)}</p>
    </section>
  );
}
