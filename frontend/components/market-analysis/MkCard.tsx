import type { ReactNode } from "react";

/**
 * The one card on /market-analysis (2026-10-25 redesign): `.soft-card` with
 * a plain header — title, one muted note — and an optional control on the
 * right. No icon tiles, no tinted bars; the content carries the colour.
 * Pass `<T en bn />` for the title and note so the card reads in one language.
 */
export default function MkCard({
  title,
  note,
  right,
  id,
  as: Tag = "section",
  className = "",
  children,
}: {
  title?: ReactNode;
  note?: ReactNode;
  right?: ReactNode;
  /** Put on the title, for aria-labelledby. */
  id?: string;
  as?: "section" | "div" | "article";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`soft-card mk-card ${className}`.trim()} aria-labelledby={title && id ? id : undefined}>
      {title && (
        <div className="mk-card-head">
          <div className="min-w-0">
            <h3 className="mk-card-title" id={id}>
              {title}
            </h3>
            {note && <p className="mk-card-note">{note}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
