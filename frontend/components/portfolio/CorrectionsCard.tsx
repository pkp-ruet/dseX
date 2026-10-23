"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { formatDate, takaGroup } from "@/lib/formatters";
import { recentCorrections } from "@/lib/portfolio-ledger";
import type { CorporateActionSuggestion, PortfolioHolding, PortfolioLogEntry } from "@/lib/api";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/**
 * Bonus shares and cash dividends, kept right on the holding.
 *
 * - Applied lately (by the daily job): one line each, with Undo — for a reader
 *   who bought too late for the record date, or already fixed it by hand.
 * - Waiting for an OK: record dates from before this feature shipped, on a
 *   stock the reader already had. Apply adds the shares (same total cost, so
 *   the average falls) or records the cash; "Not mine" hides it for good.
 *
 * Without the bonus fix a 10% bonus issue reads as a 10% loss: the price drops
 * on the record date while the share count stayed the same.
 */
export default function CorrectionsCard({
  log,
  suggestions,
  holdings,
  lang,
  readOnly = false,
  onAction,
}: {
  log: PortfolioLogEntry[];
  suggestions: CorporateActionSuggestion[];
  holdings: PortfolioHolding[];
  lang: AnalysisLang;
  readOnly?: boolean;
  onAction: (verb: "apply" | "dismiss" | "undo", id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const recent = recentCorrections(log).slice(0, 4);
  if (!recent.length && !suggestions.length) return null;

  const qtyOf = (code: string) => holdings.find((h) => h.trading_code === code)?.qty ?? 0;
  const run = async (verb: "apply" | "dismiss" | "undo", id: string) => {
    setBusy(id + verb);
    try {
      await onAction(verb, id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card padding="none" className="p-5 sm:p-6" data-card="corrections">
      <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {L("Bonus shares and dividends", "বোনাস শেয়ার ও ডিভিডেন্ড")}
      </h2>
      {!bn && <Bn className="text-sm text-text-muted">বোনাস শেয়ার আর নগদ ডিভিডেন্ড আপনার হিসাবে যোগ হয়।</Bn>}

      {suggestions.length > 0 && (
        <div className="mt-4">
          <p className={`text-sm font-semibold text-text-main ${bn ? "font-bn" : ""}`}>
            {L(
              `${suggestions.length} from before — did you get ${suggestions.length === 1 ? "this" : "these"}?`,
              `আগের ${suggestions.length}টি — আপনি কি এগুলো পেয়েছিলেন?`,
            )}
          </p>
          <p className={`text-sm text-text-muted ${bn ? "font-bn" : ""}`}>
            {L(
              "If you already changed your share count by hand, tap “Not mine” so it isn't added twice.",
              "শেয়ারের সংখ্যা আগেই নিজে ঠিক করে থাকলে “আমার না” চাপুন, যাতে দুবার যোগ না হয়।",
            )}
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {suggestions.map((s) => {
              const qty = qtyOf(s.code);
              const what =
                s.kind === "bonus"
                  ? L(
                      `${s.pct}% bonus — about ${Math.floor((qty * (s.pct ?? 0)) / 100).toLocaleString()} new shares`,
                      `${s.pct}% বোনাস — প্রায় ${Math.floor((qty * (s.pct ?? 0)) / 100).toLocaleString()}টি নতুন শেয়ার`,
                    )
                  : L(
                      `Cash dividend — about ${takaGroup(qty * (s.cash_ps ?? 0))} (before tax)`,
                      `নগদ ডিভিডেন্ড — প্রায় ${takaGroup(qty * (s.cash_ps ?? 0))} (কর বাদের আগে)`,
                    );
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-bold text-text-main">{s.code}</p>
                    <p className={`text-sm text-text-main ${bn ? "font-bn" : ""}`}>{what}</p>
                    <p className="text-xs text-text-muted">
                      {L("Record date", "রেকর্ড ডেট")} {formatDate(s.record_date)}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="primary" disabled={busy != null} onClick={() => run("apply", s.id)}>
                        {busy === s.id + "apply" ? "…" : L("Add it", "যোগ করুন")}
                      </Button>
                      <Button type="button" size="sm" variant="quiet" disabled={busy != null} onClick={() => run("dismiss", s.id)}>
                        {L("Not mine", "আমার না")}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div className={suggestions.length ? "mt-4 border-t border-border pt-4" : "mt-4"}>
          <p className={`text-sm font-semibold text-text-main ${bn ? "font-bn" : ""}`}>
            {L("Added for you", "আপনার হিসাবে যোগ হয়েছে")}
          </p>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm text-text-main ${bn ? "font-bn" : ""}`}>
                    <span className="font-mono font-bold">{e.code}</span>{" "}
                    {e.kind === "bonus"
                      ? L(
                          `+${(e.shares_added ?? 0).toLocaleString()} bonus shares (${e.pct}%) — your average cost is now lower, your total cost is the same`,
                          `+${(e.shares_added ?? 0).toLocaleString()}টি বোনাস শেয়ার (${e.pct}%) — গড় দাম কমেছে, মোট খরচ একই`,
                        )
                      : L(
                          `${takaGroup(e.amount ?? 0)} cash dividend on ${(e.qty ?? 0).toLocaleString()} shares`,
                          `${(e.qty ?? 0).toLocaleString()}টি শেয়ারে ${takaGroup(e.amount ?? 0)} নগদ ডিভিডেন্ড`,
                        )}
                  </p>
                  <p className="text-xs text-text-muted">
                    {L("Record date", "রেকর্ড ডেট")} {formatDate(e.record_date)}
                  </p>
                </div>
                {!readOnly && (
                  <Button type="button" size="sm" variant="link" disabled={busy != null} onClick={() => run("undo", e.id)}>
                    {busy === e.id + "undo" ? "…" : L("Undo", "বাতিল")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <p className={`mt-1 text-xs text-text-muted ${bn ? "font-bn" : ""}`}>
            {L(
              "We add these when a record date passes for a stock you had in the app before it. Undo if you bought too late.",
              "রেকর্ড ডেটের আগে থেকে শেয়ারটি অ্যাপে থাকলে আমরা এগুলো যোগ করি। দেরিতে কিনে থাকলে বাতিল করুন।",
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
