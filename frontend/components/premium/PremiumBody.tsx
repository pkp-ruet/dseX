"use client";

import { useEffect, useRef, type ReactNode } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import {
  IconBell, IconBook, IconBriefcase, IconCalendar, IconCheck, IconChevronDown, IconClipboardCheck,
  IconCompare, IconCompass, IconCrown, IconFileText, IconNews, IconPie, IconStar, IconTune,
} from "@/components/ui/icons";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PremiumContextCard from "@/components/premium/PremiumContextCard";
import PremiumPromises from "@/components/premium/PremiumPromises";
import PayBox from "@/components/premium/PayBox";
import PaymentHelp from "@/components/premium/PaymentHelp";
import { useLang } from "@/context/LangContext";
import { FAQS, FEATURES, HERO, PER_MONTH, PROMISES, SECTIONS, type Bi, type FeatureKey } from "@/lib/premium-copy";

const ICON: Record<FeatureKey, ReactNode> = {
  analysis: <IconFileText size={20} />,
  portfolio: <IconPie size={20} />,
  watchlist: <IconStar size={20} />,
  dividends: <IconCalendar size={20} />,
  buylist: <IconClipboardCheck size={20} />,
  screener: <IconTune size={20} />,
  compare: <IconCompare size={20} />,
  alerts: <IconBell size={20} />,
  news: <IconNews size={20} />,
  foryou: <IconCompass size={20} />,
  research: <IconBook size={20} />,
  portfolios: <IconBriefcase size={20} />,
};

/** One copy pair on screen — the reader sees only their language. */
function Tx({ b }: { b: Bi }) {
  return <T en={b.en} bn={b.bn} />;
}

/**
 * The /premium page body. 2026-11-18 (user: "everything sounds abstract. give
 * a simple list … a simple easy to understand page"): the price and one
 * button → ONE list of what Premium gives, each row its name, one line and
 * what the free plan gets → the plans and pay box → three questions, with
 * payment help folded under them. No refund line here (user decision).
 *
 * One language per page (2026-10-28): every pair renders through `<T>`, so
 * the server HTML carries both and CSS shows the reader's language. The
 * page's metadata and FAQ JSON-LD stay in app/premium/page.tsx, built from
 * the same copy (lib/premium-copy.ts).
 */
export default function PremiumBody() {
  const { bn } = useLang();

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
    <div className="pm-page">
      {/* 1 · What it is and what it costs */}
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
        <p className="pm-price">
          <span className="pm-price-num">৳{PER_MONTH}</span>
          <span className="pm-price-per"><Tx b={HERO.perMonth} /></span>
        </p>
        <p className="pm-price-alt"><Tx b={HERO.orPlans} /></p>
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

      {/* 2 · The three promises, in the reader's own figures (step 7) */}
      <PremiumPromises />

      {/* 2 · The list: one row per feature, with what the free plan gets */}
      <section aria-labelledby="list-h" id="what" className="pm-section scroll-mt-24">
        <SectionHeader id="list-h" size="lg" title={<Tx b={SECTIONS.list} />} />
        <ul className="pm-list">
          {FEATURES.map((f) => (
            <li key={f.key} id={`pm-${f.key}`} className="pm-feat">
              <span className="pm-feat-icon" aria-hidden>{ICON[f.key]}</span>
              <div className="min-w-0">
                <h3 className="pm-feat-name"><Tx b={f.name} /></h3>
                <p className="pm-feat-line"><Tx b={f.line} /></p>
                <p className="pm-feat-free">
                  <Tx b={SECTIONS.free} />: <Tx b={f.free} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 · Plans + pay */}
      <section id="pay" aria-labelledby="price-h" className="pm-section scroll-mt-24">
        <SectionHeader id="price-h" size="lg" title={<Tx b={SECTIONS.plan} />} />
        <PayBox />
      </section>

      {/* 4 · Questions, then payment help folded until needed */}
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

        <details ref={helpRef} id="payment-help" className="pm-help mt-4 scroll-mt-24">
          <summary className="pm-fold-summary">
            <span className="min-w-0">
              <span className="block font-semibold text-text-main"><Tx b={SECTIONS.help} /></span>
              <span className="mt-1 block text-sm text-text-muted"><Tx b={SECTIONS.helpLead} /></span>
            </span>
            <span className="pm-fold-chev" aria-hidden><IconChevronDown size={18} /></span>
          </summary>
          <div className="pm-help-body">
            <PaymentHelp />
          </div>
        </details>
      </section>
    </div>
  );
}
