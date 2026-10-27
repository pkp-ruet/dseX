"use client";

import { useState } from "react";
import Link from "next/link";
import PfCard from "./PfCard";
import Button from "@/components/ui/Button";
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
 *
 * 2026-10-26 clean look: hairline rows — what happened (code + plain line)
 * and the date on the left, the taka on the right, a quiet remove button
 * last. Only money in or out is coloured: a sale's profit / loss and a
 * dividend.
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
  const bnText = bn ? "font-bn" : "";
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
          tone: p >= 0 ? "pf-up" : "pf-down",
        };
      }
      case "dividend":
        return {
          title: L(`Cash dividend on ${(e.qty ?? 0).toLocaleString()} shares`, `${(e.qty ?? 0).toLocaleString()}টি শেয়ারে নগদ ডিভিডেন্ড`),
          amount: `+${takaGroup(e.amount ?? 0)}`,
          tone: "pf-up",
        };
      case "bonus":
        return {
          title: L(`${e.pct}% bonus: +${(e.shares_added ?? 0).toLocaleString()} shares`, `${e.pct}% বোনাস: +${(e.shares_added ?? 0).toLocaleString()}টি শেয়ার`),
          amount: null,
          tone: "text-text-main",
        };
    }
  };

  return (
    <PfCard
      title={L("History", "লেনদেনের ইতিহাস")}

      note={L(
        "Every buy, sale, dividend and bonus, newest first.",
        "প্রতিটি কেনা, বেচা, ডিভিডেন্ড আর বোনাস, নতুনগুলো আগে।",
      )}
      right={
        <Link href={statementHref} className={`pf-link ${bnText}`} lang={bn ? "bn" : undefined}>
          {L("Yearly statement", "বার্ষিক হিসাব")} <span aria-hidden="true">→</span>
        </Link>
      }
      lang={lang}
      dataCard="history"
    >
      <ul className="pf-rows border-t border-cell-rule">
        {shown.map((e) => {
          const d = describe(e);
          const canRemove = !readOnly && (e.kind === "buy" || e.kind === "sell");
          return (
            <li key={e.id} className="flex min-h-14 items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className={`m-0 text-sm text-text-main ${bnText}`} lang={bn ? "bn" : undefined}>
                  <span className="font-bold">{e.code}</span>
                  <span className="text-text-muted"> · </span>
                  {d.title}
                </p>
                <p className="m-0 mt-0.5 text-xs font-semibold text-text-muted">
                  {formatDate(e.kind === "dividend" || e.kind === "bonus" ? e.record_date : e.date)}
                </p>
              </div>
              {d.amount && <p className={`pv pf-num m-0 shrink-0 text-sm font-bold ${d.tone}`}>{d.amount}</p>}
              {canRemove && (
                <Button
                  type="button"
                  variant="link"
                  size="md"
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
                  className="shrink-0 text-text-muted hover:text-negative"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className={`pf-card-foot ${bnText}`} lang={bn ? "bn" : undefined}>
        {rows.length > SHOWN && (
          <button type="button" className="pf-link" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? L("Show less", "কম দেখান") : L(`Show all ${rows.length}`, `সব ${rows.length}টি দেখান`)}
          </button>
        )}
        <p className="pf-fine">
          {L(
            "Removing a row only changes this list. To change your shares, edit the holding itself.",
            "সারি মুছলে শুধু এই তালিকা বদলায়। শেয়ারের সংখ্যা বদলাতে হোল্ডিংটি এডিট করুন।",
          )}
        </p>
      </div>
    </PfCard>
  );
}
