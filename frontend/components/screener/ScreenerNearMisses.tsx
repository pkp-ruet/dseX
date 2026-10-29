"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import RowLock from "@/components/premium/RowLock";
import LockPanel from "@/components/premium/LockPanel";
import { T } from "@/components/i18n/T";
import { strengthPair } from "@/lib/screener";
import type { CustomListNear, CustomListNearStock, ScreenerQuestion } from "@/lib/api";

/**
 * "Almost passed": the stocks that miss exactly one of the six answers (or,
 * on a fine-tune screen, one exact check — never the sector). Free: how many, and how many each check holds back, with
 * a button that opens that check's settings — loosening the right check is
 * the useful move. Premium: which stocks, and the figure that missed. A free
 * reader sees the first two with the company hidden (the miss and the
 * strengths shown) and one line pointing at the page's Premium section.
 */
export default function ScreenerNearMisses({
  near,
  questions,
  onChange,
  t,
}: {
  near: CustomListNear;
  questions: ScreenerQuestion[];
  /** Jumps to that question, or opens that check's settings. */
  onChange: (key: string, by: "question" | "check") => void;
  t: (en: string, bn: string) => string;
}) {
  if (!near.total) return null;
  const n = near.total;
  const by = near.by ?? "check";
  const row = (s: CustomListNearStock, masked = false) => {
    const strong = strengthPair(s.levels, questions);
    const miss = {
      en: `Misses ${s.miss.label_en}: ${s.miss.value_en}`,
      bn: `বাদ পড়েছে ${s.miss.label_bn}: ${s.miss.value_bn}`,
    };
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
        <T
          en={[miss.en, strong.en].filter(Boolean).join(" · ")}
          bn={[miss.bn, strong.bn].filter(Boolean).join(" · ")}
        />
      }
      subTone="watch"
      subClamp
      trailing={s.signal !== "none" ? <SignalChip signal={s.signal} size="sm" /> : undefined}
    />
    );
  };

  return (
    <section className="mt-8" aria-labelledby="sc-near-title">
      <h3 id="sc-near-title" className="text-base font-bold text-text-main">
        <T
          en={`Almost passed: ${n} ${n === 1 ? "share misses" : "shares miss"} just one ${by === "question" ? "answer" : "check"}`}
          bn={`প্রায় পাস: ${n}টি শেয়ার শুধু একটি ${by === "question" ? "উত্তরে" : "যাচাইয়ে"} বাদ পড়েছে`}
        />
      </h3>
      <p className="mt-0.5 text-sm text-text-muted">
        {by === "question" ? (
          <T
            en="Here is which answer holds back the most. An easier choice lets them in, or you can keep it if it matters to you."
            bn="কোন উত্তরে সবচেয়ে বেশি আটকেছে, তা নিচে দেওয়া হলো। সহজ উত্তর বাছলে এরা যোগ হবে, আর উত্তরটি জরুরি হলে রেখে দিতে পারেন।"
          />
        ) : (
          <T
            en="Here is which check holds back the most. Loosening one lets them in, or you can keep it if it matters to you."
            bn="কোন যাচাইয়ে সবচেয়ে বেশি আটকেছে, তা নিচে দেওয়া হলো। একটি শিথিল করলে এরা যোগ হবে, আর যাচাইটি জরুরি হলে রেখে দিতে পারেন।"
          />
        )}
      </p>

      <Card padding="none" className="mt-3 overflow-hidden">
        <ul>
          {near.by_check.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm text-text-main">
                  <T en={c.label_en} bn={c.label_bn} />
                </p>
                <p className="text-xs text-text-muted tabular-nums">
                  <T en={`Holds back ${c.count} ${c.count === 1 ? "share" : "shares"}`} bn={`${c.count}টি শেয়ার আটকেছে`} />
                </p>
              </div>
              <Button variant="link" className="shrink-0" onClick={() => onChange(c.key, by)}>
                <T en="Change" bn="বদলান" />
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="none" className="mt-3 overflow-hidden">
        <RowLock
          preview={<ul>{near.stocks.slice(0, 2).map((x) => row(x, true))}</ul>}
          panel={
            <LockPanel job="find"
              title={{
                en: `See the companies behind the ${n} ${n === 1 ? "share" : "shares"} that almost passed`,
                bn: `প্রায় পাস করা ${n}টি শেয়ারের কোম্পানি দেখুন`,
              }}
              codes={near.stocks.map((x) => x.code)}
              count={n}
              lock="Screener: almost passed"
              what={{ en: "The shares that almost passed", bn: "প্রায় পাস করা শেয়ার" }}
              href="#sc-premium"
            />
          }
        >
          <ul>{near.stocks.map((x) => row(x))}</ul>
        </RowLock>
        {n > near.stocks.length && (
          <p className="border-t border-border p-4 text-sm text-text-muted">
            <T
              en={`Showing the first ${near.stocks.length} of ${n}, in your screen's order.`}
              bn={`${n}টির মধ্যে প্রথম ${near.stocks.length}টি, আপনার স্ক্রিনের ক্রমে।`}
            />
          </p>
        )}
      </Card>
    </section>
  );
}
