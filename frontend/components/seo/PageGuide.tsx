import type { ReactNode } from "react";
import { T, TBlock } from "@/components/i18n/T";

export interface FaqItem {
  q: string;
  a: string;
  /** Bengali twin of the question and answer. The FAQ JSON-LD always reads the English pair. */
  qBn?: string;
  aBn?: string;
}

/**
 * The "about this page" block every indexable hub page carries under its
 * table: a few hundred words of plain context and a short FAQ in `<details>`
 * (with matching FAQPage JSON-LD unless the page already emits one — pass
 * `faqSchema={false}` then).
 *
 * One language per page (2026-10-28): pass `titleBn` + `introBn` and each FAQ
 * item's `qBn` / `aBn`, and the block shows only the reader's language.
 *
 * Why it exists (2026-09-15): the data pages served 13–94 words of prose
 * around tables of hundreds of rows, so Google had almost nothing to judge
 * them on. It sits *below* the data so the table stays above the fold on a
 * phone. Reuses the rankings page's `.rank-limits` styling so the hubs match.
 */
export default function PageGuide({
  title,
  titleBn,
  intro,
  introBn,
  faq = [],
  faqSchema = true,
  children,
}: {
  title: string;
  titleBn?: string;
  /** Paragraphs of English prose. Keep each to 2–4 sentences. */
  intro: ReactNode[];
  /** The same paragraphs in Bengali. */
  introBn?: ReactNode[];
  faq?: FaqItem[];
  faqSchema?: boolean;
  /** Anything extra (links row, note) rendered after the FAQ. */
  children?: ReactNode;
}) {
  const jsonLd =
    faqSchema && faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const paras = (list: ReactNode[]) =>
    list.map((p, i) => (
      <p key={i} className="page-guide-p">
        {p}
      </p>
    ));

  return (
    <section className="rank-limits page-guide" aria-label={title}>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <h2 className="rank-limits-title">{titleBn ? <T en={title} bn={titleBn} /> : title}</h2>
      {introBn ? (
        <TBlock en={paras(intro)} bn={paras(introBn)} />
      ) : (
        paras(intro)
      )}
      {faq.length > 0 && (
        <div className="page-faq">
          <h3 className="page-faq-title">
            <T en="Common questions" bn="সাধারণ প্রশ্ন" />
          </h3>
          {faq.map((f) => (
            <details key={f.q} className="page-faq-item">
              <summary className="page-faq-q">{f.qBn ? <T en={f.q} bn={f.qBn} /> : f.q}</summary>
              <p className="page-faq-a">{f.aBn ? <T en={f.a} bn={f.aBn} /> : f.a}</p>
            </details>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}
