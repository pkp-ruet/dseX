"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { IconCheck, IconChartBars, IconCrown, IconLock } from "@/components/ui/icons";
import PremiumMask, { usePremiumOpen } from "@/components/premium/PremiumMask";
import StockChapter from "@/components/stock/StockChapter";
import HealthCheck from "@/components/stock/HealthCheck";
import SignalBoard from "@/components/stock/SignalBoard";
import ResultsExplained from "@/components/stock/ResultsExplained";
import ScoreHistory, { scoreHistorySummary } from "@/components/stock/ScoreHistory";
import ValueTodayBox from "@/components/stock/ValueTodayBox";
import PriceVerdict, { priceVerdictLines } from "@/components/stock/PriceVerdict";
import { useStockLang } from "@/context/StockLangContext";
import type { CompanyDetail } from "@/lib/api";
import { SIGNAL_VAR } from "@/lib/constants";
import { formatDate, money } from "@/lib/formatters";
import { freeReportCode } from "@/lib/free-report";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { PAID_PLANS, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { HEALTH_PILLAR_ORDER } from "@/lib/plain-language";
import { toNum } from "@/lib/stock-metrics";
import { trackEvent } from "@/lib/track";

type Bi = { en: string; bn: string };
type Question = {
  id: string;
  title: Bi;
  hint?: Bi;
  /** Has a Premium part (counted in the offer, lock mark on the row). */
  locked: boolean;
  body: ReactNode;
};

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
const YEARLY_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : null;

/**
 * The stock page's ONE Premium chapter (2026-10-27) — "facts are free, our
 * verdict is Premium". Everything where we judge or explain a stock lives
 * here as a short list of plain questions; the other chapters carry only
 * public numbers and have no locks.
 *
 * A free reader sees every question with a free hint (counts, dates), a real
 * taste (the first health check, the top good sign and watch-out, the
 * results headline) and calm placeholder bars where each answer goes
 * (`PremiumMask`), then ONE offer (`#ch-premium`). A Premium reader sees the
 * same questions answered. On the free report of the day it opens for
 * everyone and the offer becomes "get this on every stock".
 */
export default function FullVerdict({ detail }: { detail: CompanyDetail }) {
  const { lang } = useStockLang();
  const isBn = lang === "bn";
  const { state, isPremium } = usePremium();
  const open = usePremiumOpen();
  const mode = open ? (isPremium ? "premium" : "free-today") : "locked";
  const t = (b: Bi) => (isBn ? b.bn : b.en);

  const { profile, score_row, signal, verdict, bengali_summary, fair_value, signal_flags,
          results_explained, score_history, deep_analysis, latest_price } = detail;
  const code = profile.trading_code;
  const name = profile.company_name ?? code;

  const questions: Question[] = [];

  // 1 · Why Buy / Sell / neither — the signal's reason + the rest of our take.
  const sig = signal?.signal;
  const reason = isBn ? signal?.reason_bn : signal?.reason_en;
  const sentences = (verdict?.sentences ?? []).filter(Boolean);
  const restEn = verdict?.tagline ? sentences : sentences.slice(1);
  const bnParas = (bengali_summary?.trim() || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (reason || restEn.length || bnParas.length > 1) {
    questions.push({
      id: "v-why",
      title:
        sig === "buy"
          ? { en: "Why is it a Buy right now?", bn: "এখন কেন কেনার সংকেত?" }
          : sig === "sell"
            ? { en: "Why is it a Sell right now?", bn: "এখন কেন বিক্রির সংকেত?" }
            : { en: "Why no Buy or Sell today?", bn: "আজ কেন কেনা-বেচার সংকেত নেই?" },
      hint: { en: "The full reason, and our whole take on the stock.", bn: "পুরো কারণ, আর শেয়ারটি নিয়ে আমাদের পুরো মত।" },
      locked: true,
      body: (
        <PremiumMask lines={3}>
          {reason && (
            <p
              className={`text-base font-bold leading-snug sm:text-lg ${isBn ? "font-bn" : ""}`}
              lang={isBn ? "bn" : undefined}
              style={{ color: sig === "sell" ? SIGNAL_VAR.sell : "var(--text)" }}
            >
              {reason}
            </p>
          )}
          {/* Both languages stay in the HTML (search engines read the Bengali too). */}
          {restEn.length > 0 && (
            <ul className={`mt-3 space-y-1.5 ${isBn ? "hidden" : "block"}`}>
              {restEn.map((line, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-snug text-text-main">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
          {bnParas.length > 1 && (
            <div className={`font-bn mt-3 space-y-3 leading-relaxed text-text-main ${isBn ? "block" : "hidden"}`} lang="bn">
              {bnParas.slice(1).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
        </PremiumMask>
      ),
    });
  }

  // 2 · What should the price be — the fair-value estimate.
  if (fair_value && fair_value.center != null) {
    const ltp = toNum(latest_price?.ltp);
    const n = fair_value.methods?.length ?? 0;
    const today: Bi = ltp != null ? { en: `Today ${money(ltp)}. `, bn: `আজ ${money(ltp)}। ` } : { en: "", bn: "" };
    questions.push({
      id: "v-fair",
      title: { en: "What should the price be?", bn: "দাম কত হওয়া উচিত?" },
      hint: n > 1
        ? { en: `${today.en}Our fair-value range, from ${n} ways of measuring it.`, bn: `${today.bn}${n}টি মাপকাঠি থেকে আমাদের ন্যায্য দামের সীমা।` }
        : { en: `${today.en}Our fair-value range and how we got it.`, bn: `${today.bn}আমাদের ন্যায্য দামের সীমা আর হিসাবটা।` },
      locked: true,
      body: (
        <PremiumMask lines={2}>
          <ValueTodayBox fairValue={fair_value} gated={false} />
        </PremiumMask>
      ),
    });
  }

  // 3 · Cheap or dear — the price verdict, against its past, sector and rank.
  const priceLines = priceVerdictLines(detail);
  if (priceLines.length) {
    questions.push({
      id: "v-price",
      title: { en: "Is today's price cheap or dear?", bn: "আজকের দাম সস্তা না দামি?" },
      hint: { en: "Against its own past, its sector and its rivals.", bn: "নিজের অতীত, খাত আর প্রতিযোগীদের তুলনায়।" },
      locked: true,
      body: (
        <PremiumMask lines={Math.min(priceLines.length, 4)}>
          <PriceVerdict lines={priceLines} isBn={isBn} />
        </PremiumMask>
      ),
    });
  }

  // 4 · The five checks, explained — the first one free.
  const pillarVals = HEALTH_PILLAR_ORDER
    .map((k) => toNum(score_row?.[k]))
    .filter((v): v is number => v != null);
  if (score_row && pillarVals.length) {
    const healthy = pillarVals.filter((v) => v >= 6).length;
    const total = pillarVals.length;
    const base: Bi = { en: `${healthy} of ${total} checks look healthy.`, bn: `${total}টির মধ্যে ${healthy}টি পরীক্ষা ভালো।` };
    questions.push({
      id: "health",
      title: { en: "The five checks, explained", bn: "পাঁচটি পরীক্ষা, ব্যাখ্যাসহ" },
      hint: open || total < 2 ? base : { en: `${base.en} The first is explained free.`, bn: `${base.bn} প্রথমটির ব্যাখ্যা ফ্রি।` },
      locked: total > 1,
      body: <HealthCheck scoreRow={score_row} detail={detail} />,
    });
  }

  // 5 · Good signs and watch-outs — the top one of each free.
  const greens = signal_flags?.items
    ? signal_flags.items.filter((i) => i.tone === "good").length
    : signal_flags?.green?.length ?? 0;
  const reds = signal_flags?.items
    ? signal_flags.items.filter((i) => i.tone === "watch").length
    : signal_flags?.red?.length ?? 0;
  if (signal_flags && greens + reds > 0) {
    const base: Bi = {
      en: `${greens} good ${greens === 1 ? "sign" : "signs"} · ${reds} ${reds === 1 ? "watch-out" : "watch-outs"}.`,
      bn: `${greens}টি ভালো লক্ষণ · ${reds}টি সতর্কতা।`,
    };
    const hasMore = greens > 1 || reds > 1;
    questions.push({
      id: "signals",
      title: { en: "Good signs and watch-outs", bn: "ভালো লক্ষণ ও সতর্কতা" },
      hint: open || !hasMore ? base : { en: `${base.en} The top one of each is free.`, bn: `${base.bn} প্রতিটির প্রথমটি ফ্রি।` },
      locked: hasMore,
      body: <SignalBoard flags={signal_flags} />,
    });
  }

  // 6 · The latest quarterly report — headline and profit line free.
  if (results_explained) {
    questions.push({
      id: "results",
      title: { en: "What the latest quarter means", bn: "সর্বশেষ ত্রৈমাসিক ফলের মানে" },
      hint: results_explained.post_date
        ? { en: `Report posted ${formatDate(results_explained.post_date)}.`, bn: `ফল প্রকাশ ${formatDate(results_explained.post_date)}।` }
        : undefined,
      locked: results_explained.lines.length > 1,
      body: <ResultsExplained results={results_explained} />,
    });
  }

  // 7 · How the score moved and why the grade changed.
  if (score_history && score_history.points.length >= 2) {
    const changed = score_history.grade_changes > 0;
    const summary = scoreHistorySummary(score_history, isBn);
    questions.push({
      id: "score-history",
      title: changed
        ? { en: "Why the grade changed", bn: "গ্রেড কেন বদলেছে" }
        : { en: "How the score has moved", bn: "স্কোর কীভাবে বদলেছে" },
      hint: summary ? { en: summary, bn: summary } : undefined,
      locked: true,
      body: (
        <PremiumMask lines={2}>
          <ScoreHistory history={score_history} />
        </PremiumMask>
      ),
    });
  }

  // 8 · The in-depth report (its own page opens its first section for free).
  if (deep_analysis?.available) {
    const headline = (isBn ? deep_analysis.headline_bn : deep_analysis.headline_en) ?? deep_analysis.headline_en ?? "";
    const bottom = (isBn ? deep_analysis.bottom_line_bn : deep_analysis.bottom_line_en) ?? deep_analysis.bottom_line_en ?? "";
    questions.push({
      id: "v-report",
      title: { en: "The in-depth report", bn: "গভীর বিশ্লেষণ রিপোর্ট" },
      hint: headline ? { en: headline, bn: headline } : undefined,
      locked: false,
      body: (
        <Link
          href={`/stock/${code}/analysis`}
          className={`flex items-start gap-3 rounded-lg bg-surface-2 p-4 hover:opacity-90 active:opacity-70 ${isBn ? "font-bn" : ""}`}
          lang={isBn ? "bn" : undefined}
        >
          <span className="mt-0.5 inline-flex shrink-0 text-primary-ink" aria-hidden="true"><IconChartBars size={18} /></span>
          <span className="min-w-0 flex-1">
            {bottom && <span className="block text-sm leading-relaxed text-text-main line-clamp-3">{bottom}</span>}
            <span className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary-ink">
              {isBn ? "পুরো রিপোর্ট পড়ুন" : "Read the full report"} <span aria-hidden="true">→</span>
            </span>
          </span>
        </Link>
      ),
    });
  }

  if (questions.length === 0) return null;

  const lockedCount = questions.filter((q) => q.locked).length;
  const lead: Bi =
    mode === "locked"
      ? {
          en: `${questions.length} questions on ${code}, answered in plain words. The questions are free; the full answers are Premium.`,
          bn: `${code} নিয়ে ${questions.length}টি প্রশ্নের উত্তর, সহজ ভাষায়। প্রশ্নগুলো ফ্রি; পুরো উত্তর প্রিমিয়ামে।`,
        }
      : { en: `Our analysis of ${code}, in plain words.`, bn: `${code} নিয়ে আমাদের বিশ্লেষণ, সহজ ভাষায়।` };

  return (
    <StockChapter
      id="ch-verdict"
      title="The full verdict"
      bn="আমাদের পুরো বিশ্লেষণ"
      lead={<span className={isBn ? "font-bn" : undefined} lang={isBn ? "bn" : undefined}>{t(lead)}</span>}
      fold={false}
      action={<span className="premium-chip"><IconCrown size={14} /> Premium</span>}
    >
      <ol className="verdict-list">
        {questions.map((q, i) => (
          <li key={q.id} id={q.id} className="verdict-q stock-anchor">
            <div className="flex items-start gap-3">
              <span className="verdict-q-n" aria-hidden="true">{i + 1}</span>
              <div className={`min-w-0 flex-1 ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
                <h3 className="text-base font-bold leading-snug text-text-main sm:text-lg">{t(q.title)}</h3>
                {q.hint && <p className="mt-0.5 text-sm text-text-muted">{t(q.hint)}</p>}
              </div>
              {mode === "locked" && q.locked && (
                <span className="mt-1 inline-flex shrink-0 text-primary-ink" title={isBn ? "প্রিমিয়াম" : "Premium"}>
                  <IconLock size={16} />
                </span>
              )}
            </div>
            <div className="verdict-q-body">{q.body}</div>
          </li>
        ))}
      </ol>

      {mode !== "premium" && (
        <VerdictOffer code={code} name={name} count={lockedCount} freeToday={mode === "free-today"}
          guest={state === "guest"} stakes={questions.filter((q) => q.locked).slice(0, 3).map((q) => t(q.title))} />
      )}
    </StockChapter>
  );
}

/** The chapter's ONE offer (`#ch-premium`). */
function VerdictOffer({
  code, name, count, freeToday, guest, stakes,
}: {
  code: string;
  name: string;
  count: number;
  freeToday: boolean;
  guest: boolean;
  stakes: string[];
}) {
  const { lang } = useStockLang();
  const isBn = lang === "bn";
  const { state } = usePremium();
  const t = (en: string, bn: string) => (isBn ? bn : en);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const [sample, setSample] = useState<string | null>(null);
  useEffect(() => setSample(freeReportCode()), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || freeToday || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "stock", lock: "stock-verdict", state, stakes: count });
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [freeToday, state, count]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "stock", lock: "stock-verdict", state, stakes: count });
    savePremiumContext({ from: "stock", label: `The full verdict on ${code}`, stakes });
  };

  const perks = [
    t("The full verdict on every DSE stock", "প্রতিটি DSE শেয়ারের পুরো বিশ্লেষণ"),
    t("Your portfolio checked every trading day", "প্রতি কার্যদিবসে আপনার পোর্টফোলিও যাচাই"),
    t("No limits on watchlist, alerts and TopStock AI", "ওয়াচলিস্ট, অ্যালার্ট আর TopStock AI-তে কোনো সীমা নেই"),
  ];

  return (
    <div
      ref={ref}
      id="ch-premium"
      className={`verdict-offer stock-anchor ${isBn ? "font-bn" : ""}`}
      lang={isBn ? "bn" : undefined}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-primary-ink">
        <IconCrown size={16} />
        {freeToday ? t("Today's free full report", "আজকের ফ্রি পূর্ণ রিপোর্ট") : "Premium"}
      </p>
      <h3 className="mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl">
        {freeToday
          ? t(`Every answer on ${name} is open today`, `আজ ${name}-এর সব উত্তর খোলা`)
          : t(`Unlock the full verdict on ${name}`, `${name}-এর পুরো বিশ্লেষণ খুলুন`)}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        {freeToday
          ? t("Premium opens the same answers on every stock, every day.", "প্রিমিয়ামে প্রতিদিন প্রতিটি শেয়ারে একই উত্তর খোলা থাকে।")
          : t(
              `${count} ${count === 1 ? "answer" : "answers"} on ${code} above, and the same on every other stock.`,
              `ওপরে ${code}-এর ${count}টি উত্তর, আর অন্য প্রতিটি শেয়ারেও একই।`,
            )}
      </p>

      <ul className="mt-4 space-y-2">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive"><IconCheck size={14} /></span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-base text-text-main">
        <b className="tabular-nums">৳{LOWEST_PRICE}</b> {t("a month", "মাসে")}
        {YEARLY_MONTH != null && (
          <span className="text-text-muted">
            {t(` · about ৳${YEARLY_MONTH} a month on the yearly plan`, ` · বছরের প্ল্যানে মাসে প্রায় ৳${YEARLY_MONTH}`)}
          </span>
        )}
      </p>
      <div className="mt-3">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg" block>
          {freeToday ? t("Get this on every stock", "প্রতিটি শেয়ারে এটি পান") : t("See Premium plans", "প্রিমিয়াম প্ল্যান দেখুন")}
        </Button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        {guest
          ? t("Free account first, then pay by bKash or Nagad. No auto-renewal · 7-day refund.",
              "আগে ফ্রি অ্যাকাউন্ট, তারপর bKash বা Nagad দিয়ে। নিজে থেকে টাকা কাটে না · 7 দিনে ফেরত।")
          : t("Pay by bKash or Nagad. No auto-renewal · 7-day refund.",
              "bKash বা Nagad দিয়ে। নিজে থেকে টাকা কাটে না · 7 দিনে ফেরত।")}
      </p>
      {!freeToday && sample && sample !== code && (
        <p className="mt-2 text-sm text-text-muted">
          {t("Not sure yet? ", "এখনো নিশ্চিত নন? ")}
          <Link href={`/stock/${sample}#ch-verdict`} className="font-semibold text-primary-ink hover:underline">
            {t(`Read today's free full report: ${sample}`, `আজকের ফ্রি পূর্ণ রিপোর্ট পড়ুন: ${sample}`)}
          </Link>
        </p>
      )}
    </div>
  );
}
