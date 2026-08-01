import type { ElementType, ReactNode } from "react";

/**
 * One line of Bengali. Sets `lang="bn"` and the `.font-bn` webfont, because the
 * Latin UI fonts carry no Bengali glyphs and Bengali set in them renders as
 * boxes.
 *
 * Use it for the explanation line that follows English copy. Numbers inside
 * Bengali prose must be Western digits (9টি, +6.1%) — the Bengali numeral glyphs
 * don't render reliably on all devices here.
 */
export default function Bn({
  children,
  as: Tag = "p",
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}) {
  return (
    <Tag lang="bn" className={`font-bn ${className}`.trim()}>
      {children}
    </Tag>
  );
}
