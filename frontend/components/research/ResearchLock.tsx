"use client";

import type { ReactNode } from "react";
import RowLock from "@/components/premium/RowLock";
import LockPanel, { type LockTile } from "@/components/premium/LockPanel";
import type { ResearchStock } from "@/lib/api";

/**
 * The research list's Premium lock (2026-10-28, the shared row lock; since
 * 2026-10-29 it starts after the free top three): a free reader sees the next
 * research card with the company hidden — why it is on the list, its grade
 * and signal, its figures, the one risk, its number on every check — then a
 * panel saying what the rest holds, with counts from the hidden cards (Buy
 * signals, priced below our fair value, the reader's own). With nothing
 * hidden past the top three, the lock holds only the side-by-side table and
 * what changed. Everything stays in the HTML.
 */
export default function ResearchLock({ children, preview, stocks, passed, hidden, checks }: {
  children: ReactNode;
  /** The next card, masked. */
  preview: ReactNode;
  /** The hidden cards (past the free top three). */
  stocks: ResearchStock[];
  /** Stocks that passed every check. */
  passed: number;
  /** How many of them are past the free top three. */
  hidden: number;
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
          title={
            hidden > 0
              ? {
                  en: `See the other ${hidden} ${hidden === 1 ? "company" : "companies"} that pass all ${checks} checks`,
                  bn: `${checks}টি যাচাইয়েই পাস করা বাকি ${hidden}টি কোম্পানি দেখুন`,
                }
              : {
                  en: `See all ${passed} side by side, and who joined or left this month`,
                  bn: `সব ${passed}টি পাশাপাশি দেখুন, আর এ মাসে কে যোগ হলো ও কে বাদ পড়ল`,
                }
          }
          sub={{
            en: "Premium shows every company on this list: why it is here, its fair-value range, the one thing that could go wrong, all of them side by side, and who joined or left this month.",
            bn: "প্রিমিয়ামে এই তালিকার প্রতিটি কোম্পানি: কেন এখানে, ন্যায্য দামের সীমা, যে একটি ঝুঁকি আছে, সব পাশাপাশি, আর এ মাসে কে যোগ হলো ও কে বাদ পড়ল।",
          }}
          tiles={tiles}
          codes={stocks.map((s) => s.code)}
          count={hidden}
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
