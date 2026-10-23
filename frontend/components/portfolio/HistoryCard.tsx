"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { formatDate, takaGroup } from "@/lib/formatters";
import { sellProfit, visibleLog } from "@/lib/portfolio-ledger";
import type { PortfolioLogEntry } from "@/lib/api";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

const SHOWN = 6;

/**
 * Everything that happened in this portfolio, newest first: buys, sales (with
 * the profit each one made), cash dividends and bonus shares. A buy or sale
 * typed by mistake can be removed from the history (the holding itself is
 * edited on its own card). Links to the yearly statement (Premium).
 */
export default function HistoryCard({
  log,
  lang,
  readOnly = false,
  statementHref,
  onRemove,
}: {
  log: PortfolioLogEntry[];
  lang: AnalysisLang;
  readOnly?: boolean;
  statementHref: string;
  onRemove: (id: string) => Promise<void>;
}) {
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const rows = visibleLog(log);
  if (!rows.length) return null;
  const shown = all ? rows : rows.slice(0, SHOWN);

  const describe = (e: PortfolioLogEntry): { title: string; amount: string | null; tone: string } => {
    switch (e.kind) {
      case "buy":
        return {
          title: L(`Bought ${e.qty.toLocaleString()} at ${takaGroup(e.price)}`, `${e.qty.toLocaleString()}টি কেনা, ${takaGroup(e.price)} দরে`),
          amount: takaGroup(e.qty * e.price),
          tone: "text-text-main",
        };
      case "sell": {
        const p = sellProfit(e);
        return {
          title: L(`Sold ${e.qty.toLocaleString()} at ${takaGroup(e.price)}`, `${e.qty.toLocaleString()}টি বিক্রি, ${takaGroup(e.price)} দরে`),
          amount: `${p >= 0 ? "+" : "−"}${takaGroup(Math.abs(p))}`,
          tone: p >= 0 ? "text-positive" : "text-negative",
        };
      }
      case "dividend":
        return {
          title: L(`Cash dividend on ${(e.qty ?? 0).toLocaleString()} shares`, `${(e.qty ?? 0).toLocaleString()}টি শেয়ারে নগদ ডিভিডেন্ড`),
          amount: `+${takaGroup(e.amount ?? 0)}`,
          tone: "text-positive",
        };
      case "bonus":
        return {
          title: L(`${e.pct}% bonus — +${(e.shares_added ?? 0).toLocaleString()} shares`, `${e.pct}% বোনাস — +${(e.shares_added ?? 0).toLocaleString()}টি শেয়ার`),
          amount: null,
          tone: "text-text-main",
        };
    }
  };

  return (
    <Card padding="none" className="p-5 sm:p-6" data-card="history">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
            {L("History", "লেনদেনের ইতিহাস")}
          </h2>
          {!bn && <Bn className="text-sm text-text-muted">কেনা, বেচা, ডিভিডেন্ড আর বোনাস — সব এক জায়গায়।</Bn>}
        </div>
        <Link
          href={statementHref}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-primary-ink hover:underline active:opacity-70"
        >
          {L("Yearly statement", "বার্ষিক হিসাব")} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-border">
        {shown.map((e) => {
          const d = describe(e);
          const canRemove = !readOnly && (e.kind === "buy" || e.kind === "sell");
          return (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className={`text-sm text-text-main ${bn ? "font-bn" : ""}`}>
                  <span className="font-mono font-bold">{e.code}</span> · {d.title}
                </p>
                <p className="text-xs text-text-muted">
                  {formatDate(e.kind === "dividend" || e.kind === "bonus" ? e.record_date : e.date)}
                </p>
              </div>
              {d.amount && <p className={`pv nums shrink-0 text-sm font-bold ${d.tone}`}>{d.amount}</p>}
              {canRemove && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  iconOnly
                  aria-label={L(`Remove this ${e.kind} from the history`, "ইতিহাস থেকে মুছুন")}
                  disabled={busy != null}
                  onClick={async () => {
                    setBusy(e.id);
                    try {
                      await onRemove(e.id);
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="hover:text-negative"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > SHOWN && (
        <Button type="button" variant="link" size="sm" className="-ml-2 mt-1" onClick={() => setAll((v) => !v)}>
          {all ? L("Show less", "কম দেখান") : L(`Show all ${rows.length}`, `সব ${rows.length}টি দেখান`)}
        </Button>
      )}
      <p className={`mt-1 text-xs text-text-muted ${bn ? "font-bn" : ""}`}>
        {L(
          "Removing a row only changes this list — edit the holding itself to change your shares.",
          "সারি মুছলে শুধু এই তালিকা বদলায় — শেয়ারের সংখ্যা বদলাতে হোল্ডিংটি এডিট করুন।",
        )}
      </p>
    </Card>
  );
}
