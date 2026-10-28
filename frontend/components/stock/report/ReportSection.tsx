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
 *  - open for a Premium reader: the answer as plain report text, no label;
 *  - open for a free reader (today's free report, or a `sample` section that
 *    is open for everyone): a gold rule, "Premium analysis" + "Free sample" /
 *    "Free today", then the answer whole;
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
    // A Premium reader gets the answer as plain report text: no label on
    // every section saying what they already pay for.
    if (isPremium) return <div className="rp-body">{children}</div>;
    // A free reader is told why this one is open: a sample, or today's free report.
    return (
      <div className="rp-pp" data-open="true">
        <p className="rp-pp-label">
          <IconCrown size={14} />
          <T en="Premium analysis" bn="প্রিমিয়াম বিশ্লেষণ" />
          <span className="rp-pp-tag">
            {sample ? <T en="Free sample" bn="ফ্রি নমুনা" /> : <T en="Free today" bn="আজ ফ্রি" />}
          </span>
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
 * The head every report section shares: the question (h3) and its verdict
 * chip. Sections sit on their part's sheet, split by hairlines, so the head
 * carries no number, icon or box.
 */
export function SectionHead({ id, title, chip }: { id: string; title: ReactNode; chip?: ReactNode }) {
  return (
    <div className="rp-head">
      <h3 id={id} className="min-w-0 text-lg font-bold leading-snug text-text-main sm:text-xl">{title}</h3>
      {chip}
    </div>
  );
}

/** The quiet last line of a section: where the figures come from, and an
 *  optional control (the share button) at its end. */
export function SectionFoot({ source, action }: { source?: ReactNode; action?: ReactNode }) {
  if (!source && !action) return null;
  return (
    <div className="rp-foot">
      <p className="min-w-0 text-xs leading-snug text-text-muted">{source}</p>
      {action}
    </div>
  );
}

/**
 * THE section anatomy of the stock report (2026-10-29 calm pass): the
 * question and its verdict chip, the answer in one sentence right under it
 * (a free reader gets the free line instead), the free facts, then the rest
 * of the answer — the figures, what it means, what to watch — in the one
 * Premium panel, and the source line. Every section reads the same way:
 * question, answer, evidence.
 */
export default function ReportSection({
  s,
  code,
  free,
  children,
  action,
  aliases = [],
  sample = false,
}: {
  s: SectionBase;
  code: string;
  /** Free facts under the answer (public numbers, dates, red flags). */
  free?: ReactNode;
  /** The Premium body (charts, lists). */
  children?: ReactNode;
  /** A control for the foot line (the share button). */
  action?: ReactNode;
  /** Older anchors that should land on this section (`#results` …). */
  aliases?: string[];
  /** Open in full for everyone (`freeReportSections`). */
  sample?: boolean;
}) {
  const premiumOpen = usePremiumOpen();
  const open = sample || premiumOpen;
  const answer = <p className="rp-answer">{tx(s.headline)}</p>;
  return (
    <section id={`rp-${s.key}`} className="rp-sec stock-anchor" aria-labelledby={`rp-${s.key}-t`}>
      {aliases.map((id) => <span key={id} id={id} className="stock-anchor block" aria-hidden="true" />)}
      <SectionHead id={`rp-${s.key}-t`} title={tx(s.title)} chip={<ToneChip word={s.word} tone={s.tone} />} />

      {open ? answer : s.free_line && <p className="rp-answer">{tx(s.free_line)}</p>}

      {free && <div className="rp-free">{free}</div>}

      <PremiumPanel lines={s.inside} code={code} lock={s.key} sample={sample}>
        {!open && answer}
        {children}
        {s.meaning.length > 0 && (
          <div className="rp-meaning">
            {s.meaning.map((m, i) => (
              <p key={i} className="text-sm leading-relaxed text-text-main sm:text-base">{tx(m)}</p>
            ))}
          </div>
        )}
        {s.watch && (
          <div className="rp-watch">
            <p className="text-xs font-bold text-text-muted">
              <T en="What to watch" bn="যা খেয়াল রাখবেন" />
            </p>
            <p className="mt-0.5 text-sm leading-snug text-text-main">{tx(s.watch)}</p>
          </div>
        )}
      </PremiumPanel>

      <SectionFoot source={tx(s.source)} action={action} />
    </section>
  );
}
