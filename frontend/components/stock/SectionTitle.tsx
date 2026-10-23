import type { ReactNode } from "react";
import SectionHeader from "@/components/ui/SectionHeader";

interface Props {
  /** English section headline, plain words (e.g. "The Health Check"). */
  title: string;
  /** One English sentence under it. */
  sub?: ReactNode;
  /** One simple Bengali line explaining the section. */
  bn?: string;
  /** Right-hand slot (a toggle, a link). */
  right?: ReactNode;
  className?: string;
}

/**
 * A section heading inside a stock-page chapter. Since the 2026-10 redesign the
 * page is five chapters (`StockChapter`, h2) and every section in them is an
 * h3 drawn by the shared `SectionHeader`. The props stay the same so the
 * section components don't change.
 */
export default function SectionTitle({ title, sub, bn, right, className = "" }: Props) {
  return <SectionHeader as="h3" title={title} bn={bn} lead={sub} action={right} className={className} />;
}
