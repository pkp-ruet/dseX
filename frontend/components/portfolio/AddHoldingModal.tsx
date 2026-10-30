"use client";

import { useEffect, useRef, useState } from "react";
import { apiAddHolding, type PortfolioHolding, type PortfolioLogEntry, type ScoreItem } from "@/lib/api";
import { taka } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { isLimitError } from "@/lib/premium";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

interface Props {
  allCodes: string[];
  priceMap: Map<string, ScoreItem>;
  existingCodes: Set<string>;
  onClose: () => void;
  /** Called with the server's authoritative holdings (and log) after a successful add. */
  onAdded: (holdings: PortfolioHolding[], log?: PortfolioLogEntry[]) => void;
  /** Which portfolio (absent = the main one). */
  pid?: string;
  lang?: AnalysisLang;
}

const emptyForm = () => ({ trading_code: "", price: "", qty: "" });

/**
 * "Add a stock" — on the shared `ui/Sheet` (2026-10-26 redesign): bottom
 * sheet on phones, dialog from 640px. Code with type-ahead (company name
 * beside each code), price prefilled with today's price, quantity.
 */
export default function AddHoldingModal({ allCodes, priceMap, existingCodes, onClose, onAdded, pid, lang = "en" }: Props) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [saving, setSaving] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // The Sheet focuses its panel on open; move focus to the code field after it.
  useEffect(() => {
    const t = setTimeout(() => codeInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
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
      e.stopPropagation();
      setSuggestions([]);
    }
  }

  const code = form.trading_code.trim().toUpperCase();
  const isHeld = existingCodes.has(code);
  const picked = priceMap.get(code);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const price = parseFloat(form.price);
    const qty = parseInt(form.qty, 10);
    if (!code) return setError(L("Type the stock code.", "শেয়ারের কোড লিখুন।"));
    if (isNaN(price) || price <= 0) return setError(L("Enter the price you paid.", "কেনার দাম লিখুন।"));
    if (isNaN(qty) || qty <= 0) return setError(L("Enter how many shares.", "কয়টি শেয়ার লিখুন।"));
    setSaving(true);
    try {
      const res = await apiAddHolding({ trading_code: code, buy_price: price, qty }, pid);
      onAdded(res.holdings, res.log);
      onClose();
    } catch (err: unknown) {
      if (isLimitError(err, "holdings")) {
        onClose();
        return showLimitNotice("holdings");
      }
      setError(err instanceof Error ? err.message : L("We couldn't add it. Please try again.", "যোগ করা যায়নি। আবার চেষ্টা করুন।"));
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!saving}
      title={L("Add a stock you own", "আপনার একটি শেয়ার যোগ করুন")}

    >
      <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {/* Stock code */}
        <div className="relative flex flex-col gap-1.5">
          <label htmlFor="ah-1" className="text-sm font-semibold text-text-main">
            {L("Stock code", "শেয়ারের কোড")}
          </label>
          <input
            id="ah-1"
            ref={codeInputRef}
            type="text"
            placeholder={L("e.g. GP", "যেমন GP")}
            value={form.trading_code}
            onChange={(e) => handleCodeInput(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            className="input-field py-3 text-lg font-semibold"
            maxLength={20}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="ah-list"
            required
          />
          {suggestions.length > 0 && (
            // Opens UPWARD on phones (the sheet is pinned to the bottom, so a
            // downward list ran off-screen) and scrolls past ~4 rows.
            <ul
              id="ah-list"
              role="listbox"
              className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lift sm:bottom-auto sm:top-full sm:mb-0 sm:mt-1"
            >
              {suggestions.map((c, i) => (
                <li
                  key={c}
                  role="option"
                  aria-selected={i === activeSuggestion}
                  onMouseDown={() => selectSuggestion(c)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                    i === activeSuggestion ? "bg-surface-2" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="text-sm font-bold text-text-main">{c}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{priceMap.get(c)?.company_name ?? ""}</span>
                  {existingCodes.has(c) && <span className="text-xs font-semibold text-text-muted">{L("You own it", "আছে")}</span>}
                </li>
              ))}
            </ul>
          )}
          {picked?.company_name && (
            <p className="text-sm text-text-muted">
              {picked.company_name}
              {picked.ltp != null ? ` · ${L("price today", "আজকের দাম")} ${taka(picked.ltp, 2)}` : ""}
            </p>
          )}
          {isHeld && (
            <p className="text-sm text-text-muted">
              {L(
                "You already own this. The new shares join the old ones at one average price.",
                "এটি আগে থেকেই আছে। নতুন শেয়ার পুরোনোগুলোর সাথে এক গড় দামে যোগ হবে।",
              )}
            </p>
          )}
        </div>

        {/* Price + Qty */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ah-2" className="text-sm font-semibold text-text-main">{L("Price you paid (৳)", "কেনার দাম (৳)")}</label>
            <input
              id="ah-2"
              type="number"
              placeholder="295.50"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="input-field w-full py-3 text-lg tabular-nums"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ah-3" className="text-sm font-semibold text-text-main">{L("Shares", "শেয়ারের সংখ্যা")}</label>
            <input
              id="ah-3"
              type="number"
              placeholder="100"
              min="1"
              step="1"
              inputMode="numeric"
              value={form.qty}
              onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
              className="input-field w-full py-3 text-lg tabular-nums"
              required
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <Button type="submit" disabled={saving} variant="primary" size="lg" block>
          {saving ? L("Saving…", "সেভ হচ্ছে…") : L("Add to my portfolio", "পোর্টফোলিওতে যোগ করুন")}
        </Button>
      </form>
    </Sheet>
  );
}
