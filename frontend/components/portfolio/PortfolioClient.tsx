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

type SortKey = "code" | "company" | "qty" | "avgcost" | "invested" | "ltp" | "curvalue" | "pnl";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "code", label: "Code", align: "left" },
  { key: "company", label: "Company", align: "left" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "avgcost", label: "Avg Cost", align: "right" },
  { key: "invested", label: "Invested", align: "right" },
  { key: "ltp", label: "LTP", align: "right" },
  { key: "curvalue", label: "Cur. Value", align: "right" },
  { key: "pnl", label: "P&L", align: "right" },
];

function sortValue(row: ComputedRow, key: SortKey): string | number | null {
  switch (key) {
    case "code":
      return row.holding.trading_code;
    case "company":
      return row.company_name;
    case "qty":
      return row.holding.qty;
    case "avgcost":
      return row.holding.buy_price;
    case "invested":
      return row.cost_basis;
    case "ltp":
      return row.ltp;
    case "curvalue":
      return row.current_value;
    case "pnl":
      return row.pnl;
  }
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

const emptyForm = () => ({ trading_code: "", price: "", qty: "" });

export default function PortfolioClient() {
  const { isLoading, isLoggedIn } = useAuth();

  // SWR hydrate. Per-user data is cached; scores + codes are shared.
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

  function applyHoldings(next: PortfolioHolding[]) {
    setHoldings(next);
    if (userId) writeCache(cacheKeys.portfolio(userId), next);
  }

  // Add form
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ price: "", qty: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    Promise.allSettled([apiGetPortfolio(), getScores(), getAllCodes()])
      .then(([p, s, c]) => {
        if (cancelled) return;
        if (p.status === "fulfilled") {
          applyHoldings(p.value.holdings);
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
        if (p.status === "rejected" && s.status === "rejected" && c.status === "rejected") {
          setError(String(p.reason));
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  function handleCodeInput(value: string) {
    const upper = value.toUpperCase();
    setForm((f) => ({ ...f, trading_code: upper }));
    setActiveSuggestion(-1);
    if (upper.length === 0) {
      setSuggestions([]);
      return;
    }
    setSuggestions(allCodes.filter((c) => c.startsWith(upper)).slice(0, 8));
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
    if (ltp != null) setForm((f) => ({ ...f, price: String(ltp) }));
  }

  function selectSuggestion(code: string) {
    setForm((f) => ({ ...f, trading_code: code }));
    setSuggestions([]);
    setActiveSuggestion(-1);
    fillLtp(code);
  }

  const rows = useMemo(() => holdings.map((h) => compute(h, priceMap)), [holdings, priceMap]);

  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s && s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      // Nulls always sink to the bottom regardless of direction.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }, [rows, sort]);

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

  const existingCodes = useMemo(
    () => new Set(holdings.map((h) => h.trading_code)),
    [holdings],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const code = form.trading_code.trim().toUpperCase();
    const price = parseFloat(form.price);
    const qty = parseInt(form.qty, 10);
    if (!code) return setFormError("Stock code required.");
    if (isNaN(price) || price <= 0) return setFormError("Enter a valid buy price.");
    if (isNaN(qty) || qty <= 0) return setFormError("Enter a valid quantity.");
    setAdding(true);
    try {
      const res = await apiAddHolding({ trading_code: code, buy_price: price, qty });
      applyHoldings(res.holdings);
      setForm(emptyForm());
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(h: PortfolioHolding) {
    setEditId(h.id);
    setRowError(null);
    setEditForm({ price: String(h.buy_price), qty: String(h.qty) });
  }

  async function handleEditSave() {
    if (!editId) return;
    setRowError(null);
    const price = parseFloat(editForm.price);
    const qty = parseInt(editForm.qty, 10);
    if (isNaN(price) || price <= 0) return setRowError("Invalid price.");
    if (isNaN(qty) || qty <= 0) return setRowError("Invalid qty.");
    setEditSaving(true);
    try {
      const res = await apiUpdateHolding(editId, { buy_price: price, qty });
      applyHoldings(res.holdings);
      setEditId(null);
    } catch (err: unknown) {
      setRowError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setRowError(null);
    try {
      const res = await apiDeleteHolding(id);
      applyHoldings(res.holdings);
    } catch (err: unknown) {
      setRowError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setBusyId(null);
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
  const isHeld = existingCodes.has(form.trading_code.trim().toUpperCase());
  const editingHolding = holdings.find((h) => h.id === editId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Unrealized P&amp;L</p>
            <p className={`text-lg font-bold ${pnlPositive ? "text-green-500" : pnlNegative ? "text-red-500" : "text-[var(--text)]"}`}>
              {summary.pnl != null ? `${summary.pnl > 0 ? "+" : ""}${taka(summary.pnl, 0)}` : "—"}
            </p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Return</p>
            <p className={`text-lg font-bold ${pnlPositive ? "text-green-500" : pnlNegative ? "text-red-500" : "text-[var(--text)]"}`}>
              {summary.pnl_pct != null ? `${summary.pnl_pct > 0 ? "+" : ""}${summary.pnl_pct.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>
      )}

      {rowError && <p className="text-xs text-red-500 -mb-3">{rowError}</p>}

      {/* Holdings table */}
      {holdings.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-10 text-center">
          <p className="text-[var(--text)] font-medium mb-2">No holdings yet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Add your first holding below or browse the{" "}
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
                {COLUMNS.map((col) => {
                  const active = sort?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      className={`px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold ${
                        col.align === "left" ? "text-left" : "text-right"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`group inline-flex items-center gap-1 cursor-pointer uppercase tracking-wider font-semibold hover:text-[var(--primary)] transition-colors ${
                          col.align === "right" ? "flex-row-reverse" : ""
                        } ${active ? "text-[var(--primary)]" : ""}`}
                        aria-label={`Sort by ${col.label}`}
                      >
                        {col.label === "P&L" ? <>P&amp;L</> : col.label}
                        <span
                          className={`text-[10px] leading-none ${
                            active
                              ? "text-[var(--primary)]"
                              : "text-[var(--text-muted)] opacity-50 group-hover:opacity-100"
                          }`}
                        >
                          {active ? (sort!.dir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th className="text-right px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold">Edit</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => {
                return (
                  <tr
                    key={row.holding.id}
                    className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/60 transition-colors ${
                      idx % 2 === 1 ? "bg-[var(--surface)]/30" : ""
                    }`}
                  >
                    <td className="px-3 sm:px-4 py-4">
                      <Link
                        prefetch={false} href={`/stock/${row.holding.trading_code}`}
                        className="text-[var(--primary)] hover:underline font-mono font-bold text-base sm:text-lg"
                      >
                        {row.holding.trading_code}
                      </Link>
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-[var(--text)] max-w-[200px] truncate">
                      {row.company_name ?? "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {row.holding.qty.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {taka(row.holding.buy_price, 2)}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {taka(row.cost_basis, 0)}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {row.ltp != null ? taka(row.ltp, 1) : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums font-medium">
                      {row.current_value != null ? taka(row.current_value, 0) : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right">
                      <PnlCell value={row.pnl} pct={row.pnl_pct} />
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(row.holding)}
                          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1.5"
                          aria-label="Edit"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(row.holding.id)}
                          disabled={busyId === row.holding.id}
                          className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1.5 disabled:opacity-40"
                          aria-label="Delete"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
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
          {/* Stock code */}
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
            {isHeld && (
              <p className="text-xs text-[var(--text-muted)]">
                Already held — adding will blend into a weighted-average cost.
              </p>
            )}
          </div>

          {/* Price + Qty */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Buy Price (৳)</label>
              <input
                type="number"
                placeholder="295.50"
                min="0.01"
                step="0.01"
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
            {adding ? "Saving…" : "Add Holding"}
          </button>
        </form>
        {formError && <p className="text-sm text-red-500 mt-3 font-medium">{formError}</p>}
      </div>

      {holdings.length > 0 && <PortfolioAnalysis rows={rows} priceMap={priceMap} />}

      {/* Edit holding — bottom-sheet on mobile, centered modal on desktop */}
      {editingHolding && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => !editSaving && setEditId(null)}
        >
          <div
            className="w-full sm:max-w-sm bg-[var(--surface)] border-t sm:border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text)]">
                Edit <span className="font-mono">{editingHolding.trading_code}</span>
              </h3>
              <button
                onClick={() => setEditId(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1"
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L12 13.41 5.71 19.7 4.29 18.3 10.59 12 4.29 5.71 5.71 4.29 12 10.59l6.29-6.3z" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Quantity</label>
              <input
                type="number"
                value={editForm.qty}
                min="1"
                step="1"
                inputMode="numeric"
                onChange={(e) => setEditForm((f) => ({ ...f, qty: e.target.value }))}
                className="input-field text-lg w-full tabular-nums py-3"
                aria-label="Quantity"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Avg Buy Price (৳)</label>
              <input
                type="number"
                value={editForm.price}
                min="0.01"
                step="0.01"
                inputMode="decimal"
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                className="input-field text-lg w-full tabular-nums py-3"
                aria-label="Avg buy price"
              />
            </div>

            {rowError && <p className="text-sm text-red-500 font-medium">{rowError}</p>}

            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="navbar-rank-btn text-base py-3 w-full font-semibold disabled:opacity-60"
              >
                {editSaving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => handleDelete(editingHolding.id)}
                disabled={busyId === editingHolding.id || editSaving}
                className="text-sm font-medium text-red-500 hover:text-red-600 py-2.5 w-full disabled:opacity-50"
              >
                {busyId === editingHolding.id ? "Removing…" : "Remove holding"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
