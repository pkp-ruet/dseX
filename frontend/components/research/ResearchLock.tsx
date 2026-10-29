"use client";

import type { ReactNode } from "react";
import RowLock from "@/components/premium/RowLock";
import LockPanel, { type LockTile } from "@/components/premium/LockPanel";
import type { ResearchStock } from "@/lib/api";

/**
 * The research list's Premium lock (2026-10-28, the shared row lock): a free
 * reader sees the first research card with the company hidden — why it is on
 * the list, its grade and signal, its figures, the one risk, its number on
 * every check — then a panel saying what the full list holds, with counts
 * from it (Buy signals, priced below our fair value, the reader's own).
 * The cards, the comparison table and what changed stay in the HTML.
 */
export default function ResearchLock({ children, preview, stocks, passed, checks }: {
  children: ReactNode;
  /** The first card, masked. */
  preview: ReactNode;
  stocks: ResearchStock[];
  /** Stocks that passed every check. */
  passed: number;
  checks: number;
}) {
  const buys = stocks.filter((s) => s.signal === "buy").length;
  const cheap = stocks.filter((s) => s.fair_value?.stance === "cheap").length;
  const tiles: LockTile[] = [
    buys > 0 ? { value: String(buys), label: { en: buys === 1 ? "has a Buy signal" : "have a Buy signal", bn: "কেনার সংকেত" } } : null,
    cheap > 0 ? { value: String(cheap), label: { en: "priced below our fair value", bn: "দাম আমাদের ন্যায্য দামের নিচে" } } : null,
  ].filter((t): t is LockTile => t != null);

  return (
    <RowLock
      preview={preview}
      panel={
        <LockPanel job="find"
          variant="full"
          title={{
            en: `See the ${passed} ${passed === 1 ? "company" : "companies"} that pass all ${checks} checks`,
            bn: `${checks}টি যাচাইয়েই পাস করা ${passed}টি কোম্পানি দেখুন`,
          }}
          sub={{
            en: "Premium shows every company on this list: why it is here, its fair-value range, the one thing that could go wrong, all of them side by side, and who joined or left this month.",
            bn: "প্রিমিয়ামে এই তালিকার প্রতিটি কোম্পানি: কেন এখানে, ন্যায্য দামের সীমা, যে একটি ঝুঁকি আছে, সব পাশাপাশি, আর এ মাসে কে যোগ হলো ও কে বাদ পড়ল।",
          }}
          tiles={tiles}
          codes={stocks.map((s) => s.code)}
          count={passed}
          cta={{ en: "See the full list with Premium", bn: "প্রিমিয়ামে পুরো তালিকা দেখুন" }}
          lock="Research list"
          what={{ en: "The full research list", bn: "পুরো গবেষণা তালিকা" }}
        />
      }
    >
      {children}
    </RowLock>
  );
}
