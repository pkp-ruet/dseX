"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { IconArrowRight, IconCheck, IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/stock/report/fmt";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { FROM_MONTH } from "@/lib/premium-plans";
import { JOB_EXPLAIN, JOBS } from "@/lib/premium-jobs";
import { trackEvent } from "@/lib/track";
import type { Bi } from "@/lib/stock-report";
import ReportKeyButton from "@/components/premium/ReportKeyButton";

/**
 * THE one Premium card on the stock page's overview, for a free reader
 * (2026-10-29, user: the generic Premium lines repeated on every section).
 * It says once what Premium is — the "Understand" job, what we read for you,
 * free vs Premium, the open sample sections, the price — so each section's
 * closed card only says what that section shows (`PremiumPanel brief`).
 * Nothing for a reader who sees everything.
 */
export default function ReportGuide({ samples, code }: { samples: { key: string; label: Bi }[]; code: string }) {
  const open = usePremiumOpen();
  const { state } = usePremium();
  const { lang } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const job = JOBS.understand;
  const info = JOB_EXPLAIN.understand;

  useEffect(() => {
    const el = ref.current;
    if (open || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "stock", lock: "report-guide", state, job: "understand" });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [open, state]);

  if (open) return null;

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "report-guide", state, job: "understand" });
    const label = { en: `The full report on ${code}`, bn: `${code}-এর পূর্ণ রিপোর্ট` };
    savePremiumContext({ from: "stock", label: label[lang] || label.en });
  };

  return (
    <div ref={ref} className="ans rp-guide" data-open="false">
      <div className="ans-top">
        <span className="ans-medal" aria-hidden="true">
          <IconCrown size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ans-eyebrow">
            Premium · <T en={job.name.en} bn={job.name.bn} />
          </p>
          <p className="ans-title">
            <T en={job.line.en} bn={job.line.bn} />
          </p>
        </div>
      </div>
      <div className="ans-body">
        <p className="ans-what">
          <T en={info.what.en} bn={info.what.bn} />
        </p>
        <div>
          <div className="ans-row">
            <span className="ans-pill"><T en="Free" bn="ফ্রি" /></span>
            <p className="text-sm leading-snug text-text-main">
              <T
                en="What we found: the grade, the Buy or Sell signal, the verdict on every check, every serious red flag and all the figures in the data below."
                bn="আমরা যা পেয়েছি: গ্রেড, কেনা বা বেচার সংকেত, প্রতিটি যাচাইয়ের রায়, প্রতিটি বড় সতর্কতা, আর নিচের ডেটার সব সংখ্যা।"
              />
            </p>
          </div>
          <div className="ans-row">
            <span className="ans-pill" data-premium="true">
              <IconCrown size={12} /> <T en="Premium" bn="প্রিমিয়াম" />
            </span>
            <p className="text-sm leading-snug text-text-main">
              <T
                en="Why, and what to do: the fair price and the price to buy below, three prices for the next 12 months, insider trades, the risks and what to watch."
                bn="কেন, আর কী করবেন: ন্যায্য দাম আর কোন দামের নিচে কেনা ভালো, আগামী 12 মাসের তিনটি দাম, ভেতরের লোকদের কেনাবেচা, ঝুঁকি আর যা খেয়াল রাখবেন।"
              />
            </p>
          </div>
        </div>
        <ul className="ans-gets">
          {info.gets.map((g) => (
            <li key={g.en}>
              <IconCheck size={12} />
              <T en={g.en} bn={g.bn} />
            </li>
          ))}
        </ul>
        {samples.length > 0 && (
          <p className="text-sm leading-snug text-text-muted">
            <T
              en={`${samples.length === 1 ? "One section is" : `${samples.length} sections are`} open on every share, so you can see a full answer: `}
              bn={`পূর্ণ উত্তর কেমন তা দেখতে প্রতিটি শেয়ারে ${samples.length}টি অংশ খোলা রাখা আছে: `}
            />
            {samples.map((s, i) => (
              <Fragment key={s.key}>
                {i > 0 && " · "}
                <a href={`#rp-${s.key}`} className="font-semibold text-primary-ink hover:underline active:opacity-70">
                  {tx(s.label)}
                </a>
              </Fragment>
            ))}
            <T en="." bn="।" />
          </p>
        )}
        <ReportKeyButton code={code} />
      </div>
      <div className="ans-foot">
        <Link href={PREMIUM_PATH} prefetch={false} onClick={onTap} className="btn-primary btn-lg ans-cta">
          <T en="Unlock with Premium" bn="প্রিমিয়ামে খুলুন" />
          <IconArrowRight size={18} />
        </Link>
        <span className="ans-price">
          <b>
            <T en={`From ৳${FROM_MONTH} a month`} bn={`মাসে ৳${FROM_MONTH} থেকে`} />
          </b>
          <span>
            <T en="No auto-renewal" bn="নিজে থেকে নবায়ন হয় না" />
          </span>
        </span>
      </div>
    </div>
  );
}
