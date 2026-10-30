"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconCrown } from "@/components/ui/icons";
import ReportKeyButton from "@/components/premium/ReportKeyButton";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { T } from "@/components/i18n/T";
import { ToneChip, tx } from "@/components/stock/report/fmt";
import { useLang } from "@/context/LangContext";
import { getReportQuestions } from "@/lib/api";
import { freeReportCode } from "@/lib/free-report";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { NextQuestion } from "@/lib/stock-report";

type Sample = { code: string; name: string; rows: NextQuestion[] } | "error" | null;

/**
 * The page's ONE Premium card (`#ch-premium`, 2026-10-30, plan
 * https://claude.ai/artifact/UHZTK5nvUVrtzzmq6c2oSX): the bottom of the answer
 * card, for a reader who can't see the full report. Each row pairs an answer
 * they already have (the chip, free on the page) with the question it leaves
 * — "Buy → Up to what price?", "Low → How low?" — which the full report
 * answers (`report.next_questions`, chosen for this share). Never the answer
 * itself; the only answers shown are two real ones from today's free report,
 * fetched on tap. Lower down, locked chapters carry one signpost back here.
 *
 * Open report (Premium, today's free report, a report key): just the anchor,
 * so `#ch-premium` links still land on the answer.
 */
export default function NextQuestions({ code, rows }: { code: string; rows: NextQuestion[] }) {
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
        trackEvent("premium_lock_view", { area: "stock", lock: "stock-questions", state, stakes: rows.length });
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, state, rows.length]);

  if (open || rows.length === 0) return <span id="ch-premium" className="stock-anchor block" aria-hidden="true" />;

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-questions", state, stakes: rows.length });
    savePremiumContext({
      from: "stock",
      label: bn ? `${code}-এর পূর্ণ রিপোর্ট` : `The full report on ${code}`,
      stakes: rows.slice(0, 3).map((r) => (bn ? r.ask.bn || r.ask.en : r.ask.en)),
    });
  };

  return (
    <div ref={ref} id="ch-premium" className="nq stock-anchor">
      <p className="nq-tag">
        <IconCrown size={14} />
        <T en={`Full report on ${code}`} bn={`${code}-এর পূর্ণ রিপোর্ট`} />
      </p>
      <h3 className="nq-title">
        <T
          en="You have our answer. The full report tells you what to do with it."
          bn="উত্তর আপনি পেয়েছেন। এ নিয়ে কী করবেন, তা বলে পূর্ণ রিপোর্ট।"
        />
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

      <SampleAnswers code={code} />

      <div className="nq-actions">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg" block>
          <T en={`Get the full report · ৳${LOWEST_PRICE} a month`} bn={`পূর্ণ রিপোর্ট নিন · মাসে ৳${LOWEST_PRICE}`} />
        </Button>
        <ReportKeyButton code={code} />
      </div>
      <p className="nq-fine">
        <T en="bKash, Nagad or bank. Nothing renews by itself. " bn="bKash, Nagad বা ব্যাংক। নিজে থেকে নবায়ন হয় না। " />
        <a href="#ch-company" className="font-semibold text-primary-ink hover:underline active:opacity-70">
          <T en="See one free sample answer below: Does it make money?" bn="নিচে একটি ফ্রি নমুনা উত্তর দেখুন: এটি কি মুনাফা করে?" />
        </a>
      </p>
    </div>
  );
}

/** Two real answers from today's free report, fetched when the fold opens:
 *  proof that the full report says something specific. Hidden on the free
 *  report's own page (it is open there anyway). */
function SampleAnswers({ code }: { code: string }) {
  const [today, setToday] = useState<string | null>(null);
  const [sample, setSample] = useState<Sample>(null);
  const asked = useRef(false);
  useEffect(() => setToday(freeReportCode()), []);
  if (!today || today === code.toUpperCase()) return null;

  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (!e.currentTarget.open || asked.current) return;
    asked.current = true;
    trackEvent("report_sample_open", { code, sample: today });
    getReportQuestions(today)
      .then((s) => setSample(s))
      .catch(() => setSample("error"));
  };

  const shown = sample && sample !== "error" ? sample.rows.filter((r) => r.answer).slice(0, 2) : [];
  return (
    <details className="nq-sample" onToggle={onToggle}>
      <summary>
        <T en={`See two real answers from today's free report: ${today}`} bn={`আজকের ফ্রি রিপোর্ট থেকে দুটি আসল উত্তর দেখুন: ${today}`} />
      </summary>
      <div className="nq-sample-body">
        {sample === null && (
          <p className="text-sm"><T en="Loading…" bn="লোড হচ্ছে…" /></p>
        )}
        {sample !== null && shown.length > 0 && (
          <dl>
            {shown.map((r) => (
              <div key={r.key}>
                <dt>{tx(r.ask)}</dt>
                <dd>{r.answer && tx(r.answer)}</dd>
              </div>
            ))}
          </dl>
        )}
        <Link href={`/stock/${today}#ch-answer`} className="text-sm font-semibold text-primary-ink hover:underline active:opacity-70">
          <T en={`Read the whole report on ${today}, free today`} bn={`${today}-এর পুরো রিপোর্ট পড়ুন, আজ ফ্রি`} />
        </Link>
      </div>
    </details>
  );
}
