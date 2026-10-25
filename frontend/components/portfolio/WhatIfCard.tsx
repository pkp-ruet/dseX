"use client";

import { useId, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Bn from "@/components/i18n/Bn";
import { takaGroup } from "@/lib/formatters";
import { analyzePortfolio, type AnalysisLang, type ComputedRow, type PortfolioAnalysis } from "@/lib/portfolio-analysis";
import type { ScoreItem } from "@/lib/api";

function rowFor(code: string, qty: number, price: number, ltp: number | null, name: string | null): ComputedRow {
  const cost = qty * price;
  const value = ltp != null ? qty * ltp : null;
  const pnl = value != null ? value - cost : null;
  return {
    holding: { id: code, trading_code: code, qty, buy_price: price, added_at: new Date().toISOString().slice(0, 10) },
    ltp,
    company_name: name,
    cost_basis: cost,
    current_value: value,
    pnl,
    pnl_pct: pnl != null && cost > 0 ? (pnl / cost) * 100 : null,
  };
}

/** The portfolio after selling `sellQty` of `sellCode` and putting `buyAmount` into `buyCode` at today's price. */
function simulate(
  rows: ComputedRow[],
  priceMap: Map<string, ScoreItem>,
  sellCode: string,
  sellQty: number,
  buyCode: string,
  buyAmount: number,
): ComputedRow[] {
  let out = rows.map((r) => {
    if (r.holding.trading_code !== sellCode || sellQty <= 0) return r;
    const left = r.holding.qty - sellQty;
    return left > 0 ? rowFor(r.holding.trading_code, left, r.holding.buy_price, r.ltp, r.company_name) : null;
  }).filter((r): r is ComputedRow => r != null);
  const item = priceMap.get(buyCode);
  const ltp = item?.ltp ?? null;
  if (buyCode && ltp && buyAmount > 0) {
    const qty = Math.floor(buyAmount / ltp);
    if (qty > 0) {
      const existing = out.find((r) => r.holding.trading_code === buyCode);
      if (existing) {
        const q = existing.holding.qty + qty;
        const avg = (existing.holding.qty * existing.holding.buy_price + qty * ltp) / q;
        out = out.map((r) => (r === existing ? rowFor(buyCode, q, avg, ltp, r.company_name) : r));
      } else {
        out = [...out, rowFor(buyCode, qty, ltp, ltp, item?.company_name ?? null)];
      }
    }
  }
  return out;
}

const biggest = (a: PortfolioAnalysis) => [...a.holdings].sort((x, y) => y.weightPct - x.weightPct)[0];

function Delta({ before, after, label, fmt = (v: number) => String(Math.round(v)) }: {
  before: number;
  after: number;
  label: string;
  fmt?: (v: number) => string;
}) {
  const d = after - before;
  const tone = Math.abs(d) < 0.05 ? "text-text-muted" : d > 0 ? "text-positive" : "text-negative";
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-sm text-text-main">{label}</span>
      <span className="nums text-sm font-semibold">
        <span className="text-text-muted">{fmt(before)}</span> <span aria-hidden>→</span>{" "}
        <span className={tone}>{fmt(after)}</span>
      </span>
    </div>
  );
}

/**
 * "What if I…" — try a sale and/or a buy and see the portfolio grade, its
 * three sub-scores, the spread and the biggest position before acting. Runs
 * the same `analyzePortfolio` engine as the grade above, on a copy of the
 * holdings priced at today's close. Nothing is saved. Premium: for free readers
 * PortfolioClient renders it inside the page's one lock.
 */
export default function WhatIfCard({
  rows,
  priceMap,
  allCodes,
  lang,
}: {
  rows: ComputedRow[];
  priceMap: Map<string, ScoreItem>;
  allCodes: string[];
  lang: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const ids = useId();
  const [sellCode, setSellCode] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [buyCode, setBuyCode] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  const sellRow = rows.find((r) => r.holding.trading_code === sellCode) ?? null;
  const qtyNum = Math.min(sellRow?.holding.qty ?? 0, Math.max(0, parseInt(sellQty || "0", 10) || 0));
  const proceeds = sellRow?.ltp != null ? qtyNum * sellRow.ltp : 0;
  const buyNorm = buyCode.trim().toUpperCase();
  const buyItem = priceMap.get(buyNorm);
  const amountNum = buyAmount === "" ? proceeds : Math.max(0, parseFloat(buyAmount) || 0);

  const before = useMemo(() => analyzePortfolio(rows, priceMap, lang), [rows, priceMap, lang]);
  const afterRows = useMemo(
    () => simulate(rows, priceMap, sellCode, qtyNum, buyItem ? buyNorm : "", amountNum),
    [rows, priceMap, sellCode, qtyNum, buyItem, buyNorm, amountNum],
  );
  const changed = qtyNum > 0 || (buyItem != null && amountNum >= (buyItem.ltp ?? Infinity));
  const after = useMemo(
    () => (changed && afterRows.length ? analyzePortfolio(afterRows, priceMap, lang) : null),
    [changed, afterRows, priceMap, lang],
  );

  if (rows.length === 0) return null;

  const body = (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3">
          <legend className={`text-sm font-semibold text-text-main ${bn ? "font-bn" : ""}`}>{L("1. Sell", "1. বিক্রি")}</legend>
          <label htmlFor={`${ids}-sc`} className="sr-only">{L("Stock to sell", "যে শেয়ার বিক্রি")}</label>
          <select
            id={`${ids}-sc`}
            value={sellCode}
            onChange={(e) => {
              setSellCode(e.target.value);
              const r = rows.find((x) => x.holding.trading_code === e.target.value);
              setSellQty(r ? String(r.holding.qty) : "");
            }}
            className="input-field font-mono"
          >
            <option value="">{L("Nothing", "কিছু না")}</option>
            {rows.map((r) => (
              <option key={r.holding.trading_code} value={r.holding.trading_code}>
                {r.holding.trading_code} ({r.holding.qty.toLocaleString()})
              </option>
            ))}
          </select>
          {sellRow && (
            <>
              <label htmlFor={`${ids}-sq`} className="text-xs font-semibold text-text-muted">{L("Shares", "শেয়ার")}</label>
              <input
                id={`${ids}-sq`}
                type="number"
                inputMode="numeric"
                min={1}
                max={sellRow.holding.qty}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                className="input-field tabular-nums"
              />
              <p className="nums text-xs text-text-muted">
                {L("At today's price ≈", "আজকের দামে ≈")} {takaGroup(proceeds)}
              </p>
            </>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3">
          <legend className={`text-sm font-semibold text-text-main ${bn ? "font-bn" : ""}`}>{L("2. Buy", "2. কেনা")}</legend>
          <label htmlFor={`${ids}-bc`} className="sr-only">{L("Stock to buy", "যে শেয়ার কিনবেন")}</label>
          <input
            id={`${ids}-bc`}
            list={`${ids}-codes`}
            value={buyCode}
            onChange={(e) => setBuyCode(e.target.value)}
            placeholder={L("Stock code, e.g. GP", "শেয়ারের কোড, যেমন GP")}
            className="input-field font-mono uppercase"
            autoComplete="off"
          />
          <datalist id={`${ids}-codes`}>
            {allCodes.slice(0, 800).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <label htmlFor={`${ids}-ba`} className="text-xs font-semibold text-text-muted">{L("Amount (৳)", "টাকা (৳)")}</label>
          <input
            id={`${ids}-ba`}
            type="number"
            inputMode="decimal"
            min={0}
            value={buyAmount}
            placeholder={proceeds > 0 ? String(Math.round(proceeds)) : "10000"}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="input-field tabular-nums"
          />
          {buyNorm && !buyItem && <p className="text-xs text-negative">{L("No price for that code.", "এই কোডের দাম নেই।")}</p>}
          {buyItem?.ltp != null && amountNum > 0 && (
            <p className="nums text-xs text-text-muted">
              ≈ {Math.floor(amountNum / buyItem.ltp).toLocaleString()} {L("shares at", "টি শেয়ার,")} {takaGroup(buyItem.ltp)}
            </p>
          )}
        </fieldset>
      </div>

      {after ? (
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm font-semibold text-text-main ${bn ? "font-bn" : ""}`}>{L("Your grade", "আপনার গ্রেড")}</p>
            <p className="nums text-2xl font-bold">
              <span className="text-text-muted">{before.grade}</span> <span aria-hidden>→</span>{" "}
              <span className={after.subScores.overall >= before.subScores.overall ? "text-positive" : "text-negative"}>{after.grade}</span>
            </p>
          </div>
          <div className={`divide-y divide-border ${bn ? "font-bn" : ""}`}>
            <Delta label={L("Spread", "ছড়ানো")} before={before.subScores.spread} after={after.subScores.spread} />
            <Delta label={L("Company quality", "কোম্পানির মান")} before={before.subScores.quality} after={after.subScores.quality} />
            <Delta label={L("Price paid", "কেনার দাম")} before={before.subScores.entry} after={after.subScores.entry} />
            <Delta
              label={L("Behaves like this many stocks", "যত শেয়ারের মতো আচরণ")}
              before={before.effectiveStocks}
              after={after.effectiveStocks}
              fmt={(v) => v.toFixed(1)}
            />
            <Delta
              label={L(`Biggest holding (${biggest(after)?.code ?? "—"})`, `সবচেয়ে বড় শেয়ার (${biggest(after)?.code ?? "—"})`)}
              before={biggest(before)?.weightPct ?? 0}
              after={biggest(after)?.weightPct ?? 0}
              fmt={(v) => `${Math.round(v)}%`}
            />
          </div>
          {after.bad[0] && (
            <p className={`mt-2 text-sm text-text-main ${bn ? "font-bn" : ""}`}>
              <span className="font-semibold">{L("Still to watch: ", "এখনো খেয়াল রাখুন: ")}</span>
              {after.bad[0]}
            </p>
          )}
          <p className={`mt-2 text-xs text-text-muted ${bn ? "font-bn" : ""}`}>
            {L(
              "Priced at today's close, before fees. Nothing is saved — this is only a check, not advice.",
              "আজকের ক্লোজ দামে, খরচ বাদের আগে। কিছুই সেভ হয় না — এটি শুধু যাচাই, পরামর্শ নয়।",
            )}
          </p>
        </div>
      ) : (
        <p className={`text-sm text-text-muted ${bn ? "font-bn" : ""}`}>
          {L("Pick a stock to sell, a stock to buy, or both.", "বিক্রি বা কেনার জন্য একটি শেয়ার বাছুন, বা দুটোই।")}
        </p>
      )}
    </div>
  );

  return (
    <Card padding="none" className="p-5 sm:p-6" data-card="what-if">
      <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {L("What if I…", "যদি আমি…")}
      </h2>
      {!bn && <Bn className="text-sm text-text-muted">কিছু বেচা বা কেনার আগে দেখে নিন গ্রেড কেমন হবে।</Bn>}
      <p className={`mb-4 mt-1 text-sm text-text-muted ${bn ? "font-bn" : ""}`}>
        {L(
          "Try a sale or a buy and see your grade before you act.",
          "একটি বিক্রি বা কেনা চেষ্টা করে দেখুন, কিছু করার আগেই গ্রেড জানুন।",
        )}
      </p>
      {body}
    </Card>
  );
}
