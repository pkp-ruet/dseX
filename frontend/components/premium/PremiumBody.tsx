"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Bn from "@/components/i18n/Bn";
import LangToggle from "@/components/stock/LangToggle";
import {
  IconBulb, IconCheck, IconChevronDown, IconCrown, IconList, IconSparkle, IconWallet,
} from "@/components/ui/icons";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PremiumContextCard from "@/components/premium/PremiumContextCard";
import PayBox from "@/components/premium/PayBox";
import PaymentHelp from "@/components/premium/PaymentHelp";
import { useLang } from "@/context/LangContext";
import { usePremium } from "@/lib/premium";
import { OFFER } from "@/lib/premium-plans";
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
 * The /premium page body (2026-10-25: follows the app-wide language switch;
 * 2026-10-27: redesigned clean — hero open on the canvas, the four benefits in
 * ONE card, the three pay steps inside the plan section, a Free | Premium
 * grid (always open — user decision), ONE FAQ card, payment help folded, a closing call to action).
 * English mode keeps the Bengali line under each heading, as everywhere else;
 * Bengali mode is Bengali only. The server renders English (the saved choice
 * applies after mount) — the page's metadata and FAQ JSON-LD stay in
 * app/premium/page.tsx, built from the same copy (lib/premium-copy.ts).
 */
export default function PremiumBody() {
  const { lang, setLang, bn } = useLang();
  const { state } = usePremium();
  const t = (b: Bi) => (bn ? b.bn : b.en);
  // A heading's Bengali line — only in English mode (Bengali mode IS Bengali).
  const sub = (b: Bi) => (bn ? undefined : b.bn);
  const bnCls = bn ? "font-bn" : "";
  const langAttr = bn ? "bn" : undefined;

  // Payment help is folded; a link to #payment-help opens it.
  const helpRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const open = () => {
      if (window.location.hash === "#payment-help" && helpRef.current) helpRef.current.open = true;
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  return (
    <div className={`page-narrow pm-page ${bnCls}`} lang={langAttr}>
      {/* 1 · The promise, the price, the next step — open on the canvas */}
      <section className="pm-hero">
        <div className="pm-hero-lang">
          <LangToggle value={lang} onChange={setLang} size="sm" />
        </div>
        <PageHeader
          eyebrow={
            <span className="pm-eyebrow">
              <IconCrown size={14} /> {t(HERO.eyebrow)}
            </span>
          }
          title={t(HERO.title)}
          bn={sub(HERO.title)}
          lead={t(HERO.lead)}
        />
        <div className="pm-price">
          <p className="pm-offer">{t(OFFER.label)}</p>
          <p>
            <span className="pm-price-from">{t(HERO.from)}</span>{" "}
            <span className="pm-price-num">৳{PER_MONTH}</span>{" "}
            <span className="pm-price-per">{t(HERO.perMonth)}</span>
          </p>
          <p className="pm-price-alt">{t(HERO.orMonthly)}</p>
        </div>
        <div className="mt-6">
          <PremiumPlanCta />
        </div>
        <ul className="pm-promises" aria-label={bn ? "আমাদের প্রতিশ্রুতি" : "Our promises"}>
          {PROMISES.map((p) => (
            <li key={p.en}>
              <span className="pm-tick" aria-hidden><IconCheck size={14} /></span>
              <span>{t(p)}</span>
            </li>
          ))}
        </ul>
      </section>

      <PremiumContextCard />

      {/* 2 · What you get, in four plain ideas — one card, hairline grid */}
      <section aria-labelledby="get-h" id="what" className="pm-section scroll-mt-24">
        <SectionHeader id="get-h" size="lg" title={t(SECTIONS.what)} bn={sub(SECTIONS.what)} />
        <div className="pm-benefits">
          {BENEFITS.map((b) => (
            <article key={b.key} className="pm-benefit">
              <span className="pm-benefit-icon" aria-hidden>{ICON[b.key]}</span>
              <h3 className="mt-4 text-base font-bold text-text-main">{t(b.title)}</h3>
              {!bn && <Bn className="text-sm text-text-muted">{b.title.bn}</Bn>}
              <ul className="pm-points">
                {b.points.map((pt) => (
                  <li key={pt.en}>
                    <span className="pm-points-tick" aria-hidden><IconCheck size={14} /></span>
                    <span>{t(pt)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="pm-note">{t(SECTIONS.stayFree)}</p>
      </section>

      {/* 3 · Plans + pay, with the three steps as the section's guide */}
      <section id="pay" aria-labelledby="price-h" className="pm-section scroll-mt-24">
        <SectionHeader
          id="price-h"
          size="lg"
          title={t(SECTIONS.plan)}
          bn={sub(SECTIONS.plan)}
          lead={
            <>
              <span className="block font-semibold text-text-main">{t(OFFER.line)}</span>
              {t(SECTIONS.planLead)}{" "}
              <Link href="/refund-policy" className="font-semibold text-primary-ink hover:underline">
                {t(SECTIONS.refund)}
              </Link>
            </>
          }
        />
        <ol className="pm-steps" aria-label={t(SECTIONS.how)}>
          {STEPS.map((st, i) => (
            <li key={st.title.en}>
              <span className="pm-step-n" aria-hidden>{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-main">{t(st.title)}</span>
                <span className="block text-xs text-text-muted">{t(st.sub)}</span>
              </span>
            </li>
          ))}
        </ol>
        <PayBox />
      </section>

      {/* 4 · Every difference, for readers who want the detail */}
      <section aria-labelledby="compare-h" className="pm-section">
        <SectionHeader id="compare-h" size="lg" title={t(SECTIONS.compare)} bn={sub(SECTIONS.compare)} />
        <div className="pm-compare">
          <div className="pm-compare-head" aria-hidden>
            <span>{t(SECTIONS.feature)}</span>
            <span>{t(SECTIONS.free)}</span>
            <span className="pm-compare-head-pm"><IconCrown size={12} /> {t(SECTIONS.premium)}</span>
          </div>
          <ul>
            {ROWS.map((r) => (
              <li key={r.what.en} className="pm-compare-row">
                <div>
                  <p className="font-semibold text-text-main">{t(r.what)}</p>
                  {!bn && <Bn className="text-sm text-text-muted">{r.what.bn}</Bn>}
                </div>
                <div>
                  <p className="pm-compare-label">{t(SECTIONS.free)}</p>
                  <p className="text-sm leading-relaxed text-text-muted">{t(r.free)}</p>
                </div>
                <div className="pm-compare-pm">
                  <p className="pm-compare-label pm-compare-label-pm">{t(SECTIONS.premium)}</p>
                  <p className="text-sm leading-relaxed text-text-main">{t(r.premium)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 · Questions — one card */}
      <section aria-labelledby="faq-h" className="pm-section">
        <SectionHeader id="faq-h" size="lg" title={t(SECTIONS.faq)} bn={sub(SECTIONS.faq)} />
        <div className="pm-faq">
          {FAQS.map((f) => (
            <details key={f.q.en} className="pm-faq-item">
              <summary className="pm-fold-summary">
                <span className="min-w-0 font-semibold text-text-main">{t(f.q)}</span>
                <span className="pm-fold-chev" aria-hidden><IconChevronDown size={18} /></span>
              </summary>
              <div className="pm-faq-body">
                <p className="text-sm leading-relaxed text-text-main">{t(f.a)}</p>
                {!bn && <Bn className="mt-1 text-sm leading-relaxed text-text-muted">{f.a.bn}</Bn>}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 6 · Something went wrong with a payment — folded until needed */}
      <section aria-labelledby="help-h" className="pm-section">
        <details ref={helpRef} id="payment-help" className="pm-help scroll-mt-24">
          <summary className="pm-fold-summary">
            <span className="min-w-0">
              <span id="help-h" className="block font-semibold text-text-main">{t(SECTIONS.help)}</span>
              {!bn && <Bn as="span" className="block text-sm text-text-muted">{SECTIONS.help.bn}</Bn>}
              <span className="mt-1 block text-sm text-text-muted">{t(SECTIONS.helpLead)}</span>
            </span>
            <span className="pm-fold-chev" aria-hidden><IconChevronDown size={18} /></span>
          </summary>
          <div className="pm-help-body">
            <PaymentHelp />
          </div>
        </details>
      </section>

      {/* 7 · One last, calm ask — not for readers who already have Premium */}
      {state !== "premium" && (
        <section className="pm-close" aria-labelledby="close-h">
          <span className="pm-close-crown" aria-hidden><IconCrown size={22} /></span>
          <h2 id="close-h" className="mt-3 text-xl font-bold text-text-main sm:text-2xl">{t(SECTIONS.closing)}</h2>
          {!bn && <Bn className="text-sm text-text-muted">{SECTIONS.closing.bn}</Bn>}
          <p className="mt-2 text-sm text-text-muted">{t(SECTIONS.closingLead)}</p>
          <div className="mt-5 flex justify-center">
            <PremiumPlanCta align="center" />
          </div>
        </section>
      )}

      <p className="pm-foot">
        {(bn ? SECTIONS.howWeScore.bn : SECTIONS.howWeScore.en)[0]}
        <Link href="/about" className="font-semibold text-primary-ink hover:underline">
          {(bn ? SECTIONS.howWeScore.bn : SECTIONS.howWeScore.en)[1]}
        </Link>
        {(bn ? SECTIONS.howWeScore.bn : SECTIONS.howWeScore.en)[2]}
      </p>
    </div>
  );
}
