import type { ReactNode } from "react";
import Bn from "@/components/i18n/Bn";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * The "about this page" block every indexable hub page carries under its
 * table: a few hundred words of plain-English context, one Bengali line, and a
 * short FAQ in `<details>` (with matching FAQPage JSON-LD unless the page
 * already emits one — pass `faqSchema={false}` then).
 *
 * Why it exists (2026-09-15): the data pages served 13–94 words of prose
 * around tables of hundreds of rows, so Google had almost nothing to judge
 * them on. It sits *below* the data so the table stays above the fold on a
 * phone. Reuses the rankings page's `.rank-limits` styling so the hubs match.
 */
export default function PageGuide({
  title,
  intro,
  bn,
  faq = [],
  faqSchema = true,
  children,
}: {
  title: string;
  /** Paragraphs of English prose. Keep each to 2–4 sentences. */
  intro: ReactNode[];
  /** One simple Bengali line under the prose. */
  bn?: string;
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

  return (
    <section className="rank-limits page-guide" aria-label={title}>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <h2 className="rank-limits-title">{title}</h2>
      {intro.map((p, i) => (
        <p key={i} className="page-guide-p">
          {p}
        </p>
      ))}
      {bn && <Bn className="page-guide-bn">{bn}</Bn>}
      {faq.length > 0 && (
        <div className="page-faq">
          <h3 className="page-faq-title">Common questions</h3>
          {faq.map((f) => (
            <details key={f.q} className="page-faq-item">
              <summary className="page-faq-q">{f.q}</summary>
              <p className="page-faq-a">{f.a}</p>
            </details>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}
