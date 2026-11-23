"use client";

import { useEffect, useRef, useState } from "react";
import { apiAddHolding, type PortfolioHolding, type PortfolioLogEntry, type ScoreItem } from "@/lib/api";
import { taka } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import type { AnalysisLang } from "@/lib/portfolio-analysis";
import BeforeYouSave from "./BeforeYouSave";
import { toast } from "@/lib/toast";
import { T } from "@/components/i18n/T";
import { watchItAction } from "@/components/watch-rules/watchItAction";
import { loadWatchRules } from "@/components/watch-rules/store";

interface Props {
  allCodes: string[];
  priceMap: Map<string, ScoreItem>;
  existingCodes: Set<string>;
  /** The open portfolio's holdings, for "Before you save" (2026-11-11). */
  holdings?: PortfolioHolding[];
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
export default function AddHoldingModal({ allCodes, priceMap, existingCodes, holdings = [], onClose, onAdded, pid, lang = "en" }: Props) {
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

  // Codes to search: every listed code, else (before they have loaded) the scored ones.
  const pool = allCodes.length ? allCodes : [...priceMap.keys()];

  /** Codes starting with what was typed first, then codes containing it, then
   *  company names containing it ("grameen" finds GP). */
  function findCodes(q: string): string[] {
    const upper = q.trim().toUpperCase();
    if (!upper) return [];
    const starts: string[] = [];
    const inCode: string[] = [];
    const inName: string[] = [];
    for (const c of pool) {
      if (c.startsWith(upper)) starts.push(c);
      else if (c.includes(upper)) inCode.push(c);
      else if (upper.length >= 3 && (priceMap.get(c)?.company_name ?? "").toUpperCase().includes(upper)) inName.push(c);
    }
    return [...starts, ...inCode, ...inName].slice(0, 8);
  }

  function handleCodeInput(value: string) {
    const upper = value.toUpperCase();
    setForm((f) => ({ ...f, trading_code: upper }));
    setActiveSuggestion(-1);
    setSuggestions(findCodes(upper));
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
    loadWatchRules();
    try {
      const res = await apiAddHolding({ trading_code: code, buy_price: price, qty }, pid);
      onAdded(res.holdings, res.log);
      onClose();
      // A new share: offer its rules while the reader is thinking about it.
      const watch = isHeld ? undefined : watchItAction(code, null, "buy");
      if (watch) {
        toast({
          message: <T en={`${code} is now in your portfolio`} bn={`${code} আপনার পোর্টফোলিওতে যোগ হয়েছে`} />,
          tone: "success",
          action: watch,
        });
      }
    } catch (err: unknown) {
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ah-1" className="text-sm font-semibold text-text-main">
            {L("Stock code", "শেয়ারের কোড")}
          </label>
          <input
            id="ah-1"
            ref={codeInputRef}
            type="text"
            placeholder={L("Code or name, e.g. GP", "কোড বা নাম, যেমন GP")}
            value={form.trading_code}
            onChange={(e) => handleCodeInput(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            onFocus={() => form.trading_code && !picked && setSuggestions(findCodes(form.trading_code))}
            onBlur={() => setTimeout(() => setSuggestions([]), 200)}
            className="input-field py-3 text-lg font-semibold"
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="ah-list"
            required
          />
          {suggestions.length > 0 && (
            // In the page flow, right under the field (2026-11-23). It used to
            // float upward on phones, above the first field of the sheet,
            // where the sheet's scrolling body cut it off: nobody saw it.
            <ul
              id="ah-list"
              role="listbox"
              className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-soft"
            >
              {suggestions.map((c, i) => (
                <li
                  key={c}
                  role="option"
                  aria-selected={i === activeSuggestion}
                  // Keep the field focused (no blur closing the list mid-tap), then pick on click.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(c)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                    i === activeSuggestion ? "bg-surface-2" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="text-sm font-semibold text-text-main">{c}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{priceMap.get(c)?.company_name ?? ""}</span>
                  {existingCodes.has(c) && <span className="text-xs text-text-muted">{L("You own it", "আছে")}</span>}
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

        {picked && holdings.length > 0 && (
          <BeforeYouSave
            code={code}
            qty={parseInt(form.qty, 10) || null}
            price={parseFloat(form.price) || null}
            holdings={holdings}
            priceMap={priceMap}
            source="add"
            onUseQty={(n) => setForm((f) => ({ ...f, qty: String(n) }))}
          />
        )}

        {error && <p className="form-error">{error}</p>}

        <Button type="submit" disabled={saving} variant="primary" size="lg" block>
          {saving ? L("Saving…", "সেভ হচ্ছে…") : L("Add to my portfolio", "পোর্টফোলিওতে যোগ করুন")}
        </Button>
      </form>
    </Sheet>
  );
}
