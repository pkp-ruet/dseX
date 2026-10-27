"use client";

import type { ReactNode } from "react";
import PremiumGate from "@/components/premium/PremiumGate";

type Pair = { en: string; bn: string };

/**
 * `PremiumGate` for the calendar boards, which are server components: label
 * and stakes go in as `{en, bn}` pairs, which the gate renders without a
 * language flash. The locked rows themselves arrive as `children`.
 */
export default function CalendarLock({
  label,
  stakes = [],
  className,
  peek,
  compact,
  children,
}: {
  label: Pair;
  stakes?: (Pair | null)[];
  className?: string;
  peek?: number;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <PremiumGate
      label={label}
      preview="blur"
      peek={peek}
      compact={compact}
      stakes={stakes.filter((s): s is Pair => s != null)}
      className={className}
    >
      {children}
    </PremiumGate>
  );
}
