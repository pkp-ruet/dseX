"use client";

import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import Skeleton from "@/components/ui/Skeleton";
import PremiumGate from "@/components/premium/PremiumGate";
import ScreenerStep from "./ScreenerStep";
import ScreenerNearMisses from "./ScreenerNearMisses";
import { strengthLine } from "@/lib/screener";
import type { CustomListResult, CustomListStock, ScreenerQuestion } from "@/lib/api";

/**
 * The stocks that pass. Each row says what the stock is strong on
 * across the six questions — not only what you asked for. The count leads;
 * the order and Save sit on one line under it; then the list. A free reader sees the first `freeRows`
 * (none with a power check on); the rest blurs in place and points at the
 * page's one Premium section (`PageLockScope`). Then the stocks that miss by
 * one check (`ScreenerNearMisses`). Under the blurred rows a free reader
 * gets a short "what's hidden" summary — how many of them have a Buy signal,
 * the strength most of them share, how many they follow — counts only, the
 * names stay locked. How many each check leaves is shown on
 * the checks themselves (step 2), so there is no separate funnel here.
 */
export default function ScreenerResults({
  result,
  running,
  error,
  freeRows,
  powerOn,
  toolbar,
  questions,
  followed,
  onChangeCheck,
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
  questions: ScreenerQuestion[];
  /** The reader's holdings + watchlist codes (for "N are stocks you follow"). */
  followed: string[];
  /** "Change" on the near-miss block: a question key, or a check key on a fine-tune screen. */
  onChangeCheck: (key: string, by: "question" | "check") => void;
  bn: boolean;
  t: (en: string, bn: string) => string;
}) {
  const title = result
    ? t(`${result.passed} ${result.passed === 1 ? "stock passes" : "stocks pass"}`, `${result.passed}টি শেয়ার পাস করেছে`)
    : t("Stocks that pass", "যে শেয়ারগুলো পাস করেছে");

  if (error && !result) {
    return (
      <ScreenerStep title={title}>
        <p className="text-sm text-text-muted">
          {t("Couldn't run this screen. Change a check or try again.", "স্ক্রিনটি চালানো যায়নি। একটি শর্ত বদলান বা আবার চেষ্টা করুন।")}
        </p>
      </ScreenerStep>
    );
  }
  if (!result) {
    return (
      <ScreenerStep title={title}>
        <div className="space-y-3"><Skeleton height={40} /><Skeleton height={240} /></div>
      </ScreenerStep>
    );
  }

  const open = result.stocks.slice(0, freeRows);
  const locked = result.stocks.slice(freeRows);
  const more = result.passed - open.length;

  // What's hidden, in up to three lines (free readers only — for Premium freeRows is Infinity).
  const hiddenLines: string[] = [];
  if (locked.length && Number.isFinite(freeRows)) {
    const buys = locked.filter((x) => x.signal === "buy").length;
    if (buys) hiddenLines.push(t(`${buys} ${buys === 1 ? "has" : "have"} a Buy signal today`, `${buys}টিতে আজ 'কিনুন' সংকেত`));
    // The top-level strength most hidden stocks share, skipping one the answers already require.
    let best: { n: number; en: string; bn: string } | null = null;
    for (const q of questions) {
      if ((result.answers?.[q.key] ?? 0) >= 2) continue;
      const lvl = q.levels[2];
      if (!lvl?.tag_en) continue;
      const n = locked.filter((x) => (x.levels?.[q.key] ?? 0) >= 2).length;
      if (n && (!best || n > best.n)) best = { n, en: lvl.tag_en, bn: lvl.tag_bn ?? lvl.tag_en };
    }
    if (best) hiddenLines.push(t(`${best.n} marked "${best.en}"`, `${best.n}টি "${best.bn}"`));
    const mine = locked.filter((x) => followed.includes(x.code)).length;
    if (mine) hiddenLines.push(t(`${mine} ${mine === 1 ? "is a stock" : "are stocks"} you follow`, `${mine}টি আপনার অনুসরণ করা শেয়ার`));
  }
  const row = (s: CustomListStock) => (
    <StockRow
      key={s.code}
      as="li"
      inset="card"
      code={s.code}
      name={s.name}
      price={s.price}
      change={s.change_pct}
      sub={strengthLine(s.levels, questions, t) || s.checks.slice(0, 2).map((c) => t(c.value_en, c.value_bn)).join(" · ")}
      subClamp
      trailing={s.signal !== "none" ? <SignalChip signal={s.signal} size="sm" /> : undefined}
      lang={bn ? "bn" : "en"}
    />
  );

  return (
    <ScreenerStep
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
              {result.answers
                ? t("Pick an easier choice on one question — the number under each choice shows how many you'd get.",
                    "একটি প্রশ্নে সহজ উত্তর বাছুন — প্রতিটি উত্তরের নিচের সংখ্যা দেখায় কতগুলো পাবেন।")
                : t("Loosen one setting or remove a rule — the counts beside each rule show where the list ran out.",
                    "একটি মাত্রা কমান বা একটি নিয়ম বাদ দিন — প্রতিটি নিয়মের পাশের সংখ্যা দেখায় কোথায় তালিকা শেষ হয়েছে।")}
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
            {locked.length > 0 && hiddenLines.length > 0 && (
              <a
                href="#sc-premium"
                className="block border-t border-border px-4 py-3 hover:bg-surface-2 active:bg-surface-2"
                aria-label={t(`What's hidden: ${hiddenLines.join(", ")}. See Premium.`, `যা লুকানো: ${hiddenLines.join(", ")}। প্রিমিয়াম দেখুন।`)}
              >
                <p className="text-sm text-text-muted">{t("Among the hidden ones:", "লুকানোগুলোর মধ্যে:")}</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {hiddenLines.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm font-semibold text-text-main">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </a>
            )}
            {result.passed > result.stocks.length && (
              <p className="border-t border-border p-4 text-sm text-text-muted">
                {t(`Showing the first ${result.stocks.length} of ${result.passed}. Add a check to narrow it down.`,
                   `${result.passed}টির মধ্যে প্রথম ${result.stocks.length}টি দেখানো হচ্ছে। আরও শর্ত যোগ করে ছোট করুন।`)}
              </p>
            )}
          </Card>
        )}

        {result.near && <ScreenerNearMisses near={result.near} questions={questions} onChange={onChangeCheck} bn={bn} t={t} />}
      </div>
    </ScreenerStep>
  );
}
