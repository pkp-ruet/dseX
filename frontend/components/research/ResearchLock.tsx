"use client";

import type { ReactNode } from "react";
import PremiumGate from "@/components/premium/PremiumGate";
import { usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import { useLang } from "@/context/LangContext";

/**
 * The research list's Premium lock: the rest of the cards, the comparison
 * table and what changed. The stakes on the lock card are counts only — how
 * many stocks passed, and how many of them the reader owns or follows (the
 * names stay behind the lock).
 */
export default function ResearchLock({ children, passed, codes, checks }: {
  children: ReactNode;
  /** Stocks that passed every check. */
  passed: number;
  /** Codes on the list (to count the reader's own). */
  codes: string[];
  checks: number;
}) {
  const { bn } = useLang();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const mine = codes.filter((c) => portfolio.has(c) || watchlist.has(c)).length;
  const stakes = [
    bn ? `${passed}টি শেয়ার ${checks}টি যাচাইয়েই পাস করেছে` : `${passed} stocks passed all ${checks} checks`,
    mine > 0 ? (bn ? `এর মধ্যে ${mine}টি আপনার কেনা বা নজরে রাখা` : `${mine} of them you own or follow`) : "",
    bn ? "সবার সংখ্যা পাশাপাশি, আর কে যোগ হলো, কে বাদ পড়ল" : "Every stock side by side, and who joined or left",
  ].filter(Boolean);

  return (
    <PremiumGate label={bn ? "পুরো গবেষণা তালিকা" : "The full research list"} preview="blur" peek={220} stakes={stakes}>
      {children}
    </PremiumGate>
  );
}
