import { Fragment, type ReactNode } from "react";

/**
 * Minimal, dependency-free markdown for the deep-analysis report bodies.
 *
 * The report writer only ever emits three things (see the deep-stock-analysis
 * skill): blank-line-separated paragraphs, `- ` bullet lists (bull/bear cases),
 * and inline `**bold**`. We render exactly those — no library needed, and no
 * `dangerouslySetInnerHTML`, so the bilingual content stays safe to render.
 */

/** Split a line on `**bold**` runs into <strong> + text nodes. */
function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    if (m) {
      return (
        <strong key={`${keyBase}-b${i}`} style={{ fontWeight: 600 }}>
          {m[1]}
        </strong>
      );
    }
    return <Fragment key={`${keyBase}-t${i}`}>{part}</Fragment>;
  });
}

interface Props {
  text: string;
  className?: string;
}

export default function Markdown({ text, className }: Props) {
  const blocks = (text || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((l) => l.startsWith("- "));

        if (isList) {
          return (
            <ul key={`ul-${bi}`} className="list-disc pl-5 space-y-2 my-3">
              {lines.map((l, li) => (
                <li key={`li-${bi}-${li}`} className="leading-relaxed">
                  {inline(l.replace(/^-\s+/, ""), `li-${bi}-${li}`)}
                </li>
              ))}
            </ul>
          );
        }

        // A paragraph may still carry hard line breaks — keep them as <br/>.
        return (
          <p key={`p-${bi}`} className="leading-relaxed my-3 first:mt-0 last:mb-0">
            {lines.map((l, li) => (
              <Fragment key={`p-${bi}-${li}`}>
                {li > 0 && <br />}
                {inline(l, `p-${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
