"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import { IconChevronDown } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";

/** Fired by the chapter chips (StockSectionNav) so a folded chapter opens
 *  before the page scrolls to it. `detail.id` = the chapter id. */
export const OPEN_CHAPTER_EVENT = "dsex:chapter-open";

/**
 * One of the stock page's five chapters (2026-10 redesign): Overview · Health ·
 * Price and value · Profits and dividends · Company and news. A hairline and
 * space separate chapters; the sections inside keep their own h3 headers.
 * The `id` is what the sticky chip row jumps to.
 *
 * Below 640px a chapter starts folded (2026-10-25): its title and the one-line
 * `lead` are the summary, and "Open" shows the rest. The body is always in the
 * HTML (CSS hides it), so search engines read the whole page. A chapter opens
 * by itself when a chip jumps to it or the URL's #hash points inside it
 * (pushes link to #results / #score-history). From 640px up nothing folds.
 */
export default function StockChapter({
  id,
  title,
  bn,
  lead,
  children,
}: {
  id: string;
  title: string;
  bn: string;
  /** One sentence of plain facts about this stock for the chapter. */
  lead?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { bn: isBn } = useLang();

  useEffect(() => {
    const openFor = (target: Element | null, scroll: boolean) => {
      const el = ref.current;
      if (!el || !target || !el.contains(target)) return;
      setOpen(true);
      // The target was display:none when the browser tried to scroll to it.
      if (scroll && target !== el) requestAnimationFrame(() => target.scrollIntoView());
    };
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (h) openFor(document.getElementById(h), true);
    };
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<{ id: string }>).detail?.id === id) setOpen(true);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener(OPEN_CHAPTER_EVENT, onOpen);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener(OPEN_CHAPTER_EVENT, onOpen);
    };
  }, [id]);

  const toggle = (
    <button
      type="button"
      className="stock-chapter-toggle"
      aria-expanded={open}
      aria-controls={`${id}-body`}
      onClick={() => setOpen((v) => !v)}
    >
      <span className={isBn ? "font-bn" : undefined} lang={isBn ? "bn" : undefined}>
        {open ? (isBn ? "বন্ধ করুন" : "Close") : isBn ? "খুলুন" : "Open"}
      </span>
      <IconChevronDown size={16} />
    </button>
  );

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${id}-h`}
      className="stock-anchor stock-chapter"
      data-folded={open ? "false" : "true"}
    >
      <SectionHeader id={`${id}-h`} title={title} bn={bn} lead={lead} size="lg" action={toggle} className="mb-5" />
      <div id={`${id}-body`} className="stock-chapter-body">{children}</div>
    </section>
  );
}
