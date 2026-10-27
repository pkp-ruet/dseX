import type { ElementType } from "react";

/**
 * One piece of research-list copy in both languages, inside the element of
 * your choice (`as`). Like `<T>`: both halves are in the HTML and CSS shows
 * the one that matches `<html data-lang>`, so it renders the same on the
 * server and needs no hook.
 */
export function Txt({ en, bn, as: Tag = "span", className = "" }: {
  en: string;
  bn: string;
  as?: ElementType;
  className?: string;
}) {
  const cls = className || undefined;
  if (en === bn) return <Tag className={cls}>{en}</Tag>;
  return (
    <>
      <Tag data-l="en" lang="en" className={cls}>
        {en}
      </Tag>
      <Tag data-l="bn" lang="bn" className={cls}>
        {bn}
      </Tag>
    </>
  );
}
