"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  apiAddHolding,
  apiUpdateHolding,
  apiDeleteHolding,
  type PortfolioHolding,
} from "@/lib/api";
import { taka } from "@/lib/formatters";

type Mode = "buy" | "sell";

interface Props {
  mode: Mode;
  holding: PortfolioHolding;
  /** Live price — prefills the Buy price and colours the preview. */
  ltp: number | null;
  companyName?: string | null;
  onClose: () => void;
  /** Called with the server's authoritative holdings list after the trade. */
  onDone: (holdings: PortfolioHolding[]) => void;
}

type Preview =
  | { kind: "buy"; newQty: number; newAvg: number }
  | { kind: "sell-partial"; remaining: number }
  | { kind: "sell-all" }
  | { kind: "over-sell"; held: number };

/**
 * Buy / Sell a holding in transaction terms — no realized profit/loss, no ledger.
 *
 * Buy re-uses the backend's weighted-average merge (POST /holdings). Sell just
 * lowers the share count: a partial sale PUTs the reduced qty (average cost is
 * unchanged), selling everything DELETEs the holding. A live preview spells out
 * the resulting position so the outcome is never a surprise.
 */
export default function BuySellModal({ mode, holding, ltp, companyName, onClose, onDone }: Props) {
  const isBuy = mode === "buy";
  const accent = isBuy ? "var(--positive)" : "var(--negative)";

  const [qty, setQty] = useState("");
  const [price, setPrice] = useState(() => (isBuy && ltp != null ? String(ltp) : ""));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    qtyRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const canSubmit =
    !saving && preview != null && preview.kind !== "over-sell";

  const submitLabel = (() => {
    if (saving) return "Saving…";
    if (!preview || preview.kind === "over-sell") return isBuy ? "Buy" : "Sell";
    if (preview.kind === "buy") return `Buy ${qtyNum.toLocaleString()} shares`;
    if (preview.kind === "sell-all") return "Sell all & remove";
    return `Sell ${qtyNum.toLocaleString()} shares`;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!qtyValid) {
      return setError(isBuy ? "Enter how many shares you bought." : "Enter how many shares you sold.");
    }
    if (isBuy && !priceValid) return setError("Enter the price you bought at.");
    if (!isBuy && qtyNum > holding.qty) {
      return setError(`You only hold ${holding.qty.toLocaleString()} shares.`);
    }
    setSaving(true);
    try {
      let holdings: PortfolioHolding[];
      if (isBuy) {
        ({ holdings } = await apiAddHolding({
          trading_code: holding.trading_code,
          buy_price: priceNum,
          qty: qtyNum,
        }));
      } else if (qtyNum >= holding.qty) {
        ({ holdings } = await apiDeleteHolding(holding.id));
      } else {
        ({ holdings } = await apiUpdateHolding(holding.id, { qty: holding.qty - qtyNum }));
      }
      onDone(holdings);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buysell-title"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full sm:max-w-sm bg-[var(--surface)] border-t sm:border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="grid place-items-center w-9 h-9 rounded-lg shrink-0 font-bold text-lg leading-none"
              style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
              aria-hidden
            >
              {isBuy ? "+" : "−"}
            </span>
            <div className="min-w-0">
              <h3 id="buysell-title" className="text-lg font-bold text-[var(--text)] leading-tight">
                {isBuy ? "Buy" : "Sell"} <span className="font-mono">{holding.trading_code}</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] truncate leading-tight">
                {companyName ?? "Adjust your shares"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 -mr-1 shrink-0"
            aria-label="Close"
            disabled={saving}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L12 13.41 5.71 19.7 4.29 18.3 10.59 12 4.29 5.71 5.71 4.29 12 10.59l6.29-6.3z" />
            </svg>
          </button>
        </div>

        {/* Current position */}
        <div className="flex items-center justify-between rounded-lg bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface-2))] px-3 py-2 text-sm">
          <span className="text-[var(--text-muted)]">You own</span>
          <span className="text-[var(--text)] font-semibold tabular-nums nums">
            {holding.qty.toLocaleString()} sh @ {taka(holding.buy_price, 2)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isBuy ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text)]">Shares bought</label>
                <input
                  ref={qtyRef}
                  type="number"
                  placeholder="100"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="input-field text-lg w-full tabular-nums py-3"
                  aria-label="Shares bought"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text)]">Buy price (৳)</label>
                <input
                  type="number"
                  placeholder="295.50"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-field text-lg w-full tabular-nums py-3"
                  aria-label="Buy price"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--text)]">Shares sold</label>
                <button
                  type="button"
                  onClick={() => setQty(String(holding.qty))}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: accent }}
                >
                  Sell all ({holding.qty.toLocaleString()})
                </button>
              </div>
              <input
                ref={qtyRef}
                type="number"
                placeholder="50"
                min="1"
                step="1"
                max={holding.qty}
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="input-field text-lg w-full tabular-nums py-3"
                aria-label="Shares sold"
              />
            </div>
          )}

          {/* Live preview of the resulting position */}
          {preview && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                background:
                  preview.kind === "over-sell"
                    ? "color-mix(in srgb, var(--negative) 8%, transparent)"
                    : `color-mix(in srgb, ${accent} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${
                  preview.kind === "over-sell" ? "var(--negative)" : accent
                } 25%, transparent)`,
              }}
            >
              {preview.kind === "buy" && (
                <p className="text-[var(--text)] leading-relaxed">
                  <span className="font-semibold">New position:</span>{" "}
                  <span className="tabular-nums nums font-semibold">
                    {preview.newQty.toLocaleString()} sh @ {taka(preview.newAvg, 2)} avg
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                    was {holding.qty.toLocaleString()} @ {taka(holding.buy_price, 2)}
                  </span>
                </p>
              )}
              {preview.kind === "sell-partial" && (
                <p className="text-[var(--text)] leading-relaxed">
                  <span className="font-semibold">Remaining:</span>{" "}
                  <span className="tabular-nums nums font-semibold">
                    {preview.remaining.toLocaleString()} sh @ {taka(holding.buy_price, 2)} avg
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                    Average cost stays the same.
                  </span>
                </p>
              )}
              {preview.kind === "sell-all" && (
                <p className="text-[var(--text)] leading-relaxed">
                  Sells everything and{" "}
                  <span className="font-semibold" style={{ color: "var(--negative)" }}>
                    removes {holding.trading_code} from your portfolio.
                  </span>
                </p>
              )}
              {preview.kind === "over-sell" && (
                <p className="font-medium" style={{ color: "var(--negative)" }}>
                  You only hold {preview.held.toLocaleString()} shares.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-[var(--negative)] font-medium">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white font-semibold text-base transition-opacity disabled:opacity-50"
            style={{ background: accent }}
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
