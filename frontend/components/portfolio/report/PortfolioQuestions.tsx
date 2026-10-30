"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { IconCrown } from "@/components/ui/icons";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { T } from "@/components/i18n/T";
import { ToneChip, tx } from "@/components/report/chip";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { PfQuestion } from "@/lib/portfolio-report";
import type { Bi } from "@/lib/stock-report";

/** Two real answers from a sample portfolio (the samples are always free). */
export interface SampleAnswer {
  name: Bi;
  href: string;
  rows: { ask: Bi; answer: Bi }[];
}

/**
 * The portfolio page's ONE Premium card (`#pf-premium`, 2026-10-30 — the
 * stock page's `NextQuestions` for your money): the gold lower half of the
 * answer card, for a reader without the full check. Each row pairs an answer
 * they already have (the chip, free on the page) with the question it leaves
 * — "Leans on banks → How much should move, and into what?" — chosen for this
 * portfolio (`buildQuestions`). Never the answer itself; the only answers
 * shown are two real ones from a sample portfolio, built when the fold opens.
 * Closed chapters each carry one gold line back here, and the watcher's
 * teaser push lands on this id.
 *
 * Open check (Premium): just the anchor.
 */
export default function PortfolioQuestions({ rows, sample }: { rows: PfQuestion[]; sample: () => SampleAnswer | null }) {
  const open = usePremiumOpen();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || open || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "portfolio", lock: "pf-questions", state, stakes: rows.length, job: "watch" });
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, state, rows.length]);

  if (open || rows.length === 0) return <span id="pf-premium" className="dash-section block" aria-hidden="true" />;

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-questions", state, stakes: rows.length, job: "watch" });
    savePremiumContext({
      from: "portfolio",
      label: bn ? "আপনার পোর্টফোলিওর পূর্ণ যাচাই" : "The full check on your portfolio",
      stakes: rows.slice(0, 3).map((r) => (bn ? r.ask.bn || r.ask.en : r.ask.en)),
    });
  };

  return (
    <div ref={ref} id="pf-premium" className="nq dash-section">
      <p className="nq-tag">
        <IconCrown size={14} />
        <T en="The full check on your portfolio" bn="আপনার পোর্টফোলিওর পূর্ণ যাচাই" />
      </p>
      <h3 className="nq-title">
        <T en="You have our answer. The full check tells you what to do about it." bn="উত্তর আপনি পেয়েছেন। এ নিয়ে কী করবেন, তা বলে পূর্ণ যাচাই।" />
      </h3>
      <ul className="nq-rows">
        {rows.map((r) => (
          <li key={r.key} className="nq-row">
            <ToneChip word={r.word} tone={r.tone} />
            <span className="nq-q">
              <b>{tx(r.ask)}</b>
              <span>{tx(r.hint)}</span>
            </span>
          </li>
        ))}
      </ul>

      <SampleAnswers sample={sample} />

      <div className="nq-actions">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg" block>
          <T en={`Get the full check · ৳${LOWEST_PRICE} a month`} bn={`পূর্ণ যাচাই নিন · মাসে ৳${LOWEST_PRICE}`} />
        </Button>
      </div>
      <p className="nq-fine">
        <T en="bKash, Nagad or bank. Nothing renews by itself. " bn="bKash, Nagad বা ব্যাংক। নিজে থেকে নবায়ন হয় না। " />
        <a href="#pf-q-strength" className="font-semibold text-primary-ink hover:underline active:opacity-70">
          <T en="One free sample answer is below: How strong are your companies?" bn="নিচে একটি ফ্রি নমুনা উত্তর আছে: কোম্পানিগুলো কতটা শক্তিশালী?" />
        </a>
      </p>
    </div>
  );
}

/** Two real answers from a sample portfolio, built when the fold opens:
 *  proof that the full check says something specific. */
function SampleAnswers({ sample }: { sample: () => SampleAnswer | null }) {
  const [data, setData] = useState<SampleAnswer | null | "none">(null);
  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open || data !== null) return;
    trackEvent("report_sample_open", { area: "portfolio" });
    setData(sample() ?? "none");
  };
  return (
    <details className="nq-sample" onToggle={onToggle}>
      <summary>
        <T en="See two real answers on a sample portfolio" bn="একটি নমুনা পোর্টফোলিওর দুটি আসল উত্তর দেখুন" />
      </summary>
      <div className="nq-sample-body">
        {data === "none" && (
          <p className="text-sm">
            <T en="The sample isn't ready right now." bn="নমুনাটি এখন তৈরি নেই।" />
          </p>
        )}
        {data && data !== "none" && (
          <>
            <p className="text-sm font-semibold">{tx(data.name)}</p>
            <dl>
              {data.rows.map((r, i) => (
                <div key={i}>
                  <dt>{tx(r.ask)}</dt>
                  <dd>{tx(r.answer)}</dd>
                </div>
              ))}
            </dl>
            <a href={data.href} className="text-sm font-semibold text-primary-ink hover:underline active:opacity-70">
              <T en="See the whole sample portfolio" bn="পুরো নমুনা পোর্টফোলিও দেখুন" />
            </a>
          </>
        )}
      </div>
    </details>
  );
}
