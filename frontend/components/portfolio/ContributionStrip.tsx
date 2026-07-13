"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import { taka } from "@/lib/formatters";
import type { AnalysisLang, ComputedRow } from "@/lib/portfolio-analysis";

// Numbers stay Western (৳18400) in both languages — matches the rest of the site.

const STR = {
  en: {
    title: "What's moving your money",
    subtitle: "Each stock's share of your total gain or loss.",
    total: "Total gain / loss",
    more: (n: number) => `+${n} smaller ${n === 1 ? "position" : "positions"} not shown`,
  },
  bn: {
    title: "কোন শেয়ার টাকা বাড়াচ্ছে-কমাচ্ছে",
    subtitle: "মোট লাভ-লোকসানে প্রতিটি শেয়ারের অবদান।",
    total: "মোট লাভ / লোকসান",
    more: (n: number) => `+আরও ${n}টি ছোট অবস্থান দেখানো হয়নি`,
  },
} as const;

interface Props {
  rows: ComputedRow[];
  lang?: AnalysisLang;
}

function signColor(v: number): string {
  return v > 0 ? "var(--positive)" : v < 0 ? "var(--negative)" : "var(--text-muted)";
}

function signed(v: number): string {
  return `${v > 0 ? "+" : ""}${taka(v, 0)}`;
}

/**
 * Decomposes the portfolio's total profit/loss into per-stock contributions —
 * the "what's actually driving my number" answer. Winners and drags share one
 * ranked list (biggest gain at the top), each bar sized by |P&L| and colored by
 * sign. Renders nothing until at least one holding has a live price.
 */
export default function ContributionStrip({ rows, lang = "en" }: Props) {
  const t = STR[lang];
  const bnText = lang === "bn" ? "font-bn" : "";

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
    <Card as="section" padding="none" className="rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] shrink-0">
          <svg
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm sm:text-[15px] font-bold text-[var(--text)] leading-tight ${bnText}`}>
            {t.title}
          </h3>
          <p className={`text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed ${bnText}`}>
            {t.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {shown.map((r) => {
          const c = signColor(r.pnl);
          const w = Math.max(3, (Math.abs(r.pnl) / maxAbs) * 100);
          return (
            <div key={r.holding.id} className="flex items-center gap-3">
              <Link
                prefetch={false}
                href={`/stock/${r.holding.trading_code}`}
                className="font-mono font-bold text-sm text-[var(--primary)] hover:underline w-20 sm:w-24 shrink-0 truncate"
              >
                {r.holding.trading_code}
              </Link>
              <div className="flex-1 h-4 rounded bg-[var(--border)]/50 overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${w}%`, background: c }}
                  aria-hidden
                />
              </div>
              <span
                className="text-sm font-bold tabular-nums nums w-[78px] sm:w-24 text-right shrink-0"
                style={{ color: c }}
              >
                {signed(r.pnl)}
              </span>
            </div>
          );
        })}
      </div>

      {hidden > 0 && (
        <p className={`text-xs text-[var(--text-muted)] mt-3 ${bnText}`}>{t.more(hidden)}</p>
      )}

      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border)]">
        <span className={`text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] ${bnText}`}>
          {t.total}
        </span>
        <span className="text-base font-black tabular-nums nums" style={{ color: signColor(total) }}>
          {signed(total)}
        </span>
      </div>
    </Card>
  );
}
