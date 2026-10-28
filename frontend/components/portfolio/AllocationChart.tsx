"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalysisLang, PortfolioAnalysis } from "@/lib/portfolio-analysis";
import { takaGroup } from "@/lib/formatters";
import PfCard, { PfShowMore, SHORT_LIST, folds } from "./PfCard";
import Stat from "@/components/ui/Stat";
import Button from "@/components/ui/Button";

// Numbers inside Bengali prose stay Western (9, 6.1%) — matches the rest of the
// site and avoids webfont glyph issues with Bengali numerals on some devices.

const STR = {
  en: {
    title: "Where your money sits",
    invested: "What you paid",
    market: "Worth today",
    basisLabel: "Count by",
    desc: (basis: "invested" | "market") =>
      `How much of your ${basis === "invested" ? "money paid" : "money today"} is in each share, biggest first.`,
    totalInvested: "You paid in total",
    totalValue: "Worth in total today",
    more: (n: number) => `${n} more ${n === 1 ? "share" : "shares"}`,
    noteBig: (code: string, pct: string) =>
      `${code} is ${pct}% of your money, which is a lot in one place. If it falls, your whole portfolio feels it. Spreading across more shares softens that.`,
    noteOk: (code: string, pct: string) =>
      `Your biggest share is ${code}, at ${pct}%. That is a good balance: no single share takes over.`,
    effective: (eff: string, n: number) =>
      `You hold ${n} shares, but the split is uneven: your money really sits in about ${eff} of them. The rest are small and barely move your total.`,
  },
  bn: {
    title: "আপনার টাকা কোথায় আছে",
    invested: "কেনা দামে",
    market: "আজকের দামে",
    basisLabel: "হিসাব",
    desc: (basis: "invested" | "market") =>
      `প্রতিটি শেয়ারে আপনার ${basis === "invested" ? "কেনা টাকার" : "আজকের মূল্যের"} কত অংশ আছে, বড়টা আগে।`,
    totalInvested: "মোট কেনা দাম",
    totalValue: "আজ মোট মূল্য",
    more: (n: number) => `আরও ${n}টি শেয়ার`,
    noteBig: (code: string, pct: string) =>
      `${code} একাই আপনার টাকার ${pct}%, যা এক জায়গায় অনেক বেশি। এর দাম কমলে পুরো পোর্টফোলিওতে প্রভাব পড়ে। আরও কয়েকটি শেয়ারে ছড়িয়ে দিলে ধাক্কা কম লাগে।`,
    noteOk: (code: string, pct: string) =>
      `আপনার সবচেয়ে বড় শেয়ার ${code}, মোট ${pct}%। ভারসাম্য ভালো, কোনো একটি শেয়ার একাই বেশি প্রভাব ফেলে না।`,
    effective: (eff: string, n: number) =>
      `আপনি ${n}টি শেয়ার রাখলেও ভাগটি অসম। আপনার টাকা আসলে প্রায় ${eff}টি শেয়ারে জমে আছে। বাকিগুলো ছোট, মোট মূল্যে তেমন প্রভাব ফেলে না।`,
  },
} as const;

interface Props {
  analysis: PortfolioAnalysis;
  lang?: AnalysisLang;
}

type Basis = "invested" | "market";

/**
 * "Where your money sits" — money per company as a ranked list (biggest
 * first) with thin ink bars, not a donut: a list reads better on a phone and
 * needs no colour key. The total leads as one big number; a toggle switches
 * between what was paid and what it is worth today. The one warning colour is
 * the dot on the note when one stock holds over 25%. A long list shows the
 * top SHORT_LIST with the rest as one "N more" row (so the bars still add up
 * to 100%) and a "Show all" button.
 */
export default function AllocationChart({ analysis, lang = "en" }: Props) {
  const [basis, setBasis] = useState<Basis>("invested");
  const [all, setAll] = useState(false);
  const t = STR[lang];
  const bn = lang === "bn";
  const bnText = bn ? "font-bn" : "";

  const holdings = analysis.holdings;
  if (holdings.length === 0) return null;

  const raw = holdings.map((h) => {
    const invested = h.qty * h.buyPrice;
    const market = h.ltp != null ? h.qty * h.ltp : invested;
    return { code: h.code, name: h.companyName, invested, market };
  });
  const valueOf = (r: { invested: number; market: number }) => (basis === "invested" ? r.invested : r.market);

  const sorted = [...raw].sort((a, b) => valueOf(b) - valueOf(a));
  const sum = sorted.reduce((s, r) => s + valueOf(r), 0);
  const total = sum || 1;

  // Keep the list short: the top few, the rest folded into one row until "Show all".
  const canFold = folds(sorted.length);
  const fold = canFold && !all;
  const shown = fold ? sorted.slice(0, SHORT_LIST) : sorted;
  const rest = fold ? sorted.slice(SHORT_LIST) : [];
  const restVal = rest.reduce((s, r) => s + valueOf(r), 0);

  const top = sorted[0];
  const topShare = (valueOf(top) / total) * 100;
  const big = topShare > 25;
  const note = big ? t.noteBig(top.code, topShare.toFixed(0)) : t.noteOk(top.code, topShare.toFixed(0));

  // Effective (concentration-honest) count — only worth calling out when the
  // split is meaningfully lopsided, otherwise it just restates the count.
  const eff = analysis.effectiveStocks;
  const n = holdings.length;
  const showEff = n >= 3 && eff > 0 && eff < n - 0.75;

  const pct = (v: number) => (v / total) * 100;

  return (
    <PfCard title={t.title} note={t.desc(basis)} lang={lang} dataCard="allocation">
      <div
        className={`flex flex-wrap items-end justify-between gap-3 ${bnText}`}
        lang={bn ? "bn" : undefined}
      >
        <Stat
          size="lg"
          value={<span className="pv">{takaGroup(sum)}</span>}
          label={basis === "invested" ? t.totalInvested : t.totalValue}
        />
        <div className="flex gap-1" role="group" aria-label={t.basisLabel}>
          {(["invested", "market"] as Basis[]).map((b) => (
            <Button
              key={b}
              type="button"
              variant="tab"
              size="sm"
              active={basis === b}
              aria-pressed={basis === b}
              onClick={() => setBasis(b)}
              className={`whitespace-nowrap ${bnText}`}
            >
              {b === "invested" ? t.invested : t.market}
            </Button>
          ))}
        </div>
      </div>

      <ul className="pf-rows mt-4 border-t border-cell-rule">
        {shown.map((r) => {
          const share = pct(valueOf(r));
          const name = r.name || r.code;
          return (
            <li key={r.code} className="py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Link
                  prefetch={false}
                  href={`/stock/${r.code}`}
                  className="flex min-h-10 min-w-0 flex-col justify-center hover:text-primary-ink active:opacity-70"
                >
                  <span className="truncate text-sm font-semibold text-text-main">{name}</span>
                  {name !== r.code && <span className="text-xs font-semibold text-text-muted">{r.code}</span>}
                </Link>
                <div className="text-right">
                  <span className="pf-num block text-sm font-bold text-text-main">{share.toFixed(0)}%</span>
                  <span className="pv pf-num block text-xs font-semibold text-text-muted">{takaGroup(valueOf(r))}</span>
                </div>
              </div>
              <div className="pf-bar mt-1.5" aria-hidden="true">
                <span style={{ width: `${Math.max(1, share)}%` }} />
              </div>
            </li>
          );
        })}
        {rest.length > 0 && (
          <li className="py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <span className={`text-sm font-semibold text-text-muted ${bnText}`} lang={bn ? "bn" : undefined}>
                {t.more(rest.length)}
              </span>
              <div className="text-right">
                <span className="pf-num block text-sm font-bold text-text-main">{pct(restVal).toFixed(0)}%</span>
                <span className="pv pf-num block text-xs font-semibold text-text-muted">{takaGroup(restVal)}</span>
              </div>
            </div>
            <div className="pf-bar mt-1.5" aria-hidden="true">
              <span className="opacity-40" style={{ width: `${Math.max(1, pct(restVal))}%` }} />
            </div>
          </li>
        )}
      </ul>
      {canFold && (
        <PfShowMore
          open={all}
          total={sorted.length}
          noun={{ en: "shares", bn: "শেয়ার" }}
          lang={lang}
          onToggle={() => setAll((v) => !v)}
        />
      )}

      <div className={`pf-card-foot ${bnText}`} lang={bn ? "bn" : undefined}>
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-text-main">
          <span className={`pf-dot mt-1.5 ${big ? "pf-dot--watch" : "pf-dot--good"}`} aria-hidden="true" />
          <span className="min-w-0">{note}</span>
        </p>
        {showEff && <p className="pf-fine">{t.effective(eff.toFixed(1), n)}</p>}
      </div>
    </PfCard>
  );
}
