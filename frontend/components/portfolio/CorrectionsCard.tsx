"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import PfCard from "./PfCard";
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
 *
 * Look: a `PfCard`. The ones waiting for an OK sit in the card's one quiet
 * panel; the ones already added are hairline rows with a kind tag and Undo.
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
  const kindTag = (kind: string) =>
    kind === "bonus" ? L("Bonus shares", "বোনাস শেয়ার") : L("Cash dividend", "নগদ ডিভিডেন্ড");

  return (
    <PfCard
      title={L("Bonus shares and dividends", "বোনাস শেয়ার ও ডিভিডেন্ড")}

      note={L(
        "We add them to your holdings, so a bonus issue never looks like a loss.",
        "এগুলো আপনার হিসাবে যোগ হয়, তাই বোনাস শেয়ারকে কখনো লোকসান মনে হয় না।",
      )}
      lang={lang}
      dataCard="corrections"
    >
      <div className={`flex flex-col gap-5 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {suggestions.length > 0 && (
          <div className="rounded-lg bg-surface-2 p-4">
            <h4 className="text-sm font-bold text-text-main">
              {L(
                `${suggestions.length} from before. Did you receive ${suggestions.length === 1 ? "this" : "these"}?`,
                `আগের ${suggestions.length}টি। আপনি কি এগুলো পেয়েছিলেন?`,
              )}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              {L(
                "If you already changed your share count by hand, tap “Not mine” so it isn't added twice.",
                "শেয়ারের সংখ্যা আগেই নিজে ঠিক করে থাকলে “আমার না” চাপুন, যাতে দুবার যোগ না হয়।",
              )}
            </p>
            <ul className="pf-rows mt-2">
              {suggestions.map((s) => {
                const qty = qtyOf(s.code);
                const newShares = Math.floor((qty * (s.pct ?? 0)) / 100).toLocaleString();
                return (
                  <li key={s.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-text-main">{s.code}</span>
                        <Chip>{kindTag(s.kind)}</Chip>
                      </p>
                      <p className="mt-1 text-sm text-text-main">
                        {s.kind === "bonus" ? (
                          L(
                            `${s.pct}% bonus, about ${newShares} new shares`,
                            `${s.pct}% বোনাস, প্রায় ${newShares}টি নতুন শেয়ার`,
                          )
                        ) : (
                          <>
                            {L("About ", "প্রায় ")}
                            <span className="pv nums font-semibold">{takaGroup(qty * (s.cash_ps ?? 0))}</span>
                            {L(" before tax", " (কর বাদের আগে)")}
                          </>
                        )}
                      </p>
                      <p className="nums mt-0.5 text-xs text-text-muted">
                        {L("Record date", "রেকর্ড ডেট")} {formatDate(s.record_date)}
                      </p>
                    </div>
                    {!readOnly && (
                      <div className="flex shrink-0 gap-2">
                        <Button type="button" variant="primary" disabled={busy != null} onClick={() => run("apply", s.id)}>
                          {busy === s.id + "apply" ? "…" : L("Add it", "যোগ করুন")}
                        </Button>
                        <Button type="button" variant="quiet" disabled={busy != null} onClick={() => run("dismiss", s.id)}>
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
          <div>
            <h4 className="text-sm font-bold text-text-main">{L("Added for you", "আপনার হিসাবে যোগ হয়েছে")}</h4>
            <ul className="pf-rows mt-1">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-text-main">{e.code}</span>
                      <Chip>{kindTag(e.kind)}</Chip>
                    </p>
                    <p className="mt-1 text-sm text-text-main">
                      {e.kind === "bonus" ? (
                        L(
                          `+${(e.shares_added ?? 0).toLocaleString()} shares (${e.pct}%). Same total cost, so your average price is lower.`,
                          `+${(e.shares_added ?? 0).toLocaleString()}টি শেয়ার (${e.pct}%)। মোট খরচ একই, তাই গড় দাম কমেছে।`,
                        )
                      ) : (
                        <>
                          <span className="pv nums font-semibold">{takaGroup(e.amount ?? 0)}</span>
                          {L(
                            ` on ${(e.qty ?? 0).toLocaleString()} shares`,
                            `, ${(e.qty ?? 0).toLocaleString()}টি শেয়ারে`,
                          )}
                        </>
                      )}
                    </p>
                    <p className="nums mt-0.5 text-xs text-text-muted">
                      {L("Record date", "রেকর্ড ডেট")} {formatDate(e.record_date)}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button type="button" variant="link" disabled={busy != null} onClick={() => run("undo", e.id)}>
                      {busy === e.id + "undo" ? "…" : L("Undo", "বাতিল")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="pf-fine">
              {L(
                "We add these when a record date passes for a stock you had in the app before it. Undo if you bought too late.",
                "রেকর্ড ডেটের আগে থেকে শেয়ারটি অ্যাপে থাকলে আমরা এগুলো যোগ করি। দেরিতে কিনে থাকলে বাতিল করুন।",
              )}
            </p>
          </div>
        )}
      </div>
    </PfCard>
  );
}
