"use client";

import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import Skeleton from "@/components/ui/Skeleton";
import ResearchFunnel from "@/components/research/ResearchFunnel";
import PremiumGate from "@/components/premium/PremiumGate";
import ScreenerStep from "./ScreenerStep";
import type { CustomListResult, CustomListStock } from "@/lib/api";

/**
 * Step 3: the stocks that pass. The count leads; the order and Save sit on
 * one line under it; then the list. A free reader sees the first `freeRows`
 * (none with a power check on); the rest blurs in place and points at the
 * page's one Premium section (`PageLockScope`). How each check narrowed the
 * market is folded underneath — there for the curious, out of everyone's way.
 */
export default function ScreenerResults({
  result,
  running,
  error,
  freeRows,
  powerOn,
  toolbar,
  bn,
  t,
}: {
  result: CustomListResult | null;
  running: boolean;
  error: boolean;
  freeRows: number;
  powerOn: boolean;
  /** Order + Save buttons. */
  toolbar: ReactNode;
  bn: boolean;
  t: (en: string, bn: string) => string;
}) {
  const title = result
    ? t(`${result.passed} ${result.passed === 1 ? "stock passes" : "stocks pass"}`, `${result.passed}টি শেয়ার পাস করেছে`)
    : t("Stocks that pass", "যে শেয়ারগুলো পাস করেছে");

  if (error && !result) {
    return (
      <ScreenerStep n={3} title={title}>
        <p className="text-sm text-text-muted">
          {t("Couldn't run this screen. Change a check or try again.", "স্ক্রিনটি চালানো যায়নি। একটি শর্ত বদলান বা আবার চেষ্টা করুন।")}
        </p>
      </ScreenerStep>
    );
  }
  if (!result) {
    return (
      <ScreenerStep n={3} title={title}>
        <div className="space-y-3"><Skeleton height={40} /><Skeleton height={240} /></div>
      </ScreenerStep>
    );
  }

  const open = result.stocks.slice(0, freeRows);
  const locked = result.stocks.slice(freeRows);
  const more = result.passed - open.length;
  const row = (s: CustomListStock) => (
    <StockRow
      key={s.code}
      as="li"
      inset="card"
      code={s.code}
      name={s.name}
      price={s.price}
      change={s.change_pct}
      sub={s.checks.slice(0, 2).map((c) => t(c.value_en, c.value_bn)).join(" · ")}
      subClamp
      trailing={s.signal !== "none" ? <SignalChip signal={s.signal} size="sm" /> : undefined}
      lang={bn ? "bn" : "en"}
    />
  );

  return (
    <ScreenerStep
      n={3}
      title={title}
      note={t(`out of ${result.universe} rated companies`, `রেটিং পাওয়া ${result.universe}টির মধ্যে`)}
    >
      <div aria-live="polite" className={running ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="mb-3 flex flex-wrap items-center gap-2">{toolbar}</div>

        {result.passed === 0 ? (
          <Card>
            <p className="text-sm text-text-main">
              {t("No company passes every check today.", "আজ কোনো কোম্পানি সব শর্ত পূরণ করছে না।")}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {t("Loosen one setting or remove a check — the funnel below shows which check left none.",
                 "একটি মাত্রা কমান বা একটি শর্ত বাদ দিন — নিচে দেখুন কোন শর্তে সব বাদ পড়েছে।")}
            </p>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            {open.length > 0 && <ul>{open.map(row)}</ul>}
            {locked.length > 0 && (
              <PremiumGate
                label={
                  open.length
                    ? t(`${more} more that pass`, `আরও ${more}টি পাস করেছে`)
                    : powerOn
                      ? t("Stocks that pass a power check", "পাওয়ার শর্ত পেরোনো শেয়ার")
                      : t("The stocks that pass", "যে শেয়ারগুলো পাস করেছে")
                }
                preview="blur"
                peek={open.length ? 140 : 200}
              >
                <ul className={open.length ? "border-t border-border" : undefined}>{locked.map(row)}</ul>
              </PremiumGate>
            )}
            {result.passed > result.stocks.length && (
              <p className="border-t border-border p-4 text-sm text-text-muted">
                {t(`Showing the first ${result.stocks.length} of ${result.passed}. Add a check to narrow it down.`,
                   `${result.passed}টির মধ্যে প্রথম ${result.stocks.length}টি দেখানো হচ্ছে। আরও শর্ত যোগ করে ছোট করুন।`)}
              </p>
            )}
          </Card>
        )}

        <details className="group mt-4" open={result.passed === 0 || undefined}>
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            {t("How each check narrowed it down", "প্রতিটি শর্তে কতগুলো বাদ পড়ল")}
          </summary>
          <Card className="rl-funnel-card mt-2"><ResearchFunnel universe={result.universe} steps={result.funnel} /></Card>
        </details>
      </div>
    </ScreenerStep>
  );
}
