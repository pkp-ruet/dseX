"use client";

import type { ReactNode } from "react";
import Card from "@/components/ui/Card";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import Skeleton from "@/components/ui/Skeleton";
import RowLock from "@/components/premium/RowLock";
import LockPanel, { type LockTile } from "@/components/premium/LockPanel";
import ScreenerStep from "./ScreenerStep";
import ScreenerNearMisses from "./ScreenerNearMisses";
import { T } from "@/components/i18n/T";
import { strengthPair } from "@/lib/screener";
import type { CustomListResult, CustomListStock, ScreenerQuestion } from "@/lib/api";

/** Locked rows a free reader sees with the company hidden (premium/RowLock). */
const PREVIEW_ROWS = 2;
/** The page's one Premium section (ScreenerPremium). */
const PREMIUM_ANCHOR = "sc-premium";

/**
 * The stocks that pass. Each row says what the stock is strong on
 * across the six questions — not only what you asked for. The count leads;
 * the order and Save sit on one line under it; then the list. A free reader sees the first `freeRows`
 * (none with a power check on); the rest sits behind the shared row lock
 * (2026-10-28): the next rows with the company hidden — strength line and
 * Buy chip shown — then a panel saying what Premium shows, with what's hidden
 * as counts (how many have a Buy signal, the strength most of them share,
 * how many they follow; never names) and a button to the page's one Premium
 * section. Then the stocks that miss by one check (`ScreenerNearMisses`). How many each check leaves is shown on
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

  // What's hidden, as counts (free readers only — for Premium freeRows is Infinity).
  const hiddenTiles: LockTile[] = [];
  let mine = 0;
  if (locked.length && Number.isFinite(freeRows)) {
    const buys = locked.filter((x) => x.signal === "buy").length;
    if (buys) hiddenTiles.push({ value: String(buys), label: { en: buys === 1 ? "has a Buy signal today" : "have a Buy signal today", bn: "আজ কেনার সংকেত" } });
    // The top-level strength most hidden stocks share, skipping one the answers already require.
    let best: { n: number; en: string; bn: string } | null = null;
    for (const q of questions) {
      if ((result.answers?.[q.key] ?? 0) >= 2) continue;
      const lvl = q.levels[2];
      if (!lvl?.tag_en) continue;
      const n = locked.filter((x) => (x.levels?.[q.key] ?? 0) >= 2).length;
      if (n && (!best || n > best.n)) best = { n, en: lvl.tag_en, bn: lvl.tag_bn ?? lvl.tag_en };
    }
    if (best) hiddenTiles.push({ value: String(best.n), label: { en: `marked "${best.en}"`, bn: `"${best.bn}"` } });
    mine = locked.filter((x) => followed.includes(x.code)).length;
  }
  const row = (s: CustomListStock, masked = false) => {
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
      masked={masked}
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
            {open.length > 0 && <ul>{open.map((x) => row(x))}</ul>}
            {locked.length > 0 && (
              <RowLock
                preview={
                  <ul className={open.length ? "border-t border-border" : undefined}>
                    {locked.slice(0, PREVIEW_ROWS).map((x) => row(x, true))}
                  </ul>
                }
                panel={
                  <LockPanel
                    variant="full"
                    inset
                    gutter
                    title={
                      open.length
                        ? { en: `See the companies behind ${more} more that pass`, bn: `পাস করা আরও ${more}টি শেয়ারের কোম্পানি দেখুন` }
                        : powerOn
                          ? { en: `See the ${more} ${more === 1 ? "share" : "shares"} that pass this special check`, bn: `বিশেষ যাচাইয়ে পাস করা ${more}টি শেয়ার দেখুন` }
                          : { en: `See the ${more} ${more === 1 ? "share" : "shares"} that pass`, bn: `পাস করা ${more}টি শেয়ার দেখুন` }
                    }
                    sub={{
                      en: "Premium shows every share that passes your screen, lets you set your own answers and order, and keeps up to five screens that tell you when a new share joins.",
                      bn: "প্রিমিয়ামে আপনার স্ক্রিনে পাস করা প্রতিটি শেয়ার, নিজের উত্তর আর ক্রম বাছাই, আর পাঁচটি পর্যন্ত স্ক্রিন রাখা যায় — নতুন শেয়ার যোগ হলে জানিয়ে দেয়।",
                    }}
                    tiles={hiddenTiles}
                    mine={mine}
                    count={more}
                    lock="Screener: results"
                    what={{ en: "Every share that passes", bn: "পাস করা সব শেয়ার" }}
                    href={`#${PREMIUM_ANCHOR}`}
                  />
                }
              >
                <ul className={open.length ? "border-t border-border" : undefined}>{locked.map((x) => row(x))}</ul>
              </RowLock>
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
