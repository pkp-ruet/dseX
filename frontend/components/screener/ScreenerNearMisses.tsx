"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StockRow from "@/components/ui/StockRow";
import SignalChip from "@/components/ui/SignalChip";
import PremiumGate from "@/components/premium/PremiumGate";
import { strengthLine } from "@/lib/screener";
import type { CustomListNear, CustomListNearStock, ScreenerQuestion } from "@/lib/api";

/**
 * "Almost passed": the stocks that miss exactly one of the six answers (or,
 * on a fine-tune screen, one exact check — never the sector). Free: how many, and how many each check holds back, with
 * a button that opens that check's settings — loosening the right check is
 * the useful move. Premium: which stocks, and the figure that missed. The
 * names blur in place and point at the page's one Premium section.
 */
export default function ScreenerNearMisses({
  near,
  questions,
  onChange,
  bn,
  t,
}: {
  near: CustomListNear;
  questions: ScreenerQuestion[];
  /** Jumps to that question, or opens that check's settings. */
  onChange: (key: string, by: "question" | "check") => void;
  bn: boolean;
  t: (en: string, bn: string) => string;
}) {
  if (!near.total) return null;
  const n = near.total;
  const by = near.by ?? "check";
  const unit = by === "question" ? t("answer", "উত্তরে") : t("check", "শর্তে");

  const row = (s: CustomListNearStock) => (
    <StockRow
      key={s.code}
      as="li"
      inset="card"
      code={s.code}
      name={s.name}
      price={s.price}
      change={s.change_pct}
      sub={[
        t(`Misses ${s.miss.label_en}: ${s.miss.value_en}`, `বাদ পড়েছে ${s.miss.label_bn}: ${s.miss.value_bn}`),
        strengthLine(s.levels, questions, t),
      ].filter(Boolean).join(" · ")}
      subTone="watch"
      subClamp
      trailing={s.signal !== "none" ? <SignalChip signal={s.signal} size="sm" /> : undefined}
      lang={bn ? "bn" : "en"}
    />
  );

  return (
    <section className="mt-8" aria-labelledby="sc-near-title">
      <h3 id="sc-near-title" className="text-base font-bold text-text-main">
        {t(`Almost passed: ${n} ${n === 1 ? "stock misses" : "stocks miss"} just one ${unit}`,
           `প্রায় পাস: ${n}টি শেয়ার মাত্র একটি ${unit} বাদ পড়েছে`)}
      </h3>
      <p className="mt-0.5 text-sm text-text-muted">
        {by === "question"
          ? t("Which answer holds back the most. Pick an easier choice to let them in — or keep it, if it matters to you.",
              "কোন উত্তরে সবচেয়ে বেশি আটকেছে। সহজ উত্তর বাছলে এরা ঢুকবে — জরুরি হলে রেখে দিন।")
          : t("Which check holds back the most. Loosen one to let them in — or keep it, if that check matters to you.",
              "কোন শর্তে সবচেয়ে বেশি আটকেছে। একটি শিথিল করলে এরা ঢুকবে — শর্তটি জরুরি হলে রেখে দিন।")}
      </p>

      <Card padding="none" className="mt-3 overflow-hidden">
        <ul>
          {near.by_check.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm text-text-main">{t(c.label_en, c.label_bn)}</p>
                <p className="text-xs text-text-muted tabular-nums">
                  {t(`Holds back ${c.count} ${c.count === 1 ? "stock" : "stocks"}`, `${c.count}টি শেয়ার আটকেছে`)}
                </p>
              </div>
              <Button variant="link" className="shrink-0" onClick={() => onChange(c.key, by)}>
                {t("Change", "বদলান")}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="none" className="mt-3 overflow-hidden">
        <PremiumGate
          label={t(`The ${n} ${n === 1 ? "stock" : "stocks"} that almost passed`, `প্রায় পাস করা ${n}টি শেয়ার`)}
          preview="blur"
          peek={160}
        >
          <ul>{near.stocks.map(row)}</ul>
        </PremiumGate>
        {n > near.stocks.length && (
          <p className="border-t border-border p-4 text-sm text-text-muted">
            {t(`Showing the first ${near.stocks.length} of ${n}, in your screen's order.`,
               `${n}টির মধ্যে প্রথম ${near.stocks.length}টি, আপনার স্ক্রিনের ক্রমে।`)}
          </p>
        )}
      </Card>
    </section>
  );
}
