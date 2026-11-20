import type { ReactNode } from "react";
import PlaceTrail from "@/components/places/PlaceTrail";

/**
 * PageHeader — THE page title block, one per route.
 *
 * The root layout owns the page shell (`<main>` + width + gutters); this
 * component owns the heading: optional eyebrow, the ONE `<h1>`, an optional
 * one-sentence lead and (on sm+) an actions slot on the right. Pass `<T en bn />`
 * for the title and lead so the page reads in one language (docs/voice.md). Styles live in `app/styles/page-shell.css`
 * (`.page-header`, `.page-h1`, `.page-lead`, `.page-eyebrow`).
 *
 * Every page inside a place gets the back link to that place (`PlaceTrail`,
 * 2026-11-20) above its eyebrow.
 *
 * `size="article"` is one type step smaller — for guides, blog posts and
 * other reading pages inside `.page-narrow`.
 */
type Props = {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  size?: "page" | "article";
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  size = "page",
  className = "",
}: Props) {
  return (
    <header className={`page-header page-header--${size} ${className}`.trim()}>
      <div className="page-header-main">
        {/* "‹ Market" back to the page's place (lib/places.ts); nothing elsewhere. */}
        <PlaceTrail />
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h1 className="page-h1">{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
