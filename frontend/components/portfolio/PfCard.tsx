import type { ReactNode } from "react";
import type { AnalysisLang } from "@/lib/portfolio-analysis";
import Button from "@/components/ui/Button";
import { IconChevronDown } from "@/components/ui/icons";

/** Rows a long list on this page shows before "Show all" (allocation, sectors, what's moving, history). */
export const SHORT_LIST = 5;

/** Whether a list of `n` rows folds — one hidden row isn't worth a tap, so 6 rows stay open. */
export function folds(n: number): boolean {
  return n > SHORT_LIST + 1;
}

/** THE "Show all N …" / "Show fewer" button under a folded list on this page. */
export function PfShowMore({
  open,
  total,
  noun,
  lang = "en",
  onToggle,
}: {
  open: boolean;
  total: number;
  noun: { en: string; bn: string };
  lang?: AnalysisLang;
  onToggle: () => void;
}) {
  const bn = lang === "bn";
  return (
    <Button
      type="button"
      variant="quiet"
      size="sm"
      block
      onClick={onToggle}
      aria-expanded={open}
      className={`pf-more ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
    >
      {open ? (bn ? "কম দেখান" : "Show fewer") : bn ? `সব ${total}টি ${noun.bn} দেখুন` : `Show all ${total} ${noun.en}`}
      <span className="pf-more-chev" data-open={open ? "" : undefined}>
        <IconChevronDown size={16} />
      </span>
    </Button>
  );
}

/**
 * THE card on /portfolio (2026-10-26 redesign, same shape as the
 * market-analysis `MkCard`): `.soft-card` with a plain header — title, its
 * Bengali line (English mode only), one muted note — and an optional control
 * on the right. No icon tiles, no tinted header rows, no coloured edges; the
 * numbers and the meaning dots carry the colour.
 *
 * `title` and `note` arrive already in the reader's language (one language
 * per page, 2026-10-27).
 */
export default function PfCard({
  title,
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
  return (
    <Tag
      className={`soft-card pf-card ${flush ? "pf-card--flush" : ""} ${className}`.replace(/\s+/g, " ").trim()}
      aria-labelledby={title && id ? id : undefined}
      data-card={dataCard}
    >
      {title && (
        <div className="pf-card-head">
          <div className="min-w-0">
            <h3 className="pf-card-title" id={id}>
              {title}
            </h3>
            {note && <p className="pf-card-note">{note}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** A chapter heading: title and one lead line, in the reader's language. */
export function PfChapterHead({
  id,
  title,
  lead,
  right,
}: {
  /** Put on the h2, for the chapter's aria-labelledby. */
  id?: string;
  title: ReactNode;
  lead?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="pf-chapter-head">
      <div className="min-w-0">
        <h2 className="pf-chapter-title" id={id}>{title}</h2>
        {lead && <p className="pf-chapter-lead">{lead}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
