"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import {
  IconArrowRight, IconBell, IconBulb, IconCheck, IconChevronDown, IconCrown, IconList, IconSparkle, IconWallet,
} from "@/components/ui/icons";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PremiumContextCard from "@/components/premium/PremiumContextCard";
import PayBox from "@/components/premium/PayBox";
import PaymentHelp from "@/components/premium/PaymentHelp";
import { JobTag } from "@/components/premium/AnswerLock";
import { useLang } from "@/context/LangContext";
import { usePremium } from "@/lib/premium";
import { OFFER } from "@/lib/premium-plans";
import {
  FAQS, GROUPS, HERO, LIMITS, PER_MONTH, PROMISES, SECTIONS, STEPS, TABLE,
  type Bi, type Cell, type Group, type GroupKey, type Tone,
} from "@/lib/premium-copy";

const ICON: Record<GroupKey, ReactNode> = {
  share: <IconBulb size={20} />,
  portfolio: <IconWallet size={20} />,
  daily: <IconBell size={20} />,
  find: <IconList size={20} />,
  limits: <IconSparkle size={20} />,
};

const TONE: Record<Tone, string> = {
  good: "text-positive",
  watch: "text-watch",
  bad: "text-negative",
};

const groupId = (k: GroupKey) => `get-${k}`;
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.key, g.name])) as Record<GroupKey, Bi>;

/** One copy pair on screen — the reader sees only their language. */
function Tx({ b }: { b: Bi }) {
  return <T en={b.en} bn={b.bn} />;
}

/** The five things, one row each — a table of contents that already explains. */
function GroupIndex() {
  return (
    <ol className="pm-index">
      {GROUPS.map((g) => (
        <li key={g.key}>
          <a href={`#${groupId(g.key)}`} className="pm-index-row">
            <span className="pm-index-icon" aria-hidden>{ICON[g.key]}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-text-main"><Tx b={g.name} /></span>
              <span className="block text-sm text-text-muted"><Tx b={g.question} /></span>
            </span>
            <span className="pm-index-chev" aria-hidden><IconChevronDown size={18} /></span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** One group: the question, what you get, an example, what stays free. */
function GroupCard({ g }: { g: Group }) {
  const { bn } = useLang();
  const href = g.link?.href;
  return (
    <article id={groupId(g.key)} className="pm-group scroll-mt-24" aria-labelledby={`${groupId(g.key)}-h`}>
      <header className="pm-group-head">
        <span className="pm-group-icon" aria-hidden>{ICON[g.key]}</span>
        <div className="min-w-0">
          {g.job && <JobTag job={g.job} className="mb-1" />}
          <h3 id={`${groupId(g.key)}-h`} className="text-lg font-bold leading-snug text-text-main sm:text-xl">
            <Tx b={g.name} />
          </h3>
        </div>
      </header>

      <p className="pm-group-lead">
        <span className="font-semibold text-text-main"><Tx b={g.question} /></span>{" "}
        <Tx b={g.lead} />
      </p>

      {g.items.length > 0 && (
        <ul className="pm-items" aria-label={bn ? SECTIONS.youGet.bn : SECTIONS.youGet.en}>
          {g.items.map((it) => (
            <li key={it.name.en}>
              <span className="pm-items-tick" aria-hidden><IconCheck size={14} /></span>
              <span className="min-w-0">
                <span className="block font-semibold text-text-main"><Tx b={it.name} /></span>
                <span className="block text-sm leading-relaxed text-text-main"><Tx b={it.line} /></span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {g.key === "limits" && (
        <ul className="pm-limits">
          {LIMITS.map((l) => (
            <li key={l.what.en} className="pm-limit">
              <span className="block text-sm font-semibold text-text-main"><Tx b={l.what} /></span>
              <span className="mt-2 block text-sm text-text-main">
                <Tx b={SECTIONS.free} />: <Tx b={l.free} />
              </span>
              <span className="pm-limit-pm">
                <IconCrown size={14} /> <Tx b={l.premium} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {g.example && (
        <figure className="pm-example">
          <figcaption className="pm-example-label">
            <IconCrown size={14} /> <Tx b={SECTIONS.example} /> · <Tx b={g.example.label} />
          </figcaption>
          <p className="text-sm font-semibold text-text-main"><Tx b={g.example.title} /></p>
          {g.example.word && (
            <p className={`mt-1 text-lg font-bold ${g.example.tone ? TONE[g.example.tone] : "text-text-main"}`}>
              <Tx b={g.example.word} />
            </p>
          )}
          <p className="mt-1 text-sm leading-relaxed text-text-main"><Tx b={g.example.line} /></p>
        </figure>
      )}

      <footer className="pm-group-free">
        <p className="min-w-0 text-sm text-text-main">
          <span className="pm-free-chip"><Tx b={SECTIONS.freePlan} /></span>{" "}
          <Tx b={g.free} />
        </p>
        {g.link && href && (
          <Link href={href} className="pm-group-link">
            <Tx b={g.link.label} /> <IconArrowRight size={16} />
          </Link>
        )}
      </footer>
    </article>
  );
}

/** A table cell: a tick, a dash, or a few words. */
function CellView({ c, pm = false }: { c: Cell; pm?: boolean }) {
  if (c === true) {
    return (
      <span className={pm ? "pm-yes pm-yes--pm" : "pm-yes"}>
        <IconCheck size={16} />
        <span className="sr-only"><Tx b={SECTIONS.included} /></span>
      </span>
    );
  }
  if (c === false) {
    return (
      <span className="pm-no">
        <span aria-hidden>–</span>
        <span className="sr-only"><Tx b={SECTIONS.notIncluded} /></span>
      </span>
    );
  }
  return <Tx b={c} />;
}

/**
 * The /premium page body. 2026-11-04 (user: "make the premium page more
 * organized, explain clearly what user gets"): hero → "What you get" as five
 * numbered groups (an index, then one card per group, each built the same
 * way: the question it answers, what you get, a made-up example, what stays
 * free) → plans + pay → ONE short side-by-side table (always open, user
 * decision 2026-10-27) → FAQ → payment help → one closing ask.
 *
 * One language per page (2026-10-28): every pair renders through `<T>`, so
 * the server HTML carries both and CSS shows the reader's language. The
 * page's metadata and FAQ JSON-LD stay in app/premium/page.tsx, built from
 * the same copy (lib/premium-copy.ts).
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

      {/* 2 · What you get: five numbered groups, an index first */}
      <section aria-labelledby="get-h" id="what" className="pm-section scroll-mt-24">
        <SectionHeader id="get-h" size="lg" title={<Tx b={SECTIONS.what} />} lead={<Tx b={SECTIONS.whatLead} />} />
        <GroupIndex />
        <p className="pm-note"><Tx b={SECTIONS.examples} /></p>
        <div className="pm-groups">
          {GROUPS.map((g) => (
            <GroupCard key={g.key} g={g} />
          ))}
        </div>
        {state !== "premium" && <p className="pm-note"><Tx b={SECTIONS.keys} /></p>}
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

      {/* 4 · Everything above in one short table — always open */}
      <section aria-labelledby="compare-h" className="pm-section">
        <SectionHeader id="compare-h" size="lg" title={<Tx b={SECTIONS.compare} />} lead={<Tx b={SECTIONS.compareLead} />} />
        <div className="pm-table-card">
          <table className="pm-table">
            <thead>
              <tr>
                <th scope="col"><Tx b={SECTIONS.feature} /></th>
                <th scope="col"><Tx b={SECTIONS.free} /></th>
                <th scope="col" className="pm-table-pm">
                  <span className="inline-flex items-center gap-1"><IconCrown size={14} /> <Tx b={SECTIONS.premium} /></span>
                </th>
              </tr>
            </thead>
            {TABLE.map((grp) => (
              <tbody key={grp.group}>
                <tr className="pm-table-group">
                  <th scope="colgroup" colSpan={3}>
                    <a href={`#${groupId(grp.group)}`}><Tx b={GROUP_NAME[grp.group]} /></a>
                  </th>
                </tr>
                {grp.rows.map((r) => (
                  <tr key={r.what.en}>
                    <th scope="row"><Tx b={r.what} /></th>
                    <td><CellView c={r.free} /></td>
                    <td className="pm-table-pm"><CellView c={r.premium} pm /></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
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
