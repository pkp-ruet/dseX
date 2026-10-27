import type { ReactNode } from "react";
import type { Lang } from "@/lib/lang";

/**
 * One piece of copy in both languages. Both halves are in the HTML; CSS shows
 * the one that matches `<html data-lang>` (set before first paint by the boot
 * script in `app/layout.tsx`, flipped by the navbar switch). No hooks, so it
 * works in server and client components alike, and the switch needs no
 * re-render.
 *
 * Write the copy to `docs/voice.md`. Numbers inside Bengali stay Western
 * digits (12%, ৳45.6).
 */
export function T({ en, bn }: { en: ReactNode; bn: ReactNode }) {
  if (typeof en === "string" && en === bn) return <>{en}</>;
  return (
    <>
      <span data-l="en" lang="en">
        {en}
      </span>
      <span data-l="bn" lang="bn">
        {bn}
      </span>
    </>
  );
}

/** Block-level twin of `T` — for copy that holds paragraphs or lists. */
export function TBlock({
  en,
  bn,
  className = "",
}: {
  en: ReactNode;
  bn: ReactNode;
  className?: string;
}) {
  return (
    <>
      <div data-l="en" lang="en" className={className || undefined}>
        {en}
      </div>
      <div data-l="bn" lang="bn" className={className || undefined}>
        {bn}
      </div>
    </>
  );
}

/**
 * Bridge for builders that already take a language — `both((l) => t(l, "key"))`
 * renders both results as a `T`.
 */
export function both(fn: (lang: Lang) => ReactNode) {
  return <T en={fn("en")} bn={fn("bn")} />;
}

/** Pick one half of a pair — for attributes, toasts and logic (`useLang()`). */
export function pick<V>(lang: Lang, en: V, bn: V): V {
  return lang === "bn" ? bn : en;
}
