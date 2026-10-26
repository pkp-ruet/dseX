import type { ReactNode } from "react";
import Bn from "@/components/i18n/Bn";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/**
 * THE card on /portfolio (2026-10-26 redesign, same shape as the
 * market-analysis `MkCard`): `.soft-card` with a plain header — title, its
 * Bengali line (English mode only), one muted note — and an optional control
 * on the right. No icon tiles, no tinted header rows, no coloured edges; the
 * numbers and the meaning dots carry the colour.
 *
 * `title` and `note` arrive already in the reader's language; `bn` is the
 * Bengali title, shown as a sub-line only when the page is in English.
 */
export default function PfCard({
  title,
  bn,
  note,
  right,
  id,
  lang = "en",
  flush = false,
  as: Tag = "section",
  className = "",
  dataCard,
  children,
}: {
  title?: ReactNode;
  bn?: ReactNode;
  note?: ReactNode;
  right?: ReactNode;
  /** Put on the title, for aria-labelledby. */
  id?: string;
  lang?: AnalysisLang;
  /** No body padding — for lists whose rows carry their own (the header keeps its padding). */
  flush?: boolean;
  as?: "section" | "div" | "article";
  className?: string;
  dataCard?: string;
  children: ReactNode;
}) {
  const isBn = lang === "bn";
  return (
    <Tag
      className={`soft-card pf-card ${flush ? "pf-card--flush" : ""} ${className}`.replace(/\s+/g, " ").trim()}
      aria-labelledby={title && id ? id : undefined}
      data-card={dataCard}
    >
      {title && (
        <div className="pf-card-head">
          <div className={`min-w-0 ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
            <h3 className="pf-card-title" id={id}>
              {title}
            </h3>
            {bn && !isBn && <Bn className="pf-card-bn">{bn}</Bn>}
            {note && <p className="pf-card-note">{note}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** A chapter heading: title, Bengali line (English mode), one lead line. */
export function PfChapterHead({
  id,
  title,
  bn,
  lead,
  lang = "en",
  right,
}: {
  /** Put on the h2, for the chapter's aria-labelledby. */
  id?: string;
  title: string;
  bn: string;
  lead?: string;
  lang?: AnalysisLang;
  right?: ReactNode;
}) {
  const isBn = lang === "bn";
  return (
    <div className="pf-chapter-head">
      <div className={`min-w-0 ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
        <h2 className="pf-chapter-title" id={id}>{title}</h2>
        {!isBn && <Bn className="pf-chapter-bn">{bn}</Bn>}
        {lead && <p className="pf-chapter-lead">{lead}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
