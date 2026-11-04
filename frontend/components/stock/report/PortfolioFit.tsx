"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QuestionRow from "@/components/report/QuestionRow";
import { TONE_CLASS, tx } from "@/components/report/chip";
import Chip from "@/components/ui/Chip";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { money, takaGroup } from "@/lib/formatters";
import { trackEvent } from "@/lib/track";
import type { PortfolioFit as Fit } from "@/lib/portfolio-fit";
import type { Bi } from "@/lib/stock-report";
import { usePortfolioFit } from "./usePortfolioFit";

/** Amounts to try besides the suggestion. */
const PRESETS = [10_000, 25_000, 50_000, 100_000];

/**
 * "What would it do to your portfolio?" (2026-11-04) — a question row of the
 * report's "What's next" chapter for a signed-in reader with shares: one buy
 * of this share run through the portfolio page's own grade, before and after
 * (`lib/portfolio-fit.ts`). The reader can try another amount; nothing is
 * saved. Part of the full report (inside `ReportGate`); a free reader learns
 * in the Premium card how many things it would change.
 */
export default function PortfolioFit({ code, ltp }: { code: string; ltp: number | null }) {
  const [spend, setSpend] = useState<number | null>(null);
  const { fit, suggested } = usePortfolioFit(code, ltp, spend);
  const seen = useRef(false);
  useEffect(() => {
    if (!fit || seen.current) return;
    seen.current = true;
    trackEvent("portfolio_fit_view", { code, changed: fit.changed, held: fit.held ? "yes" : "no" });
  }, [fit, code]);

  if (!fit) return null;
  const meaning: Bi[] = [
    ...(fit.priceNote ? [fit.priceNote] : []),
    {
      en: "It is the same check as your portfolio page, run on your main portfolio with this buy added at today's price.",
      bn: "এটি আপনার পোর্টফোলিও পেজের একই যাচাই: আজকের দামে এই কেনাটি যোগ করে আপনার মূল পোর্টফোলিওতে চালানো।",
    },
  ];

  return (
    <QuestionRow
      id="rp-fit"
      title={<T en="What would it do to your portfolio?" bn="কিনলে আপনার পোর্টফোলিওর কী হবে?" />}
      word={fit.word}
      tone={fit.tone}
      headline={fit.headline}
      picture={<FitLines fit={fit} />}
      free={
        <FitAmount
          fit={fit}
          suggested={suggested?.spend ?? null}
          onSpend={(v) => {
            setSpend(v);
            trackEvent("portfolio_fit_amount", { code });
          }}
        />
      }
      meaning={meaning}
      watch={fit.warning}
      source={{
        en: "From your main portfolio, at today's closing prices, before fees. Nothing is saved; this is a check, not advice.",
        bn: "আপনার মূল পোর্টফোলিও থেকে, আজকের সমাপনী দামে, ফি ধরার আগে। কিছুই সেভ হয় না; এটি শুধু যাচাই, পরামর্শ নয়।",
      }}
      action={
        <Link href="/portfolio#pf-whatif" prefetch={false} className="text-sm font-semibold text-primary-ink hover:underline active:opacity-70">
          <T en="Try a sale too" bn="বিক্রিও যাচাই করুন" />
        </Link>
      }
    />
  );
}

/** Before → after, one line each. */
function FitLines({ fit }: { fit: Fit }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {fit.lines.map((l) => (
        <li key={l.key} className="flex items-baseline justify-between gap-3 py-2.5">
          <span className="min-w-0 text-sm text-text-main">
            {tx(l.label)}
            {l.note && <span className="block text-xs text-text-muted">{tx(l.note)}</span>}
          </span>
          <span className="nums shrink-0 text-sm font-semibold">
            <span className="text-text-muted">{l.from}</span>{" "}
            <span className="text-text-muted" aria-hidden="true">→</span>{" "}
            <b className={l.changed ? TONE_CLASS[l.tone] : "text-text-main"}>{l.to}</b>
            <span className="sr-only">
              <T en={`, from ${l.from} to ${l.to}`} bn={`, ${l.from} থেকে ${l.to}`} />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The amount to check: the suggestion, a few round amounts, or the reader's own. */
function FitAmount({ fit, suggested, onSpend }: { fit: Fit; suggested: number | null; onSpend: (v: number | null) => void }) {
  const id = useId();
  const { bn } = useLang();
  const [draft, setDraft] = useState("");
  const ltp = fit.qty > 0 ? fit.spend / fit.qty : 0;
  const chips = useMemo(() => {
    const out: { v: number; label: Bi; suggested?: boolean }[] = [];
    if (suggested) out.push({ v: suggested, label: { en: `Suggested · ${takaGroup(suggested)}`, bn: `প্রস্তাবিত · ${takaGroup(suggested)}` }, suggested: true });
    for (const v of PRESETS) {
      if (v < ltp || (suggested && Math.abs(v - suggested) < 1)) continue;
      out.push({ v, label: { en: takaGroup(v), bn: takaGroup(v) } });
    }
    return out;
  }, [suggested, ltp]);
  const near = (v: number) => Math.abs(v - fit.spend) <= ltp;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-main">
        <T
          en={`${fit.qty.toLocaleString("en-US")} share${fit.qty === 1 ? "" : "s"} at ${money(ltp)}, ${takaGroup(fit.spend)} in all.`}
          bn={`${money(ltp)} দামে ${fit.qty.toLocaleString("en-US")}টি শেয়ার, মোট ${takaGroup(fit.spend)}।`}
        />
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={bn ? "কত টাকা দিয়ে যাচাই করবেন" : "Amount to check"}>
        {chips.map((c) => (
          <Chip
            key={c.v}
            active={near(c.v) && !draft}
            onClick={() => {
              setDraft("");
              onSpend(c.suggested ? null : c.v);
            }}
          >
            {tx(c.label)}
          </Chip>
        ))}
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <label htmlFor={`${id}-amt`} className="text-xs font-semibold text-text-main">
          <T en="Or type an amount (৳)" bn="অথবা টাকার অঙ্ক লিখুন (৳)" />
        </label>
        <input
          id={`${id}-amt`}
          type="number"
          inputMode="decimal"
          min={0}
          value={draft}
          placeholder={String(Math.round(fit.spend))}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = parseFloat(e.target.value);
            onSpend(Number.isFinite(v) && v > 0 ? v : null);
          }}
          className="input-field tabular-nums"
        />
      </div>
    </div>
  );
}
