"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getScores,
  getAllCodes,
  type ScoreItem,
  type ScoresResponse,
  type PortfolioHolding,
  apiGetPortfolio,
  apiAddHolding,
  apiUpdateHolding,
  apiDeleteHolding,
} from "@/lib/api";
import { taka } from "@/lib/formatters";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import PortfolioAnalysis from "./PortfolioAnalysis";

function flattenScores(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  const all = Object.values(scores.tiers).flat();
  return new Map(all.map((s) => [s.trading_code.toUpperCase(), s]));
}

interface ComputedRow {
  holding: PortfolioHolding;
  ltp: number | null;
  company_name: string | null;
  cost_basis: number;
  current_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
}

function compute(holding: PortfolioHolding, priceMap: Map<string, ScoreItem>): ComputedRow {
  const item = priceMap.get(holding.trading_code);
  const ltp = item?.ltp ?? null;
  const cost_basis = holding.qty * holding.buy_price;
  const current_value = ltp != null ? holding.qty * ltp : null;
  const pnl = current_value != null ? current_value - cost_basis : null;
  const pnl_pct = pnl != null && cost_basis > 0 ? (pnl / cost_basis) * 100 : null;
  return {
    holding,
    ltp,
    company_name: item?.company_name ?? null,
    cost_basis,
    current_value,
    pnl,
    pnl_pct,
  };
}

function PnlCell({ value, pct }: { value: number | null; pct: number | null }) {
  if (value == null) return <span className="text-[var(--text-muted)]">—</span>;
  const cls = value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-[var(--text-muted)]";
  return (
    <span className={`${cls} font-semibold tabular-nums`}>
      {value > 0 ? "+" : ""}
      {taka(value, 0)}
      {pct != null && (
        <span className="ml-1 text-xs sm:text-sm opacity-90 font-medium">
          ({pct > 0 ? "+" : ""}
          {pct.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}

const EMPTY_FORM = { trading_code: "", buy_price: "", qty: "" };

export default function PortfolioClient() {
  const { isLoading, isLoggedIn } = useAuth();

  // SWR hydrate. holdings is per-user; scores + codes are shared.
  const userId = getStoredUser()?.user_id ?? null;
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => {
    if (!userId) return [];
    return readCache<PortfolioHolding[]>(cacheKeys.portfolio(userId)) ?? [];
  });
  const [priceMap, setPriceMap] = useState<Map<string, ScoreItem>>(() => {
    const cached = readCache<ScoresResponse>(cacheKeys.scores);
    return flattenScores(cached);
  });
  const [allCodes, setAllCodes] = useState<string[]>(
    () => readCache<string[]>(cacheKeys.allCodes) ?? [],
  );
  const [dataLoading, setDataLoading] = useState(() => {
    if (!userId) return true;
    return readCache<PortfolioHolding[]>(cacheKeys.portfolio(userId)) === null;
  });
  const [error, setError] = useState<string | null>(null);

  function persistHoldings(next: PortfolioHolding[]): void {
    if (!userId) return;
    writeCache(cacheKeys.portfolio(userId), next);
  }

  // Add form
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const [adding, setAdding] = useState(false);

  // Edit state: holdingId → { buy_price, qty }
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ buy_price: "", qty: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    Promise.allSettled([apiGetPortfolio(), getScores(), getAllCodes()])
      .then(([p, s, c]) => {
        if (cancelled) return;
        if (p.status === "fulfilled") {
          setHoldings(p.value.holdings);
          persistHoldings(p.value.holdings);
        }
        if (s.status === "fulfilled") {
          setPriceMap(flattenScores(s.value));
          writeCache(cacheKeys.scores, s.value);
        }
        if (c.status === "fulfilled") {
          const upper = c.value.map((x) => x.toUpperCase());
          setAllCodes(upper);
          writeCache(cacheKeys.allCodes, upper);
        }
        // Only surface error when nothing succeeded and no cache served first paint.
        if (
          p.status === "rejected" &&
          s.status === "rejected" &&
          c.status === "rejected"
        ) {
          setError(String(p.reason));
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  function handleCodeInput(value: string) {
    const upper = value.toUpperCase();
    setForm((f) => ({ ...f, trading_code: upper }));
    setActiveSuggestion(-1);
    if (upper.length === 0) {
      setSuggestions([]);
      return;
    }
    const matches = allCodes
      .filter((c) => c.startsWith(upper))
      .slice(0, 8);
    setSuggestions(matches);
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

  function fillLtp(code: string) {
    const ltp = priceMap.get(code)?.ltp;
    if (ltp != null) {
      setForm((f) => ({ ...f, buy_price: String(ltp) }));
    }
  }

  function selectSuggestion(code: string) {
    setForm((f) => ({ ...f, trading_code: code }));
    setSuggestions([]);
    setActiveSuggestion(-1);
    fillLtp(code);
  }

  const rows = useMemo(
    () => holdings.map((h) => compute(h, priceMap)),
    [holdings, priceMap],
  );

  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalValue = 0;
    let hasPrice = false;
    for (const r of rows) {
      totalInvested += r.cost_basis;
      if (r.current_value != null) {
        totalValue += r.current_value;
        hasPrice = true;
      }
    }
    const pnl = hasPrice ? totalValue - totalInvested : null;
    const pnl_pct = pnl != null && totalInvested > 0 ? (pnl / totalInvested) * 100 : null;
    return { totalInvested, totalValue: hasPrice ? totalValue : null, pnl, pnl_pct };
  }, [rows]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const code = form.trading_code.trim().toUpperCase();
    const price = parseFloat(form.buy_price);
    const qty = parseInt(form.qty, 10);
    if (!code) return setFormError("Stock code required.");
    if (isNaN(price) || price <= 0) return setFormError("Enter valid buy price.");
    if (isNaN(qty) || qty <= 0) return setFormError("Enter valid quantity.");
    setAdding(true);
    try {
      const existing = holdings.find((h) => h.trading_code === code);
      if (existing) {
        const totalQty = existing.qty + qty;
        const avgPrice =
          Math.round(((existing.qty * existing.buy_price + qty * price) / totalQty) * 100) / 100;
        const { holding } = await apiUpdateHolding(existing.id, { buy_price: avgPrice, qty: totalQty });
        setHoldings((prev) => {
          const next = prev.map((h) => (h.id === existing.id ? holding : h));
          persistHoldings(next);
          return next;
        });
      } else {
        const { holding } = await apiAddHolding({ trading_code: code, buy_price: price, qty });
        setHoldings((prev) => {
          const next = [...prev, holding];
          persistHoldings(next);
          return next;
        });
      }
      setForm(EMPTY_FORM);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(row: ComputedRow) {
    setEditId(row.holding.id);
    setEditForm({
      buy_price: String(row.holding.buy_price),
      qty: String(row.holding.qty),
    });
    setEditError("");
  }

  async function handleEditSave() {
    if (!editId) return;
    setEditError("");
    const price = parseFloat(editForm.buy_price);
    const qty = parseInt(editForm.qty, 10);
    if (isNaN(price) || price <= 0) return setEditError("Invalid price.");
    if (isNaN(qty) || qty <= 0) return setEditError("Invalid qty.");
    setEditSaving(true);
    try {
      const { holding } = await apiUpdateHolding(editId, { buy_price: price, qty });
      setHoldings((prev) => {
        const next = prev.map((h) => (h.id === editId ? holding : h));
        persistHoldings(next);
        return next;
      });
      setEditId(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await apiDeleteHolding(id);
      setHoldings((prev) => {
        const next = prev.filter((h) => h.id !== id);
        persistHoldings(next);
        return next;
      });
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center max-w-sm w-full">
          <svg className="mx-auto mb-4 text-[var(--text-muted)]" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
          <p className="text-[var(--text)] font-semibold mb-1">Sign in to view your portfolio</p>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Track your DSE holdings, P&amp;L, and returns in one place.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="navbar-rank-btn text-sm py-2 px-5">
              Sign In
            </Link>
            <Link href="/register" className="navbar-intel-btn text-sm py-2 px-5">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading portfolio…</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 mt-4">Failed to load: {error}</p>;
  }

  const pnlPositive = summary.pnl != null && summary.pnl > 0;
  const pnlNegative = summary.pnl != null && summary.pnl < 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Invested</p>
            <p className="text-lg font-bold text-[var(--text)]">{taka(summary.totalInvested, 0)}</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Current Value</p>
            <p className="text-lg font-bold text-[var(--text)]">
              {summary.totalValue != null ? taka(summary.totalValue, 0) : "—"}
            </p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total P&amp;L</p>
            <p className={`text-lg font-bold ${pnlPositive ? "text-green-500" : pnlNegative ? "text-red-500" : "text-[var(--text)]"}`}>
              {summary.pnl != null
                ? `${summary.pnl > 0 ? "+" : ""}${taka(summary.pnl, 0)}`
                : "—"}
            </p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Return</p>
            <p className={`text-lg font-bold ${pnlPositive ? "text-green-500" : pnlNegative ? "text-red-500" : "text-[var(--text)]"}`}>
              {summary.pnl_pct != null
                ? `${summary.pnl_pct > 0 ? "+" : ""}${summary.pnl_pct.toFixed(2)}%`
                : "—"}
            </p>
          </div>
        </div>
      )}

      {deleteError && (
        <p className="text-xs text-red-500 -mb-3">{deleteError}</p>
      )}

      {/* Holdings */}
      {holdings.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center">
          <p className="text-[var(--text)] font-medium mb-2">No holdings yet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Add your first stock below or browse the{" "}
            <Link href="/dsestockranking" className="text-[var(--primary)] underline">
              rankings
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm sm:text-base">
            <thead>
              <tr className="bg-[var(--surface)] border-b-2 border-[var(--border)]">
                <th className="text-left px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold">Code</th>
                <th className="text-left px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold hidden sm:table-cell">Company</th>
                <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold">Qty</th>
                <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold">Buy</th>
                <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold">LTP</th>
                <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold hidden md:table-cell">Cur. Value</th>
                <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold">P&amp;L</th>
                <th className="px-3 sm:px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isEditing = editId === row.holding.id;
                return (
                  <tr
                    key={row.holding.id}
                    className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/60 transition-colors ${
                      idx % 2 === 1 ? "bg-[var(--surface)]/30" : ""
                    }`}
                  >
                    <td className="px-3 sm:px-4 py-4">
                      <Link
                        href={`/stock/${row.holding.trading_code}`}
                        className="text-[var(--primary)] hover:underline font-mono font-bold text-base sm:text-lg"
                      >
                        {row.holding.trading_code}
                      </Link>
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-[var(--text)] max-w-[200px] truncate hidden sm:table-cell">
                      {row.company_name ?? "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={editForm.qty}
                          onChange={(e) => setEditForm((f) => ({ ...f, qty: e.target.value }))}
                          className="input-field text-right w-16 sm:w-24 text-sm sm:text-base py-1.5"
                        />
                      ) : (
                        row.holding.qty.toLocaleString()
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editForm.buy_price}
                          onChange={(e) => setEditForm((f) => ({ ...f, buy_price: e.target.value }))}
                          className="input-field text-right w-20 sm:w-28 text-sm sm:text-base py-1.5"
                        />
                      ) : (
                        taka(row.holding.buy_price, 2)
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {row.ltp != null ? taka(row.ltp, 1) : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium hidden md:table-cell">
                      {row.current_value != null ? taka(row.current_value, 0) : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right">
                      <PnlCell value={row.pnl} pct={row.pnl_pct} />
                    </td>
                    <td className="px-3 sm:px-4 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleEditSave}
                            disabled={editSaving}
                            className="navbar-rank-btn text-xs sm:text-sm py-1.5 px-2 sm:px-3 disabled:opacity-60"
                          >
                            {editSaving ? "…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="navbar-intel-btn text-xs sm:text-sm py-1.5 px-2 sm:px-3"
                          >
                            ✕
                          </button>
                          {editError && (
                            <span className="text-xs sm:text-sm text-red-500 ml-1">{editError}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(row)}
                            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1.5"
                            aria-label="Edit"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(row.holding.id)}
                            disabled={deletingId === row.holding.id}
                            className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1.5 disabled:opacity-40"
                            aria-label="Delete"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add holding form */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-5 uppercase tracking-wider">
          Add Holding
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          {/* Stock code — full width with autocomplete */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-sm font-medium text-[var(--text)]">Stock Code</label>
            <input
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
              <ul
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-20 overflow-hidden"
              >
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
          </div>

          {/* Price + Qty side by side on all screens */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Buy Price (৳)</label>
              <input
                type="number"
                placeholder="295.50"
                min="0.01"
                step="0.01"
                value={form.buy_price}
                onChange={(e) => setForm((f) => ({ ...f, buy_price: e.target.value }))}
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
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                className="input-field text-base sm:text-lg w-full tabular-nums py-2.5"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={adding}
            className="navbar-rank-btn text-base sm:text-lg py-3 w-full sm:w-auto sm:self-start px-10 font-semibold disabled:opacity-60"
          >
            {adding ? "Adding…" : "Add Holding"}
          </button>
        </form>
        {formError && <p className="text-sm text-red-500 mt-3 font-medium">{formError}</p>}
      </div>

      {holdings.length > 0 && (
        <PortfolioAnalysis rows={rows} priceMap={priceMap} />
      )}
    </div>
  );
}
