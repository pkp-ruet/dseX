"use client";

import { useEffect, useRef, useState } from "react";
import { apiAddHolding, type PortfolioHolding, type ScoreItem } from "@/lib/api";
import Button from "@/components/ui/Button";

interface Props {
  allCodes: string[];
  priceMap: Map<string, ScoreItem>;
  existingCodes: Set<string>;
  onClose: () => void;
  /** Called with the server's authoritative holdings list after a successful add. */
  onAdded: (holdings: PortfolioHolding[]) => void;
}

const emptyForm = () => ({ trading_code: "", price: "", qty: "" });

/**
 * "Add stock" sheet — bottom-sheet on mobile, centered modal on desktop.
 * Same fields as the old inline form: code with type-ahead, price (prefilled
 * with the live price), quantity.
 */
export default function AddHoldingModal({ allCodes, priceMap, existingCodes, onClose, onAdded }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [saving, setSaving] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codeInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCodeInput(value: string) {
    const upper = value.toUpperCase();
    setForm((f) => ({ ...f, trading_code: upper }));
    setActiveSuggestion(-1);
    setSuggestions(upper.length === 0 ? [] : allCodes.filter((c) => c.startsWith(upper)).slice(0, 8));
  }

  function selectSuggestion(code: string) {
    setSuggestions([]);
    setActiveSuggestion(-1);
    const ltp = priceMap.get(code)?.ltp;
    setForm((f) => ({ ...f, trading_code: code, price: ltp != null ? String(ltp) : f.price }));
  }

  function handleCodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  const isHeld = existingCodes.has(form.trading_code.trim().toUpperCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = form.trading_code.trim().toUpperCase();
    const price = parseFloat(form.price);
    const qty = parseInt(form.qty, 10);
    if (!code) return setError("Stock code required.");
    if (isNaN(price) || price <= 0) return setError("Enter a valid buy price.");
    if (isNaN(qty) || qty <= 0) return setError("Enter a valid quantity.");
    setSaving(true);
    try {
      const res = await apiAddHolding({ trading_code: code, buy_price: price, qty });
      onAdded(res.holdings);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-holding-title"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full sm:max-w-sm bg-[var(--surface)] border-t sm:border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="add-holding-title" className="text-lg font-bold text-[var(--text)]">
            Add stock
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] p-1"
            aria-label="Close"
            disabled={saving}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L12 13.41 5.71 19.7 4.29 18.3 10.59 12 4.29 5.71 5.71 4.29 12 10.59l6.29-6.3z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Stock code */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-sm font-medium text-[var(--text)]">Stock Code</label>
            <input
              ref={codeInputRef}
              type="text"
              placeholder="e.g. GP"
              value={form.trading_code}
              onChange={(e) => handleCodeInput(e.target.value)}
              onKeyDown={handleCodeKeyDown}
              onBlur={() => setTimeout(() => setSuggestions([]), 150)}
              className="input-field text-base sm:text-lg uppercase font-mono py-2.5"
              maxLength={20}
              autoComplete="off"
              required
            />
            {suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-20 overflow-hidden">
                {suggestions.map((code, i) => (
                  <li
                    key={code}
                    onMouseDown={() => selectSuggestion(code)}
                    className={`px-4 py-3 text-base cursor-pointer font-mono font-semibold transition-colors ${
                      i === activeSuggestion
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--text)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {code}
                  </li>
                ))}
              </ul>
            )}
            {isHeld && (
              <p className="text-xs text-[var(--text-muted)]">
                Already held — adding will blend into a weighted-average cost.
              </p>
            )}
          </div>

          {/* Price + Qty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Buy Price (৳)</label>
              <input
                type="number"
                placeholder="295.50"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="input-field text-base sm:text-lg w-full tabular-nums py-2.5"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Quantity</label>
              <input
                type="number"
                placeholder="100"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                className="input-field text-base sm:text-lg w-full tabular-nums py-2.5"
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-[var(--negative)] font-medium">{error}</p>}

          <Button type="submit" disabled={saving} variant="primary" className="w-full">
            {saving ? "Saving…" : "Add to portfolio"}
          </Button>
        </form>
      </div>
    </div>
  );
}
