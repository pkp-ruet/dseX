"use client";

import Link from "next/link";
import PfCard from "./PfCard";
import Stat from "@/components/ui/Stat";
import { takaGroup } from "@/lib/formatters";
import type { AnalysisLang, ComputedRow } from "@/lib/portfolio-analysis";

// Numbers stay Western (৳18,400) in both languages — matches the rest of the site.

const STR = {
  en: {
    title: "What's moving your money",
    subtitle: "How much each stock adds to, or takes from, your total profit.",
    total: "Your total profit or loss",
    more: (n: number) => `${n} smaller ${n === 1 ? "stock" : "stocks"} not shown`,
  },
  bn: {
    title: "কোন শেয়ার টাকা বাড়াচ্ছে-কমাচ্ছে",
    subtitle: "আপনার মোট লাভ-লোকসানে প্রতিটি শেয়ার কতটা যোগ বা বিয়োগ করছে।",
    total: "আপনার মোট লাভ / লোকসান",
    more: (n: number) => `আরও ${n}টি ছোট শেয়ার দেখানো হয়নি`,
  },
} as const;

interface Props {
  rows: ComputedRow[];
  lang?: AnalysisLang;
}

function signed(v: number): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${takaGroup(Math.abs(v))}`;
}

function toneCls(v: number): string {
  return v > 0 ? "pf-up" : v < 0 ? "pf-down" : "pf-flat";
}

/**
 * Decomposes the portfolio's total profit/loss into per-stock contributions —
 * the "what's actually driving my number" answer. The total leads as one big
 * number; under it, winners and drags share one ranked list (biggest gain at
 * the top), company name first, each with a thin bar sized by |P&L| and
 * coloured by sign — the only colour on the card. Renders nothing until at
 * least one holding has a live price.
 */
export default function ContributionStrip({ rows, lang = "en" }: Props) {
  const t = STR[lang];
  const bn = lang === "bn";
  const bnText = bn ? "font-bn" : "";

  const priced = rows.filter((r): r is ComputedRow & { pnl: number } => r.pnl != null);
  if (priced.length === 0) return null;

  const total = priced.reduce((s, r) => s + r.pnl, 0);
  const maxAbs = Math.max(...priced.map((r) => Math.abs(r.pnl)), 1);

  // Surface the biggest movers (both directions), then order gainers → drags.
  const CAP = 8;
  const shown = [...priced]
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, CAP)
    .sort((a, b) => b.pnl - a.pnl);
  const hidden = priced.length - shown.length;

  return (
    <PfCard title={t.title} note={t.subtitle} lang={lang} dataCard="contribution">
      <div className={bnText} lang={bn ? "bn" : undefined}>
        <Stat
          size="lg"
          tone={total > 0 ? "positive" : total < 0 ? "negative" : "default"}
          value={<span className="pv">{signed(total)}</span>}
          label={t.total}
        />
      </div>

      <ul className="pf-rows mt-4 border-t border-cell-rule">
        {shown.map((r) => {
          const code = r.holding.trading_code;
          const name = r.company_name || code;
          const w = Math.max(2, (Math.abs(r.pnl) / maxAbs) * 100);
          return (
            <li key={r.holding.id} className="py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Link
                  prefetch={false}
                  href={`/stock/${code}`}
                  className="flex min-h-10 min-w-0 flex-col justify-center hover:text-primary-ink active:opacity-70"
                >
                  <span className="truncate text-sm font-semibold text-text-main">{name}</span>
                  {name !== code && <span className="text-xs font-semibold text-text-muted">{code}</span>}
                </Link>
                <span className={`pv pf-num text-sm font-bold ${toneCls(r.pnl)}`}>{signed(r.pnl)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${r.pnl >= 0 ? "bg-positive" : "bg-negative"}`}
                  style={{ width: `${w}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {hidden > 0 && (
        <p className={`pf-fine ${bnText}`} lang={bn ? "bn" : undefined}>
          {t.more(hidden)}
        </p>
      )}
    </PfCard>
  );
}
