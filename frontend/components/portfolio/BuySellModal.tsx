"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  apiAddHolding,
  apiSellHolding,
  type PortfolioHolding,
  type PortfolioLogEntry,
} from "@/lib/api";
import { taka, takaGroup } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

type Mode = "buy" | "sell";

interface Props {
  mode: Mode;
  holding: PortfolioHolding;
  /** Live price — prefills the price field. */
  ltp: number | null;
  companyName?: string | null;
  onClose: () => void;
  /** Called with the server's authoritative holdings (and log) after the trade. */
  onDone: (holdings: PortfolioHolding[], log?: PortfolioLogEntry[]) => void;
  /** Which portfolio (absent = the main one). */
  pid?: string;
  lang?: AnalysisLang;
}

type Preview =
  | { kind: "buy"; newQty: number; newAvg: number }
  | { kind: "sell-partial"; remaining: number }
  | { kind: "sell-all" }
  | { kind: "over-sell"; held: number };

const n = (v: number) => v.toLocaleString("en-IN");

/**
 * "Bought more" / "Sold" on a holding — both are written to the portfolio log.
 * On the shared `ui/Sheet` (2026-10-26 redesign): bottom sheet on phones,
 * dialog from 640px.
 *
 * Buy re-uses the backend's weighted-average merge (POST /holdings). Sell goes
 * through POST /holdings/:id/sell with the sale price, so the profit
 * (price − average cost) is kept in the history instead of vanishing with the
 * shares; the average cost of what is left is unchanged, and selling
 * everything removes the holding. A live "after this" panel spells out the
 * resulting position and the profit, so the outcome is never a surprise.
 */
export default function BuySellModal({ mode, holding, ltp, companyName, onClose, onDone, pid, lang = "en" }: Props) {
  const isBuy = mode === "buy";
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const bnCls = bn ? "font-bn" : "";

  const [qty, setQty] = useState("");
  const [price, setPrice] = useState(() => (ltp != null ? String(ltp) : ""));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  // The Sheet focuses its panel on open; move focus to the first field after it.
  useEffect(() => {
    const t = setTimeout(() => qtyRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const qtyNum = parseInt(qty, 10);
  const priceNum = parseFloat(price);
  const qtyValid = !isNaN(qtyNum) && qtyNum > 0;
  const priceValid = !isNaN(priceNum) && priceNum > 0;

  const preview = useMemo<Preview | null>(() => {
    if (!qtyValid) return null;
    if (isBuy) {
      if (!priceValid) return null;
      const newQty = holding.qty + qtyNum;
      const newAvg = (holding.qty * holding.buy_price + qtyNum * priceNum) / newQty;
      return { kind: "buy", newQty, newAvg };
    }
    if (qtyNum > holding.qty) return { kind: "over-sell", held: holding.qty };
    if (qtyNum === holding.qty) return { kind: "sell-all" };
    return { kind: "sell-partial", remaining: holding.qty - qtyNum };
  }, [isBuy, qtyValid, priceValid, qtyNum, priceNum, holding.qty, holding.buy_price]);

  const canSubmit = !saving && preview != null && preview.kind !== "over-sell" && priceValid;
  // Profit on this sale: shares sold × (sale price − average cost), before fees.
  const saleProfit =
    !isBuy && qtyValid && priceValid && qtyNum <= holding.qty ? qtyNum * (priceNum - holding.buy_price) : null;

  const submitLabel = (() => {
    if (saving) return L("Saving…", "সেভ হচ্ছে…");
    if (!preview || preview.kind === "over-sell") return isBuy ? L("Save the buy", "কেনা সেভ করুন") : L("Save the sale", "বিক্রি সেভ করুন");
    if (preview.kind === "buy") return L(`Save: bought ${n(qtyNum)} shares`, `সেভ: ${n(qtyNum)}টি কেনা`);
    if (preview.kind === "sell-all") return L("Save: sold all", "সেভ: সব বিক্রি");
    return L(`Save: sold ${n(qtyNum)} shares`, `সেভ: ${n(qtyNum)}টি বিক্রি`);
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!qtyValid) {
      return setError(isBuy ? L("Enter how many shares you bought.", "কয়টি শেয়ার কিনেছেন লিখুন।") : L("Enter how many shares you sold.", "কয়টি শেয়ার বিক্রি করেছেন লিখুন।"));
    }
    if (!priceValid) return setError(isBuy ? L("Enter the price you bought at.", "কেনার দাম লিখুন।") : L("Enter the price you sold at.", "বিক্রির দাম লিখুন।"));
    if (!isBuy && qtyNum > holding.qty) {
      return setError(L(`You only hold ${n(holding.qty)} shares.`, `আপনার কাছে মাত্র ${n(holding.qty)}টি শেয়ার আছে।`));
    }
    setSaving(true);
    try {
      if (isBuy) {
        const res = await apiAddHolding({ trading_code: holding.trading_code, buy_price: priceNum, qty: qtyNum }, pid);
        onDone(res.holdings, res.log);
      } else {
        const res = await apiSellHolding(holding.id, { qty: qtyNum, price: priceNum }, pid);
        onDone(res.holdings, res.log);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : L("Something went wrong.", "কিছু একটা ভুল হয়েছে।"));
      setSaving(false);
    }
  }

  const title = isBuy
    ? L(`You bought more ${holding.trading_code}`, `আরও ${holding.trading_code} কিনেছেন`)
    : L(`You sold ${holding.trading_code}`, `${holding.trading_code} বিক্রি করেছেন`);

  return (
    <Sheet open onClose={onClose} dismissible={!saving} title={title} bn={!bn ? (companyName ?? undefined) : undefined}>
      <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${bnCls}`} lang={bn ? "bn" : undefined}>
        {/* What they hold now */}
        <div className="flex items-baseline justify-between gap-3 border-b border-cell-rule pb-3 text-sm">
          <span className="text-text-muted">{L("You own now", "এখন আছে")}</span>
          <span className="pv nums font-semibold text-text-main">
            {L(`${n(holding.qty)} shares at ${taka(holding.buy_price, 2)}`, `${n(holding.qty)}টি, গড় ${taka(holding.buy_price, 2)}`)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex min-h-6 items-center justify-between gap-2">
              <label htmlFor="bs-qty" className="text-sm font-semibold text-text-main">
                {isBuy ? L("Shares bought", "কয়টি কিনেছেন") : L("Shares sold", "কয়টি বিক্রি")}
              </label>
            </div>
            <input
              id="bs-qty"
              ref={qtyRef}
              type="number"
              placeholder={isBuy ? "100" : "50"}
              min="1"
              step="1"
              max={isBuy ? undefined : holding.qty}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="input-field w-full py-3 text-lg tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex min-h-6 items-center">
              <label htmlFor="bs-price" className="text-sm font-semibold text-text-main">
                {isBuy ? L("Price paid (৳)", "কেনার দাম (৳)") : L("Price sold at (৳)", "বিক্রির দাম (৳)")}
              </label>
            </div>
            <input
              id="bs-price"
              type="number"
              placeholder="295.50"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input-field w-full py-3 text-lg tabular-nums"
            />
          </div>
        </div>
        {!isBuy && (
          <Button type="button" variant="link" size="sm" onClick={() => setQty(String(holding.qty))} className="-mt-2 self-start -ml-2">
            {L(`Sold all ${n(holding.qty)}`, `সব ${n(holding.qty)}টি বিক্রি`)}
          </Button>
        )}

        {/* After this — the resulting position, in one quiet panel */}
        {preview && (
          <div className="rounded-lg bg-surface-2 px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-text-muted">{L("After this", "এরপর")}</p>
            {preview.kind === "buy" && (
              <p className="mt-1 text-text-main">
                <span className="pv nums font-bold">
                  {L(`${n(preview.newQty)} shares at ${taka(preview.newAvg, 2)} average`, `${n(preview.newQty)}টি, গড় দাম ${taka(preview.newAvg, 2)}`)}
                </span>
                <span className="block text-text-muted">
                  {L(`Was ${n(holding.qty)} at ${taka(holding.buy_price, 2)}.`, `আগে ছিল ${n(holding.qty)}টি, ${taka(holding.buy_price, 2)}।`)}
                </span>
              </p>
            )}
            {preview.kind === "sell-partial" && (
              <p className="mt-1 text-text-main">
                <span className="pv nums font-bold">
                  {L(`${n(preview.remaining)} shares left`, `${n(preview.remaining)}টি থাকবে`)}
                </span>
                <span className="block text-text-muted">{L("The average price you paid stays the same.", "কেনার গড় দাম একই থাকবে।")}</span>
              </p>
            )}
            {preview.kind === "sell-all" && (
              <p className="mt-1 font-semibold text-text-main">
                {L(`${holding.trading_code} comes off your portfolio.`, `${holding.trading_code} পোর্টফোলিও থেকে সরে যাবে।`)}
              </p>
            )}
            {preview.kind === "over-sell" && (
              <p className="mt-1 font-semibold text-negative">
                {L(`You only hold ${n(preview.held)} shares.`, `আপনার কাছে মাত্র ${n(preview.held)}টি শেয়ার আছে।`)}
              </p>
            )}
            {saleProfit != null && (
              <p className="mt-2 border-t border-border pt-2 text-text-main">
                {saleProfit >= 0 ? L("Profit on this sale", "এই বিক্রিতে লাভ") : L("Loss on this sale", "এই বিক্রিতে লোকসান")}{" "}
                <b className={`pv nums ${saleProfit >= 0 ? "text-positive" : "text-negative"}`}>
                  {saleProfit >= 0 ? "+" : "−"}
                  {takaGroup(Math.abs(saleProfit))}
                </b>
                <span className="block text-text-muted">{L("Kept in your history, before brokerage fees.", "ইতিহাসে থাকবে, ব্রোকারেজ খরচ বাদের আগে।")}</span>
              </p>
            )}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <Button type="submit" variant="primary" size="lg" block disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </form>
    </Sheet>
  );
}
