/**
 * "In this guide" list for long reading pages (2026-10 redesign, step 8).
 * Sections are read in order, so they're numbered. Renders nothing for short
 * pieces. Section ids come from `sectionId()` so the article and the list agree.
 */
export function sectionId(heading: string, index: number): string {
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  // Bengali headings have no Latin letters; fall back to the position.
  return slug ? `s-${slug}` : `s-${index + 1}`;
}

export default function ArticleContents({
  headings,
  label = "In this guide",
  bn = false,
}: {
  headings: string[];
  label?: string;
  bn?: boolean;
}) {
  if (headings.length < 4) return null;
  return (
    <nav
      aria-label={label}
      lang={bn ? "bn" : undefined}
      className={`border-y border-border py-4 ${bn ? "font-bn" : ""}`}
    >
      <p className="mb-1 text-xs font-semibold text-text-muted">{label}</p>
      <ol className="grid list-decimal gap-x-6 pl-5 text-sm sm:grid-cols-2">
        {headings.map((h, i) => (
          <li key={h} className="marker:text-text-muted">
            <a href={`#${sectionId(h, i)}`} className="inline-flex min-h-10 items-center text-text-main hover:text-primary-ink">
              {h}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
