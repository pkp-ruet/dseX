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
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import type { CompanyDetail } from "@/lib/api";
import { SIGNAL_VAR } from "@/lib/constants";
import { formatDate, money } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { freeReportCode } from "@/lib/free-report";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { PAID_PLANS, LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { HEALTH_PILLAR_ORDER, type Bi } from "@/lib/plain-language";
import { toNum } from "@/lib/stock-metrics";
import { trackEvent } from "@/lib/track";

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

const tx = (b: Bi) => <T en={b.en} bn={b.bn} />;

/**
 * The stock page's ONE Premium chapter (2026-10-27) — "facts are free, our
 * verdict is Premium". Everything where we judge or explain a stock lives
 * here as a short list of plain questions; the other chapters carry only
 * public numbers and have no locks.
 *
 * A free reader sees every question with a free hint (counts, dates), a real
 * taste (the first health check, the top good sign and thing to watch, the
 * results headline) and calm placeholder bars where each answer goes
 * (`PremiumMask`), then ONE offer (`#ch-premium`). A Premium reader sees the
 * same questions answered. On the free report of the day it opens for
 * everyone and the offer becomes "get this on every stock".
 */
export default function FullVerdict({ detail }: { detail: CompanyDetail }) {
  const { bn } = useLang();
  const { state, isPremium } = usePremium();
  const open = usePremiumOpen();
  const mode = open ? (isPremium ? "premium" : "free-today") : "locked";

  const { profile, score_row, signal, verdict, bengali_summary, fair_value, signal_flags,
          results_explained, score_history, deep_analysis, latest_price } = detail;
  const code = profile.trading_code;
  const name = profile.company_name ?? code;

  const questions: Question[] = [];

  // 1 · Why Buy / Sell / neither — the signal's reason + the rest of our take.
  const sig = signal?.signal;
  const sentences = (verdict?.sentences ?? []).filter(Boolean);
  const restEn = verdict?.tagline ? sentences : sentences.slice(1);
  const sentencesBn = (verdict?.sentences_bn ?? []).filter(Boolean);
  const restBnFromVerdict = verdict?.tagline_bn ? sentencesBn : sentencesBn.slice(1);
  const bnParas = (bengali_summary?.trim() || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // Older backend: no Bengali verdict yet — the এক নজরে summary stands in.
  const restBn = restBnFromVerdict.length ? restBnFromVerdict : bnParas.slice(1);
  const hasReason = !!(signal?.reason_en || signal?.reason_bn);
  if (hasReason || restEn.length || restBn.length) {
    const bullets = (lines: string[]) => (
      <ul className="mt-3 space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-snug text-text-main">
            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    );
    questions.push({
      id: "v-why",
      title:
        sig === "buy"
          ? { en: "Why is it a Buy right now?", bn: "এখন কেন কেনার সংকেত?" }
          : sig === "sell"
            ? { en: "Why is it a Sell right now?", bn: "এখন কেন বিক্রির সংকেত?" }
            : { en: "Why is there no Buy or Sell signal today?", bn: "আজ কেন কেনা বা বিক্রির সংকেত নেই?" },
      hint: { en: "The full reason, and our complete view of this share.", bn: "পুরো কারণ, আর এই শেয়ার নিয়ে আমাদের পূর্ণ মত।" },
      locked: true,
      body: (
        <PremiumMask lines={3}>
          {hasReason && (
            <p
              className="text-base font-bold leading-snug sm:text-lg"
              style={{ color: sig === "sell" ? SIGNAL_VAR.sell : "var(--text)" }}
            >
              <T en={signal?.reason_en ?? ""} bn={signal?.reason_bn ?? signal?.reason_en ?? ""} />
            </p>
          )}
          {(restEn.length > 0 || restBn.length > 0) && (
            <T en={restEn.length ? bullets(restEn) : null} bn={restBn.length ? bullets(restBn) : null} />
          )}
        </PremiumMask>
      ),
    });
  }

  // 2 · What price would be fair — the fair-value estimate.
  if (fair_value && fair_value.center != null) {
    const ltp = toNum(latest_price?.ltp);
    const n = fair_value.methods?.length ?? 0;
    const today: Bi = ltp != null ? { en: `Today ${money(ltp)}. `, bn: `আজকের দাম ${money(ltp)}। ` } : { en: "", bn: "" };
    questions.push({
      id: "v-fair",
      title: { en: "What price would be fair?", bn: "ন্যায্য দাম কত?" },
      hint: n > 1
        ? { en: `${today.en}Our fair price range, worked out in ${n} ways.`, bn: `${today.bn}${n}টি উপায়ে হিসাব করা আমাদের ন্যায্য দামের সীমা।` }
        : { en: `${today.en}Our fair price range and how we worked it out.`, bn: `${today.bn}আমাদের ন্যায্য দামের সীমা, আর কীভাবে হিসাব করেছি।` },
      locked: true,
      body: (
        <PremiumMask lines={2}>
          <ValueTodayBox fairValue={fair_value} gated={false} />
        </PremiumMask>
      ),
    });
  }

  // 3 · Low or high — the price verdict, against its past, sector and rank.
  const priceLines = priceVerdictLines(detail);
  if (priceLines.length) {
    questions.push({
      id: "v-price",
      title: { en: "Is today's price low or high?", bn: "আজকের দাম কম না বেশি?" },
      hint: { en: "Compared with its own past, its sector and similar companies.", bn: "নিজের অতীত, সেক্টর আর একই ধরনের কোম্পানির তুলনায়।" },
      locked: true,
      body: (
        <PremiumMask lines={Math.min(priceLines.length, 4)}>
          <PriceVerdict lines={priceLines} />
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
    const base: Bi = { en: `${healthy} of ${total} checks look healthy.`, bn: `${total}টির মধ্যে ${healthy}টি যাচাই ভালো।` };
    questions.push({
      id: "health",
      title: { en: "The five checks, explained", bn: "পাঁচটি যাচাই, ব্যাখ্যাসহ" },
      hint: open || total < 2 ? base : { en: `${base.en} The first one is explained for free.`, bn: `${base.bn} প্রথমটির ব্যাখ্যা ফ্রি।` },
      locked: total > 1,
      body: <HealthCheck scoreRow={score_row} detail={detail} />,
    });
  }

  // 5 · Good signs and things to watch — the top one of each free.
  const greens = signal_flags?.items
    ? signal_flags.items.filter((i) => i.tone === "good").length
    : signal_flags?.green?.length ?? 0;
  const reds = signal_flags?.items
    ? signal_flags.items.filter((i) => i.tone === "watch").length
    : signal_flags?.red?.length ?? 0;
  if (signal_flags && greens + reds > 0) {
    const base: Bi = {
      en: `${greens} good ${greens === 1 ? "sign" : "signs"} and ${reds} ${reds === 1 ? "thing" : "things"} to watch.`,
      bn: `${greens}টি ভালো দিক আর ${reds}টি সতর্কতার দিক।`,
    };
    const hasMore = greens > 1 || reds > 1;
    questions.push({
      id: "signals",
      title: { en: "Good signs and things to watch", bn: "ভালো দিক ও সতর্কতার দিক" },
      hint: open || !hasMore ? base : { en: `${base.en} The first of each is free.`, bn: `${base.bn} প্রতিটির প্রথমটি ফ্রি।` },
      locked: hasMore,
      body: <SignalBoard flags={signal_flags} />,
    });
  }

  // 6 · The latest quarterly report — headline and profit line free.
  if (results_explained) {
    const pd = results_explained.post_date;
    questions.push({
      id: "results",
      title: { en: "What the latest quarter means", bn: "সর্বশেষ প্রান্তিকের ফলের অর্থ" },
      hint: pd
        ? { en: `Results published ${formatDate(pd)}.`, bn: `ফল প্রকাশ: ${bnDate(pd) || formatDate(pd)}।` }
        : undefined,
      locked: results_explained.lines.length > 1,
      body: <ResultsExplained results={results_explained} />,
    });
  }

  // 7 · How the score moved and why the grade changed.
  if (score_history && score_history.points.length >= 2) {
    const changed = score_history.grade_changes > 0;
    questions.push({
      id: "score-history",
      title: changed
        ? { en: "Why the grade changed", bn: "গ্রেড কেন বদলেছে" }
        : { en: "How the score has moved", bn: "স্কোর কীভাবে বদলেছে" },
      hint: scoreHistorySummary(score_history) ?? undefined,
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
    const hEn = deep_analysis.headline_en ?? "";
    const hBn = deep_analysis.headline_bn ?? hEn;
    const bEn = deep_analysis.bottom_line_en ?? "";
    const bBn = deep_analysis.bottom_line_bn ?? bEn;
    questions.push({
      id: "v-report",
      title: { en: "The in-depth report", bn: "বিস্তারিত বিশ্লেষণ রিপোর্ট" },
      hint: hEn || hBn ? { en: hEn, bn: hBn } : undefined,
      locked: false,
      body: (
        <Link
          href={`/stock/${code}/analysis`}
          className="flex items-start gap-3 rounded-lg bg-surface-2 p-4 hover:opacity-90 active:opacity-70"
        >
          <span className="mt-0.5 inline-flex shrink-0 text-primary-ink" aria-hidden="true"><IconChartBars size={18} /></span>
          <span className="min-w-0 flex-1">
            {(bEn || bBn) && (
              <span className="block text-sm leading-relaxed text-text-main line-clamp-3">
                <T en={bEn} bn={bBn} />
              </span>
            )}
            <span className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary-ink">
              <T en="Read the full report" bn="পুরো রিপোর্ট পড়ুন" /> <span aria-hidden="true">→</span>
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
          en: `${questions.length} questions about ${code}, answered in plain words. Anyone can read the questions; the full answers are part of Premium.`,
          bn: `${code} নিয়ে ${questions.length}টি প্রশ্ন, সহজ ভাষায় উত্তরসহ। প্রশ্নগুলো সবার জন্য খোলা; পুরো উত্তর প্রিমিয়ামে।`,
        }
      : { en: `Our analysis of ${code}, in plain words.`, bn: `${code} নিয়ে আমাদের বিশ্লেষণ, সহজ ভাষায়।` };

  return (
    <StockChapter
      id="ch-verdict"
      title={<T en="The full verdict" bn="পূর্ণ মূল্যায়ন" />}
      lead={tx(lead)}
      fold={false}
      action={
        <span className="premium-chip">
          <IconCrown size={14} /> <T en="Premium" bn="প্রিমিয়াম" />
        </span>
      }
    >
      <ol className="verdict-list">
        {questions.map((q, i) => (
          <li key={q.id} id={q.id} className="verdict-q stock-anchor">
            <div className="flex items-start gap-3">
              <span className="verdict-q-n" aria-hidden="true">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold leading-snug text-text-main sm:text-lg">{tx(q.title)}</h3>
                {q.hint && <p className="mt-0.5 text-sm text-text-muted">{tx(q.hint)}</p>}
              </div>
              {mode === "locked" && q.locked && (
                <span className="mt-1 inline-flex shrink-0 text-primary-ink" title={bn ? "প্রিমিয়াম" : "Premium"}>
                  <IconLock size={16} />
                </span>
              )}
            </div>
            <div className="verdict-q-body">{q.body}</div>
          </li>
        ))}
      </ol>

      {mode !== "premium" && (
        <VerdictOffer
          code={code}
          name={name}
          count={lockedCount}
          freeToday={mode === "free-today"}
          guest={state === "guest"}
          stakes={questions.filter((q) => q.locked).slice(0, 3).map((q) => (bn ? q.title.bn : q.title.en))}
        />
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
  const { bn } = useLang();
  const { state } = usePremium();
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
    savePremiumContext({ from: "stock", label: bn ? `${code}-এর পূর্ণ মূল্যায়ন` : `The full verdict on ${code}`, stakes });
  };

  const perks: Bi[] = [
    { en: "The full verdict on every DSE share", bn: "DSE-এর প্রতিটি শেয়ারের পূর্ণ মূল্যায়ন" },
    { en: "Your portfolio checked every trading day", bn: "প্রতি কার্যদিবসে আপনার পোর্টফোলিও যাচাই" },
    { en: "No limits on your watchlist, alerts or TopStock AI", bn: "ওয়াচলিস্ট, অ্যালার্ট আর TopStock AI-তে কোনো সীমা নেই" },
  ];

  return (
    <div ref={ref} id="ch-premium" className="verdict-offer stock-anchor">
      <p className="flex items-center gap-2 text-sm font-semibold text-primary-ink">
        <IconCrown size={16} />
        {freeToday ? <T en="Today's free full report" bn="আজকের ফ্রি পূর্ণ রিপোর্ট" /> : <T en="Premium" bn="প্রিমিয়াম" />}
      </p>
      <h3 className="mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl">
        {freeToday ? (
          <T en={`Every answer on ${name} is open today`} bn={`আজ ${name}-এর সব উত্তর সবার জন্য খোলা`} />
        ) : (
          <T en={`Read the full verdict on ${name}`} bn={`${name}-এর পূর্ণ মূল্যায়ন পড়ুন`} />
        )}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        {freeToday ? (
          <T
            en="With Premium, the same answers are open on every share, every day."
            bn="প্রিমিয়ামে প্রতিদিন প্রতিটি শেয়ারের একই উত্তর খোলা থাকে।"
          />
        ) : (
          <T
            en={`${count} ${count === 1 ? "answer" : "answers"} about ${code} above, and the same for every other share.`}
            bn={`ওপরে ${code} নিয়ে ${count}টি উত্তর, আর অন্য প্রতিটি শেয়ারেরও একই।`}
          />
        )}
      </p>

      <ul className="mt-4 space-y-2">
        {perks.map((p) => (
          <li key={p.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive"><IconCheck size={14} /></span>
            <span>{tx(p)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-base text-text-main">
        <T
          en={<><b className="tabular-nums">৳{LOWEST_PRICE}</b> a month</>}
          bn={<>মাসে <b className="tabular-nums">৳{LOWEST_PRICE}</b></>}
        />
        {YEARLY_MONTH != null && (
          <span className="text-text-muted">
            <T
              en={` · about ৳${YEARLY_MONTH} a month on the yearly plan (limited-time offer)`}
              bn={` · বছরের প্ল্যানে মাসে প্রায় ৳${YEARLY_MONTH} (সীমিত সময়ের অফার)`}
            />
          </span>
        )}
      </p>
      <div className="mt-3">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg" block>
          {freeToday ? <T en="Get this on every share" bn="সব শেয়ারে এটি পান" /> : <T en="See Premium plans" bn="প্রিমিয়াম প্ল্যান দেখুন" />}
        </Button>
      </div>
      <p className="mt-3 text-sm text-text-muted">
        {guest ? (
          <T
            en="Create a free account first, then pay by bKash or Nagad. Nothing renews by itself, and you can get a refund within 7 days."
            bn="আগে একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর bKash বা Nagad দিয়ে পেমেন্ট করুন। নিজে থেকে নবায়ন হয় না, আর 7 দিনের মধ্যে টাকা ফেরত নিতে পারবেন।"
          />
        ) : (
          <T
            en="Pay by bKash or Nagad. Nothing renews by itself, and you can get a refund within 7 days."
            bn="bKash বা Nagad দিয়ে পেমেন্ট করুন। নিজে থেকে নবায়ন হয় না, আর 7 দিনের মধ্যে টাকা ফেরত নিতে পারবেন।"
          />
        )}
      </p>
      {!freeToday && sample && sample !== code && (
        <p className="mt-2 text-sm text-text-muted">
          <T en="Not sure yet? " bn="এখনো ঠিক করেননি? " />
          <Link href={`/stock/${sample}#ch-verdict`} className="font-semibold text-primary-ink hover:underline">
            <T en={`Read today's free full report: ${sample}`} bn={`আজকের ফ্রি পূর্ণ রিপোর্ট পড়ুন: ${sample}`} />
          </Link>
        </p>
      )}
    </div>
  );
}
