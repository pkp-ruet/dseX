"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, useEffect, useRef, type ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { useLockScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { IconArrowRight, IconCheck, IconCrown, IconLock } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { areaOf, savePremiumContext } from "@/lib/premium-context";
import { FROM_MONTH } from "@/lib/premium-plans";
import { JOB_EXPLAIN, JOBS, type Bi, type Job } from "@/lib/premium-jobs";
import { trackEvent } from "@/lib/track";

/**
 * Screen-only lock for an inline part (a scorecard number, a summary line, a
 * watchlist cell): the text stays in the HTML under `.premium-locked` (the
 * paywall JSON-LD selector) and is hidden until the reader may see it.
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

/** "Premium · Understand": the crown and the job a lock belongs to. */
export function JobTag({ job, className = "" }: { job: Job; className?: string }) {
  const name = JOBS[job].name;
  return (
    <span className={`ans-job ${className}`.trim()}>
      <IconCrown size={14} />
      <span>
        Premium · <T en={name.en} bn={name.bn} />
      </span>
    </span>
  );
}

/**
 * The closed card itself (also drawn as an example on /premium): a gold
 * header band with the crown and the job, what Premium does here in easy
 * words, the questions it answers (never the answers), three things you
 * get, then `foot` — the button and the price.
 */
export const AnswerCard = forwardRef<
  HTMLDivElement,
  { job: Job; lines: Bi[]; foot?: ReactNode; className?: string }
>(function AnswerCard({ job, lines, foot, className = "" }, ref) {
  const info = JOB_EXPLAIN[job];
  return (
    <div ref={ref} className={`ans ${className}`.trim()} data-open="false">
      <div className="ans-top">
        <span className="ans-medal" aria-hidden="true">
          <IconCrown size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ans-eyebrow">
            Premium · <T en={JOBS[job].name.en} bn={JOBS[job].name.bn} />
          </p>
          <p className="ans-title">
            <T en={JOBS[job].line.en} bn={JOBS[job].line.bn} />
          </p>
        </div>
        <span className="ans-locked">
          <IconLock size={14} />
          <T en="Locked" bn="লক করা" />
        </span>
      </div>
      <div className="ans-body">
        <p className="ans-what">
          <T en={info.what.en} bn={info.what.bn} />
        </p>
        <p className="ans-k">
          <T en="What you will find out here" bn="এখানে যা জানতে পারবেন" />
        </p>
        <ul className="ans-qs">
          {lines.map((l, i) => (
            <li key={i}>
              <span className="ans-q-icon" aria-hidden="true">
                <IconLock size={12} />
              </span>
              <span className="min-w-0">
                <T en={l.en} bn={l.bn} />
              </span>
            </li>
          ))}
        </ul>
        <ul className="ans-gets">
          {info.gets.map((g) => (
            <li key={g.en}>
              <IconCheck size={12} />
              <T en={g.en} bn={g.bn} />
            </li>
          ))}
        </ul>
      </div>
      {foot && <div className="ans-foot">{foot}</div>}
    </div>
  );
});

/** Said when a lock has no question of its own. */
const FALLBACK_LINE: Bi = {
  en: "Our reading of these figures, and what to watch next",
  bn: "এই সংখ্যাগুলোর অর্থ, আর এরপর যা খেয়াল রাখবেন",
};

/**
 * THE lock for an explanation, a verdict or an analysis (2026-10-29, the Free
 * vs Premium plan — it grew out of the stock report's Premium panel and
 * replaced `PremiumBlur` and `PremiumGate`). Whole or nothing: the answer is
 * shown or it isn't drawn — no blur, no half-shown figures.
 *
 *  - Premium reader: the answer as plain content, no label.
 *  - Free reader on an open sample (`sample`, or a scope opened for everyone —
 *    today's free report): a gold rule, "Premium analysis" + "Free sample" /
 *    "Free today", then the answer.
 *  - Everyone else, `box`: `AnswerCard` — a gold header band (crown, the
 *    job, "Locked"), what Premium does here in easy words, 1–3 plain
 *    questions it answers (never the answer), three things you get, then one
 *    clay button and the from-price.
 *    `line`: one sentence + a small button (a short list's hidden rest).
 *
 * The answer always stays in the HTML under `.premium-locked`, hidden.
 * The link goes to the page's one Premium section when a `PageLockScope`
 * names one, else /premium. Lists of other companies use `RowLock` instead.
 */
export default function AnswerLock({
  lines,
  job,
  lock,
  area: areaIn,
  what,
  href: hrefIn,
  sample = false,
  variant = "box",
  openClassName,
  boxClassName = "",
  className = "",
  children,
}: {
  /** What it answers, said without the answer: 1–3 short lines. */
  lines: Bi[];
  job: Job;
  /** Analytics label (English). */
  lock: string;
  /** Analytics area; defaults to the page's. */
  area?: string;
  /** What's behind it, for /premium's "you came from" card; defaults to the first line. */
  what?: Bi;
  href?: string;
  /** Open for everyone (a free sample). */
  sample?: boolean;
  variant?: "box" | "line";
  /** Class on the plain wrapper a Premium reader gets. */
  openClassName?: string;
  /** Class on the closed box / line only (its gutter inside a flush card). */
  boxClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const premiumOpen = usePremiumOpen();
  const { isPremium, state } = usePremium();
  const scope = useLockScope();
  const { lang } = useLang();
  const pathArea = areaOf(usePathname() || "/");
  const area = areaIn ?? pathArea;
  const href = hrefIn ?? (scope?.anchor ? `#${scope.anchor}` : PREMIUM_PATH);
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
        trackEvent("premium_lock_view", { area, lock, state, job });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, area, lock, state, job]);

  if (open) {
    // A Premium reader gets the answer as plain content: no label on every
    // part saying what they already pay for.
    if (isPremium) return <div className={`${openClassName ?? ""} ${className}`.trim() || undefined}>{children}</div>;
    // A free reader is told why this one is open: a sample, or today's free report.
    return (
      <div className={`ans ${className}`.trim()} data-open="true">
        <p className="ans-label">
          <IconCrown size={14} />
          <T en="Premium analysis" bn="প্রিমিয়াম বিশ্লেষণ" />
          <span className="ans-tag">
            {sample ? (
              <T en="Free sample" bn="ফ্রি নমুনা" />
            ) : scope?.reason === "key" ? (
              <T en="Your free report" bn="আপনার ফ্রি রিপোর্ট" />
            ) : (
              <T en="Free today" bn="আজ ফ্রি" />
            )}
          </span>
        </p>
        {children}
      </div>
    );
  }

  const shown = (lines.length ? lines : [FALLBACK_LINE]).slice(0, 3);
  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock, state, job });
    savePremiumContext({
      from: area,
      label: (what ?? shown[0])[lang] || (what ?? shown[0]).en,
      stakes: shown.map((l) => l[lang] || l.en),
    });
  };
  const isAnchor = href.startsWith("#");

  if (variant === "line") {
    const l = shown[0];
    return (
      <div className={className || undefined}>
        <Locked>{children}</Locked>
        <div ref={ref} className={`lk-line lk-line--answer ${boxClassName}`.trim()}>
          <span className="lk-line-icon" aria-hidden="true">
            <IconLock size={16} />
          </span>
          <p className="lk-line-text">
            <JobTag job={job} className="ans-job--inline" />
            <T en={l.en} bn={l.bn} />
          </p>
          {isAnchor ? (
            <a href={href} className="btn-quiet btn-sm lk-line-btn" onClick={onTap}>
              <T en="See with Premium" bn="প্রিমিয়ামে দেখুন" />
            </a>
          ) : (
            <Link href={href} prefetch={false} className="btn-quiet btn-sm lk-line-btn" onClick={onTap}>
              <T en="See with Premium" bn="প্রিমিয়ামে দেখুন" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  const linkBody = (
    <>
      <T en="Unlock with Premium" bn="প্রিমিয়ামে খুলুন" />
      <IconArrowRight size={18} />
    </>
  );
  const linkCls = "btn-primary btn-lg ans-cta";
  return (
    <div className={className || undefined}>
      <Locked>{children}</Locked>
      <AnswerCard
        ref={ref}
        job={job}
        lines={shown}
        className={boxClassName}
        foot={
          <>
            {isAnchor ? (
              <a href={href} onClick={onTap} className={linkCls}>
                {linkBody}
              </a>
            ) : (
              <Link href={href} prefetch={false} onClick={onTap} className={linkCls}>
                {linkBody}
              </Link>
            )}
            <span className="ans-price">
              <b>
                <T en={`From ৳${FROM_MONTH} a month`} bn={`মাসে ৳${FROM_MONTH} থেকে`} />
              </b>
              <span>
                <T en="No auto-renewal · 7-day refund" bn="নিজে থেকে নবায়ন হয় না · 7 দিনে টাকা ফেরত" />
              </span>
            </span>
          </>
        }
      />
    </div>
  );
}
