"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Bn from "@/components/i18n/Bn";
import LangToggle from "@/components/stock/LangToggle";
import { IconBulb, IconCheck, IconList, IconSparkle, IconWallet } from "@/components/ui/icons";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PremiumContextCard from "@/components/premium/PremiumContextCard";
import PayBox from "@/components/premium/PayBox";
import PaymentHelp from "@/components/premium/PaymentHelp";
import { useLang } from "@/context/LangContext";
import {
  BENEFITS, FAQS, HERO, PER_MONTH, PROMISES, ROWS, SECTIONS, STEPS, type Bi,
} from "@/lib/premium-copy";

const ICON: Record<(typeof BENEFITS)[number]["key"], ReactNode> = {
  why: <IconBulb size={20} />,
  portfolio: <IconWallet size={20} />,
  research: <IconList size={20} />,
  limits: <IconSparkle size={20} />,
};

/**
 * The /premium page body (2026-10-25: follows the app-wide language switch).
 * English mode keeps the Bengali line under each heading, as everywhere else;
 * Bengali mode is Bengali only. The server renders English (the saved choice
 * applies after mount) — the page's metadata and FAQ JSON-LD stay in
 * app/premium/page.tsx, built from the same copy (lib/premium-copy.ts).
 */
export default function PremiumBody() {
  const { lang, setLang, bn } = useLang();
  const t = (b: Bi) => (bn ? b.bn : b.en);
  // A heading's Bengali line — only in English mode (Bengali mode IS Bengali).
  const sub = (b: Bi) => (bn ? undefined : b.bn);
  const bnCls = bn ? "font-bn" : "";
  const langAttr = bn ? "bn" : undefined;

  return (
    <div className={`page-narrow space-y-14 ${bnCls}`} lang={langAttr}>
      {/* 1 · The promise, the price, the next step */}
      <section className="pm-hero">
        <div className="mb-2 flex justify-end">
          <LangToggle value={lang} onChange={setLang} size="sm" />
        </div>
        <PageHeader eyebrow={t(HERO.eyebrow)} title={t(HERO.title)} bn={sub(HERO.title)} lead={t(HERO.lead)} />
        <p className="pm-price">
          <span className="text-sm text-text-muted">{t(HERO.from)}</span>{" "}
          <span className="text-3xl font-bold text-text-main tabular-nums">৳{PER_MONTH}</span>{" "}
          <span className="text-sm text-text-muted">{t(HERO.perMonth)}</span>
        </p>
        {!bn && <Bn className="text-sm text-text-muted">বছরের প্ল্যানে মাসে মাত্র ৳{PER_MONTH}।</Bn>}
        <div className="mt-4">
          <PremiumPlanCta />
        </div>
        <ul className="pm-promises" aria-label={bn ? "আমাদের প্রতিশ্রুতি" : "Our promises"}>
          {PROMISES.map((p) => (
            <li key={p.en}>
              <span className="text-primary" aria-hidden><IconCheck size={16} /></span>
              <span className="text-sm text-text-main">{t(p)}</span>
            </li>
          ))}
        </ul>
      </section>

      <PremiumContextCard />

      {/* 2 · What you get, in four plain ideas */}
      <section aria-labelledby="get-h" id="what" className="scroll-mt-24">
        <SectionHeader id="get-h" title={t(SECTIONS.what)} bn={sub(SECTIONS.what)} />
        <div className="pm-benefits">
          {BENEFITS.map((b) => (
            <article key={b.key} className="pm-benefit">
              <div className="flex items-center gap-3">
                <span className="pm-benefit-icon" aria-hidden>{ICON[b.key]}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-text-main">{t(b.title)}</h3>
                  {!bn && <Bn className="text-sm text-text-muted">{b.title.bn}</Bn>}
                </div>
              </div>
              <ul className="pm-points">
                {b.points.map((pt) => (
                  <li key={pt.en}>
                    <span className="text-primary" aria-hidden><IconCheck size={14} /></span>
                    <span>{t(pt)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm text-text-muted">{t(SECTIONS.stayFree)}</p>
      </section>

      {/* 3 · How to pay, before the plan picker */}
      <section aria-labelledby="how-h">
        <SectionHeader id="how-h" title={t(SECTIONS.how)} bn={sub(SECTIONS.how)} />
        <ol className="pm-steps">
          {STEPS.map((st, i) => (
            <li key={st.title.en}>
              <span className="pm-step-n" aria-hidden>{i + 1}</span>
              <p className="mt-3 font-semibold text-text-main">{t(st.title)}</p>
              {!bn && <Bn className="text-sm text-text-muted">{st.title.bn}</Bn>}
              <p className="mt-1 text-sm text-text-muted">{t(st.sub)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4 · Plans + pay */}
      <section id="pay" aria-labelledby="price-h" className="scroll-mt-24">
        <SectionHeader
          id="price-h"
          title={t(SECTIONS.plan)}
          bn={sub(SECTIONS.plan)}
          lead={
            <>
              {t(SECTIONS.planLead)}{" "}
              <Link href="/refund-policy" className="font-semibold text-primary">{t(SECTIONS.refund)}</Link>
            </>
          }
        />
        <PayBox />
      </section>

      {/* 4b · Something went wrong with a payment */}
      <section id="payment-help" aria-labelledby="help-h" className="scroll-mt-24">
        <SectionHeader id="help-h" title={t(SECTIONS.help)} bn={sub(SECTIONS.help)} lead={t(SECTIONS.helpLead)} />
        <PaymentHelp />
      </section>

      {/* 5 · Every difference, for readers who want the detail */}
      <section aria-labelledby="compare-h">
        <SectionHeader id="compare-h" title={t(SECTIONS.compare)} bn={sub(SECTIONS.compare)} />
        <details className="pm-compare">
          <summary className="pm-compare-summary">
            <span className="font-semibold text-text-main">
              {t(SECTIONS.seeAll)} ({ROWS.length})
            </span>
            {!bn && <Bn as="span" className="text-sm text-text-muted">{SECTIONS.seeAll.bn}</Bn>}
          </summary>
          <ul className="divide-y divide-border">
            {ROWS.map((r) => (
              <li key={r.what.en} className="px-4 py-4">
                <p className="font-semibold text-text-main">{t(r.what)}</p>
                {!bn && <Bn className="text-sm text-text-muted mb-2">{r.what.bn}</Bn>}
                <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${bn ? "mt-2" : ""}`}>
                  <div>
                    <p className="text-xs font-bold text-text-muted">{t(SECTIONS.free)}</p>
                    <p className="text-sm text-text-muted leading-relaxed">{t(r.free)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary">{t(SECTIONS.premium)}</p>
                    <p className="text-sm text-text-main leading-relaxed">{t(r.premium)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* 6 · Questions */}
      <section aria-labelledby="faq-h">
        <SectionHeader id="faq-h" title={t(SECTIONS.faq)} bn={sub(SECTIONS.faq)} />
        <div className="flex flex-col gap-2">
          {FAQS.map((f) => (
            <details key={f.q.en} className="rounded-lg border border-border bg-surface p-4">
              <summary className="cursor-pointer font-semibold text-text-main">{t(f.q)}</summary>
              <p className="mt-2 text-sm leading-relaxed text-text-main">{t(f.a)}</p>
              {!bn && <Bn className="mt-1 text-sm leading-relaxed text-text-muted">{f.a.bn}</Bn>}
            </details>
          ))}
        </div>
      </section>

      <p className="text-sm text-text-muted">
        {(bn ? SECTIONS.howWeScore.bn : SECTIONS.howWeScore.en)[0]}
        <Link href="/about" className="font-semibold text-primary">
          {(bn ? SECTIONS.howWeScore.bn : SECTIONS.howWeScore.en)[1]}
        </Link>
        {(bn ? SECTIONS.howWeScore.bn : SECTIONS.howWeScore.en)[2]}
      </p>
    </div>
  );
}
