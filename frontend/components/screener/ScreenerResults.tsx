"use client";

import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import Skeleton from "@/components/ui/Skeleton";
import PremiumGate from "@/components/premium/PremiumGate";
import ScreenerStep from "./ScreenerStep";
import ScreenerNearMisses from "./ScreenerNearMisses";
import { T } from "@/components/i18n/T";
import { strengthPair } from "@/lib/screener";
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
  t: (en: string, bn: string) => string;
}) {
  const title = result ? (
    <T en={`${result.passed} ${result.passed === 1 ? "share passes" : "shares pass"}`} bn={`${result.passed}টি শেয়ার পাস করেছে`} />
  ) : (
    <T en="Shares that pass" bn="যে শেয়ারগুলো পাস করেছে" />
  );

  if (error && !result) {
    return (
      <ScreenerStep title={title}>
        <p className="text-sm text-text-muted">
          <T
            en="We couldn't run this screen. Please change an answer or try again."
            bn="স্ক্রিনটি চালানো যায়নি। একটি উত্তর বদলান বা আবার চেষ্টা করুন।"
          />
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
  const hiddenLines: { en: string; bn: string }[] = [];
  if (locked.length && Number.isFinite(freeRows)) {
    const buys = locked.filter((x) => x.signal === "buy").length;
    if (buys) hiddenLines.push({ en: `${buys} ${buys === 1 ? "has" : "have"} a Buy signal today`, bn: `${buys}টিতে আজ কেনার সংকেত আছে` });
    // The top-level strength most hidden stocks share, skipping one the answers already require.
    let best: { n: number; en: string; bn: string } | null = null;
    for (const q of questions) {
      if ((result.answers?.[q.key] ?? 0) >= 2) continue;
      const lvl = q.levels[2];
      if (!lvl?.tag_en) continue;
      const n = locked.filter((x) => (x.levels?.[q.key] ?? 0) >= 2).length;
      if (n && (!best || n > best.n)) best = { n, en: lvl.tag_en, bn: lvl.tag_bn ?? lvl.tag_en };
    }
    if (best) hiddenLines.push({ en: `${best.n} marked "${best.en}"`, bn: `${best.n}টি "${best.bn}"` });
    const mine = locked.filter((x) => followed.includes(x.code)).length;
    if (mine) hiddenLines.push({ en: `${mine} ${mine === 1 ? "is a share" : "are shares"} you follow`, bn: `${mine}টি আপনার অনুসরণ করা শেয়ার` });
  }
  const row = (s: CustomListStock) => {
    const strong = strengthPair(s.levels, questions);
    const figures = s.checks.slice(0, 2);
    return (
    <StockRow
      key={s.code}
      as="li"
      inset="card"
      code={s.code}
      name={s.name}
      price={s.price}
      change={s.change_pct}
      sub={
        strong.en ? (
          <T en={strong.en} bn={strong.bn} />
        ) : (
          <T en={figures.map((c) => c.value_en).join(" · ")} bn={figures.map((c) => c.value_bn).join(" · ")} />
        )
      }
      subClamp
      trailing={s.signal !== "none" ? <SignalChip signal={s.signal} size="sm" /> : undefined}
    />
    );
  };

  return (
    <ScreenerStep
      title={title}
      note={<T en={`out of ${result.universe} rated companies`} bn={`রেটিং পাওয়া ${result.universe}টি কোম্পানির মধ্যে`} />}
    >
      <div aria-live="polite" className={running ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="mb-3 flex flex-wrap items-center gap-2">{toolbar}</div>

        {result.passed === 0 ? (
          <Card>
            <p className="text-sm text-text-main">
              <T en="No company passes every check today." bn="আজ কোনো কোম্পানি সব যাচাইয়ে পাস করেনি।" />
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {result.answers ? (
                <T
                  en="Try an easier choice on one question. The number under each choice shows how many you would get."
                  bn="একটি প্রশ্নে সহজ কোনো উত্তর বাছুন। প্রতিটি উত্তরের নিচের সংখ্যা দেখায় কতগুলো পাবেন।"
                />
              ) : (
                <T
                  en="Loosen one setting or remove a rule. The count beside each rule shows where the list ran out."
                  bn="একটি মাত্রা শিথিল করুন বা একটি নিয়ম বাদ দিন। প্রতিটি নিয়মের পাশের সংখ্যা দেখায় তালিকা কোথায় শেষ হয়েছে।"
                />
              )}
            </p>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            {open.length > 0 && <ul>{open.map(row)}</ul>}
            {locked.length > 0 && (
              <PremiumGate
                label={
                  open.length
                    ? { en: `${more} more that pass`, bn: `আরও ${more}টি পাস করেছে` }
                    : powerOn
                      ? { en: "Shares that pass a special check", bn: "বিশেষ যাচাইয়ে পাস করা শেয়ার" }
                      : { en: "The shares that pass", bn: "যে শেয়ারগুলো পাস করেছে" }
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
                aria-label={t(
                  `What is hidden: ${hiddenLines.map((l) => l.en).join(", ")}. See Premium.`,
                  `যা লুকানো: ${hiddenLines.map((l) => l.bn).join(", ")}। প্রিমিয়াম দেখুন।`,
                )}
              >
                <p className="text-sm text-text-muted">
                  <T en="Among the hidden ones:" bn="লুকানোগুলোর মধ্যে:" />
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {hiddenLines.map((line) => (
                    <li key={line.en} className="flex items-start gap-2 text-sm font-semibold text-text-main">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>
                        <T en={line.en} bn={line.bn} />
                      </span>
                    </li>
                  ))}
                </ul>
              </a>
            )}
            {result.passed > result.stocks.length && (
              <p className="border-t border-border p-4 text-sm text-text-muted">
                <T
                  en={`Showing the first ${result.stocks.length} of ${result.passed}. A stricter answer narrows it down.`}
                  bn={`${result.passed}টির মধ্যে প্রথম ${result.stocks.length}টি দেখানো হচ্ছে। আরও কড়া উত্তর দিলে তালিকা ছোট হবে।`}
                />
              </p>
            )}
          </Card>
        )}

        {result.near && <ScreenerNearMisses near={result.near} questions={questions} onChange={onChangeCheck} t={t} />}
      </div>
    </ScreenerStep>
  );
}
