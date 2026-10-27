"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
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

/** One copy pair on screen — the reader sees only their language. */
function Tx({ b }: { b: Bi }) {
  return <T en={b.en} bn={b.bn} />;
}

/**
 * The /premium page body (2026-10-27: redesigned clean — hero open on the
 * canvas, the four benefits in ONE card, the three pay steps inside the plan
 * section, a Free | Premium grid (always open — user decision), ONE FAQ card,
 * payment help folded, a closing call to action).
 *
 * One language per page (2026-10-28): every pair renders through `<T>`, so
 * the server HTML carries both and CSS shows the reader's language — no
 * Bengali line under English headings, no in-page switch. The page's
 * metadata and FAQ JSON-LD stay in app/premium/page.tsx, built from the same
 * copy (lib/premium-copy.ts).
 */
export default function PremiumBody() {
  const { bn } = useLang();
  const { state } = usePremium();

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
    <div className="page-narrow pm-page">
      {/* 1 · The promise, the price, the next step — open on the canvas */}
      <section className="pm-hero">
        <PageHeader
          eyebrow={
            <span className="pm-eyebrow">
              <IconCrown size={14} /> <Tx b={HERO.eyebrow} />
            </span>
          }
          title={<Tx b={HERO.title} />}
          lead={<Tx b={HERO.lead} />}
        />
        <div className="pm-price">
          <p className="pm-offer"><Tx b={OFFER.label} /></p>
          <p>
            <span className="pm-price-from"><Tx b={HERO.from} /></span>{" "}
            <span className="pm-price-num">৳{PER_MONTH}</span>{" "}
            <span className="pm-price-per"><Tx b={HERO.perMonth} /></span>
          </p>
          <p className="pm-price-alt"><Tx b={HERO.orMonthly} /></p>
        </div>
        <div className="mt-6">
          <PremiumPlanCta />
        </div>
        <ul className="pm-promises" aria-label={bn ? SECTIONS.promises.bn : SECTIONS.promises.en}>
          {PROMISES.map((p) => (
            <li key={p.en}>
              <span className="pm-tick" aria-hidden><IconCheck size={14} /></span>
              <span><Tx b={p} /></span>
            </li>
          ))}
        </ul>
      </section>

      <PremiumContextCard />

      {/* 2 · What you get, in four plain ideas — one card, hairline grid */}
      <section aria-labelledby="get-h" id="what" className="pm-section scroll-mt-24">
        <SectionHeader id="get-h" size="lg" title={<Tx b={SECTIONS.what} />} />
        <div className="pm-benefits">
          {BENEFITS.map((b) => (
            <article key={b.key} className="pm-benefit">
              <span className="pm-benefit-icon" aria-hidden>{ICON[b.key]}</span>
              <h3 className="mt-4 text-base font-bold text-text-main"><Tx b={b.title} /></h3>
              <ul className="pm-points">
                {b.points.map((pt) => (
                  <li key={pt.en}>
                    <span className="pm-points-tick" aria-hidden><IconCheck size={14} /></span>
                    <span><Tx b={pt} /></span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="pm-note"><Tx b={SECTIONS.stayFree} /></p>
      </section>

      {/* 3 · Plans + pay, with the three steps as the section's guide */}
      <section id="pay" aria-labelledby="price-h" className="pm-section scroll-mt-24">
        <SectionHeader
          id="price-h"
          size="lg"
          title={<Tx b={SECTIONS.plan} />}
          lead={
            <>
              <span className="block font-semibold text-text-main"><Tx b={OFFER.line} /></span>
              <Tx b={SECTIONS.planLead} />{" "}
              <Link href="/refund-policy" className="font-semibold text-primary-ink hover:underline">
                <Tx b={SECTIONS.refund} />
              </Link>
            </>
          }
        />
        <ol className="pm-steps" aria-label={bn ? SECTIONS.how.bn : SECTIONS.how.en}>
          {STEPS.map((st, i) => (
            <li key={st.title.en}>
              <span className="pm-step-n" aria-hidden>{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-main"><Tx b={st.title} /></span>
                <span className="block text-xs text-text-muted"><Tx b={st.sub} /></span>
              </span>
            </li>
          ))}
        </ol>
        <PayBox />
      </section>

      {/* 4 · Every difference, for readers who want the detail */}
      <section aria-labelledby="compare-h" className="pm-section">
        <SectionHeader id="compare-h" size="lg" title={<Tx b={SECTIONS.compare} />} />
        <div className="pm-compare">
          <div className="pm-compare-head" aria-hidden>
            <span><Tx b={SECTIONS.feature} /></span>
            <span><Tx b={SECTIONS.free} /></span>
            <span className="pm-compare-head-pm"><IconCrown size={12} /> <Tx b={SECTIONS.premium} /></span>
          </div>
          <ul>
            {ROWS.map((r) => (
              <li key={r.what.en} className="pm-compare-row">
                <div>
                  <p className="font-semibold text-text-main"><Tx b={r.what} /></p>
                </div>
                <div>
                  <p className="pm-compare-label"><Tx b={SECTIONS.free} /></p>
                  <p className="text-sm leading-relaxed text-text-muted"><Tx b={r.free} /></p>
                </div>
                <div className="pm-compare-pm">
                  <p className="pm-compare-label pm-compare-label-pm"><Tx b={SECTIONS.premium} /></p>
                  <p className="text-sm leading-relaxed text-text-main"><Tx b={r.premium} /></p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5 · Questions — one card */}
      <section aria-labelledby="faq-h" className="pm-section">
        <SectionHeader id="faq-h" size="lg" title={<Tx b={SECTIONS.faq} />} />
        <div className="pm-faq">
          {FAQS.map((f) => (
            <details key={f.q.en} className="pm-faq-item">
              <summary className="pm-fold-summary">
                <span className="min-w-0 font-semibold text-text-main"><Tx b={f.q} /></span>
                <span className="pm-fold-chev" aria-hidden><IconChevronDown size={18} /></span>
              </summary>
              <div className="pm-faq-body">
                <p className="text-sm leading-relaxed text-text-main"><Tx b={f.a} /></p>
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
              <span id="help-h" className="block font-semibold text-text-main"><Tx b={SECTIONS.help} /></span>
              <span className="mt-1 block text-sm text-text-muted"><Tx b={SECTIONS.helpLead} /></span>
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
          <h2 id="close-h" className="mt-3 text-xl font-bold text-text-main sm:text-2xl"><Tx b={SECTIONS.closing} /></h2>
          <p className="mt-2 text-sm text-text-muted"><Tx b={SECTIONS.closingLead} /></p>
          <div className="mt-5 flex justify-center">
            <PremiumPlanCta align="center" />
          </div>
        </section>
      )}

      <p className="pm-foot">
        <T en={SECTIONS.howWeScore.en[0]} bn={SECTIONS.howWeScore.bn[0]} />
        <Link href="/about" className="font-semibold text-primary-ink hover:underline">
          <T en={SECTIONS.howWeScore.en[1]} bn={SECTIONS.howWeScore.bn[1]} />
        </Link>
        <T en={SECTIONS.howWeScore.en[2]} bn={SECTIONS.howWeScore.bn[2]} />
      </p>
    </div>
  );
}
