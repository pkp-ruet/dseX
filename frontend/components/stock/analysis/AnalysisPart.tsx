import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { IconChevronRight } from "@/components/ui/icons";
import { ToneChip, tx } from "@/components/stock/report/fmt";
import { PART_ALIASES, PART_ID, type AnalysisPart as Part, type PartKey } from "@/lib/stock-report";

/** Where each part's figures live in the numbers at the bottom (the data
 *  room opens the tab that holds the anchor). */
const NUMBERS: Record<PartKey, { href: string; label: { en: string; bn: string } }> = {
  profit: { href: "#financials", label: { en: "See the numbers", bn: "সংখ্যাগুলো দেখুন" } },
  finances: { href: "#numbers", label: { en: "See the numbers", bn: "সংখ্যাগুলো দেখুন" } },
  business: { href: "#peers", label: { en: "See similar companies", bn: "একই ধরনের কোম্পানি দেখুন" } },
  dividend: { href: "#dividends", label: { en: "See every dividend", bn: "সব ডিভিডেন্ড দেখুন" } },
  price: { href: "#valuation", label: { en: "See the numbers", bn: "সংখ্যাগুলো দেখুন" } },
  safety: { href: "#news", label: { en: "See its notices", bn: "নোটিশগুলো দেখুন" } },
};

/**
 * ONE part of our analysis as a small card (2026-11-24, user: "too much facts,
 * numbers and explanation"): its name and word, the question, the answer in
 * one or two short sentences, one picture, and a link down to the numbers.
 * No number boxes, tick lists, notes or source lines any more: every figure
 * is in the numbers at the bottom of the page.
 */
export default function AnalysisPart({
  part,
  picture,
  extra,
}: {
  part: Part;
  picture?: ReactNode;
  extra?: ReactNode;
}) {
  const id = PART_ID(part.key);
  const more = NUMBERS[part.key];
  return (
    <article id={id} className="stock-anchor soft-card an-pc" aria-labelledby={`${id}-t`}>
      {PART_ALIASES[part.key].map((a) => (
        <span key={a} id={a} className="stock-anchor block" aria-hidden="true" />
      ))}
      <header className="an-pc-head">
        <h3 id={`${id}-t`}>{tx(part.name)}</h3>
        <ToneChip word={part.word} tone={part.measured ? part.tone : "neutral"} />
      </header>
      <p className="an-pc-q">{tx(part.question)}</p>
      <p className="an-pc-a">{tx(part.answer)}</p>
      {picture && <div className="an-pc-pic">{picture}</div>}
      {extra}
      <a href={more.href} className="an-pc-more">
        <T en={more.label.en} bn={more.label.bn} />
        <IconChevronRight size={14} />
      </a>
    </article>
  );
}
