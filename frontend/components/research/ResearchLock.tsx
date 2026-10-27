"use client";

import type { ReactNode } from "react";
import PremiumGate from "@/components/premium/PremiumGate";
import { usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";

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
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const mine = codes.filter((c) => portfolio.has(c) || watchlist.has(c)).length;
  const stakes = [
    { en: `${passed} shares passed all ${checks} checks`, bn: `${passed}টি শেয়ার ${checks}টি যাচাইয়েই পাস করেছে` },
    mine > 0 ? { en: `You own or follow ${mine} of them`, bn: `এর মধ্যে ${mine}টি আপনার কেনা বা ওয়াচলিস্টে আছে` } : null,
    { en: "Every share side by side, and who joined or left", bn: "সব শেয়ার পাশাপাশি, আর কে যোগ হলো ও কে বাদ পড়ল" },
  ].filter((s): s is { en: string; bn: string } => s != null);

  return (
    <PremiumGate label={{ en: "The full research list", bn: "পুরো গবেষণা তালিকা" }} preview="blur" peek={220} stakes={stakes}>
      {children}
    </PremiumGate>
  );
}
