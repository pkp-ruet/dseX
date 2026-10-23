import type { ReactNode } from "react";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * One of the stock page's five chapters (2026-10 redesign): Overview · Health ·
 * Price and value · Profits and dividends · Company and news. A hairline and
 * space separate chapters; the sections inside keep their own h3 headers.
 * The `id` is what the sticky chip row jumps to.
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
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="stock-anchor stock-chapter">
      <SectionHeader id={`${id}-h`} title={title} bn={bn} lead={lead} size="lg" className="mb-5" />
      <div className="stock-chapter-body">{children}</div>
    </section>
  );
}
