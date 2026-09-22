import type { ReactNode } from "react";
import Bn from "@/components/i18n/Bn";

/**
 * PageHeader — THE page title block, one per route.
 *
 * The root layout owns the page shell (`<main>` + width + gutters); this
 * component owns the heading: optional eyebrow pill, the ONE `<h1>`, the
 * Bengali line under it, an optional one-sentence lead and (on sm+) an
 * actions slot on the right. Styles live in `app/styles/page-shell.css`
 * (`.page-header`, `.page-h1`, `.page-h1-bn`, `.page-lead`, `.page-eyebrow`).
 *
 * `size="article"` is one type step smaller — for guides, blog posts and
 * other reading pages inside `.page-narrow`.
 *
 * Bengali-first pages (`/blog`, `/share-bazar`) put the Bengali title in
 * `title` and pass an English sub-line as `bn` with `subLang="en"`, so the
 * sub-line is not marked up as Bengali.
 */
type Props = {
  eyebrow?: ReactNode;
  title: ReactNode;
  bn: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  size?: "page" | "article";
  subLang?: "bn" | "en";
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  bn,
  lead,
  actions,
  size = "page",
  subLang = "bn",
  className = "",
}: Props) {
  return (
    <header className={`page-header page-header--${size} ${className}`.trim()}>
      <div className="page-header-main">
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h1 className="page-h1">{title}</h1>
        {subLang === "en" ? (
          <p lang="en" className="page-h1-bn">
            {bn}
          </p>
        ) : (
          <Bn className="page-h1-bn">{bn}</Bn>
        )}
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
