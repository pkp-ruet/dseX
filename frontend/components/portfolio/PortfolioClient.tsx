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
import { computeHoldingSignal, type SignalInfo } from "@/lib/portfolio-analysis";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
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
  signal: SignalInfo;
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
    signal: computeHoldingSignal({ pnlPct: pnl_pct, score: item?.score ?? null, p4: item?.p4_val }),
  };
}

type SortKey = "code" | "qty" | "avgcost" | "invested" | "ltp" | "curvalue" | "pnl" | "signal";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "code", label: "Code", align: "left" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "avgcost", label: "Avg Cost", align: "right" },
  { key: "invested", label: "Invested", align: "right" },
  { key: "ltp", label: "LTP", align: "right" },
  { key: "curvalue", label: "Cur. Value", align: "right" },
  { key: "pnl", label: "P&L", align: "right" },
  { key: "signal", label: "Signal", align: "right" },
];

const SIGNAL_RANK: Record<SignalInfo["signal"], number> = { sell: 0, hold: 1, buy_more: 2 };

function sortValue(row: ComputedRow, key: SortKey): string | number | null {
  switch (key) {
    case "code":
      return row.holding.trading_code;
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
    case "signal":
      return SIGNAL_RANK[row.signal.signal];
  }
}

function PnlCell({ value, pct }: { value: number | null; pct: number | null }) {
  if (value == null) return <span className="text-[var(--text-muted)]">—</span>;
  const cls = value > 0 ? "text-[var(--positive)]" : value < 0 ? "text-[var(--negative)]" : "text-[var(--text-muted)]";
  return (
    <span className={`${cls} font-semibold tabular-nums nums`}>
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

/** Sign-aware accent color used for tints, pills and accent edges. */
function signAccent(value: number | null): string {
  if (value == null || value === 0) return "var(--text-muted)";
  return value > 0 ? "var(--positive)" : "var(--negative)";
}

/** Tinted P&L pill for the compact mobile cards. */
function PnlPill({ value, pct }: { value: number | null; pct: number | null }) {
  if (value == null) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  const accent = signAccent(value);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums nums whitespace-nowrap"
      style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
    >
      <span className="text-[9px] leading-none">{value > 0 ? "▲" : value < 0 ? "▼" : "•"}</span>
      {value > 0 ? "+" : ""}
      {taka(value, 0)}
      {pct != null && (
        <span className="opacity-75 font-semibold">
          {pct > 0 ? "+" : ""}
          {pct.toFixed(1)}%
        </span>
      )}
    </span>
  );
}

/** Buy More / Hold / Sell pill shown on each holding (cards + table). */
function SignalPill({ signal }: { signal: SignalInfo }) {
  const accent = signal.muted
    ? "var(--text-muted)"
    : signal.signal === "buy_more"
      ? "var(--positive)"
      : signal.signal === "sell"
        ? "var(--negative)"
        : "var(--watch)";
  return (
    <span
      title={signal.reason}
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap cursor-help"
      style={{
        color: accent,
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        opacity: signal.muted ? 0.75 : 1,
      }}
    >
      <span className="text-[9px] leading-none" aria-hidden>
        {signal.signal === "buy_more" ? "▲" : signal.signal === "sell" ? "▼" : "●"}
      </span>
      {signal.label}
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit Portfolio picker modal (select a holding → edit qty/price)
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [pickerCode, setPickerCode] = useState("");
  const [pickerForm, setPickerForm] = useState({ price: "", qty: "" });
  const [pickerSaving, setPickerSaving] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

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

  function openEditPicker() {
    if (holdings.length === 0) return;
    const first = holdings[0];
    setPickerCode(first.trading_code);
    setPickerForm({ price: String(first.buy_price), qty: String(first.qty) });
    setPickerError(null);
    setEditPickerOpen(true);
  }

  function selectPickerCode(code: string) {
    setPickerCode(code);
    setPickerError(null);
    const h = holdings.find((x) => x.trading_code === code);
    if (h) setPickerForm({ price: String(h.buy_price), qty: String(h.qty) });
  }

  async function savePicker() {
    const h = holdings.find((x) => x.trading_code === pickerCode);
    if (!h) return;
    setPickerError(null);
    const price = parseFloat(pickerForm.price);
    const qty = parseInt(pickerForm.qty, 10);
    if (isNaN(price) || price <= 0) return setPickerError("Invalid price.");
    if (isNaN(qty) || qty <= 0) return setPickerError("Invalid qty.");
    setPickerSaving(true);
    try {
      const res = await apiUpdateHolding(h.id, { buy_price: price, qty });
      applyHoldings(res.holdings);
      setEditPickerOpen(false);
    } catch (err: unknown) {
      setPickerError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setPickerSaving(false);
    }
  }

  function handleDelete(id: string) {
    setConfirmDeleteId(id);
  }

  async function confirmDelete() {
    const id = confirmDeleteId;
    if (!id) return;
    const removedCode = holdings.find((x) => x.id === id)?.trading_code ?? null;
    setConfirmDeleteId(null);
    setBusyId(id);
    setRowError(null);
    try {
      const res = await apiDeleteHolding(id);
      applyHoldings(res.holdings);
      setEditId(null);
      // Keep the Edit Portfolio picker in sync when the selected stock is removed.
      if (editPickerOpen && removedCode === pickerCode) {
        if (res.holdings.length === 0) {
          setEditPickerOpen(false);
        } else {
          const next = res.holdings[0];
          setPickerCode(next.trading_code);
          setPickerForm({ price: String(next.buy_price), qty: String(next.qty) });
        }
      }
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
        <Card padding="none" className="p-8 text-center max-w-sm w-full">
          <svg className="mx-auto mb-4 text-[var(--text-muted)]" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
          <p className="text-[var(--text)] font-semibold mb-1">Sign in to view your portfolio</p>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Track your DSE holdings, P&amp;L, and returns in one place.
          </p>
          <div className="flex gap-3 justify-center">
            <Button href="/login" variant="primary" size="sm">
              Sign In
            </Button>
            <Button href="/register" variant="ghost" size="sm">
              Create Account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading portfolio">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} padding="md">
              <Skeleton width="60%" height={12} className="mb-2" />
              <Skeleton width="80%" height={22} />
            </Card>
          ))}
        </div>
        <Card padding="md">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton width={40} height={16} rounded="999px" />
              <Skeleton width="40%" height={14} />
              <Skeleton width="20%" height={14} className="ml-auto" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (error) {
    return <p className="text-[var(--negative)] mt-4">Failed to load: {error}</p>;
  }

  const pnlPositive = summary.pnl != null && summary.pnl > 0;
  const pnlNegative = summary.pnl != null && summary.pnl < 0;
  const pnlAccent = pnlPositive ? "var(--positive)" : pnlNegative ? "var(--negative)" : "var(--text-muted)";
  const isHeld = existingCodes.has(form.trading_code.trim().toUpperCase());
  const editingHolding = holdings.find((h) => h.id === editId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Invested */}
          <div className="soft-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0 text-[var(--primary)]" style={{ background: "color-mix(in srgb, var(--primary) 11%, transparent)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>
              </span>
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Invested</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-[var(--text)] nums">{taka(summary.totalInvested, 0)}</p>
          </div>

          {/* Current Value */}
          <div className="soft-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0 text-[var(--primary)]" style={{ background: "color-mix(in srgb, var(--primary) 11%, transparent)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
              </span>
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Current Value</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-[var(--text)] nums">
              {summary.totalValue != null ? taka(summary.totalValue, 0) : "—"}
            </p>
          </div>

          {/* Unrealized P&L */}
          <div
            className="soft-card p-4"
            style={{
              background: `color-mix(in srgb, ${pnlAccent} 6%, var(--surface))`,
              borderColor: `color-mix(in srgb, ${pnlAccent} 24%, var(--border))`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0" style={{ background: `color-mix(in srgb, ${pnlAccent} 14%, transparent)`, color: pnlAccent }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  {pnlNegative
                    ? <path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z" />
                    : <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />}
                </svg>
              </span>
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Unrealized P&amp;L</p>
            </div>
            <p className={`text-lg sm:text-xl font-bold nums ${pnlPositive ? "text-[var(--positive)]" : pnlNegative ? "text-[var(--negative)]" : "text-[var(--text)]"}`}>
              {summary.pnl != null ? `${summary.pnl > 0 ? "+" : ""}${taka(summary.pnl, 0)}` : "—"}
            </p>
          </div>

          {/* Return */}
          <div
            className="soft-card p-4"
            style={{
              background: `color-mix(in srgb, ${pnlAccent} 6%, var(--surface))`,
              borderColor: `color-mix(in srgb, ${pnlAccent} 24%, var(--border))`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="grid place-items-center w-8 h-8 rounded-lg shrink-0 text-sm font-extrabold" style={{ background: `color-mix(in srgb, ${pnlAccent} 14%, transparent)`, color: pnlAccent }}>
                %
              </span>
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Return</p>
            </div>
            <p className={`text-lg sm:text-xl font-bold nums ${pnlPositive ? "text-[var(--positive)]" : pnlNegative ? "text-[var(--negative)]" : "text-[var(--text)]"}`}>
              {summary.pnl_pct != null ? `${summary.pnl_pct > 0 ? "+" : ""}${summary.pnl_pct.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>
      )}

      {rowError && <p className="text-xs text-[var(--negative)] -mb-3">{rowError}</p>}

      {/* Holdings table */}
      {holdings.length === 0 ? (
        <Card padding="none" className="p-10 text-center">
          <p className="text-[var(--text)] font-medium mb-2">No holdings yet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Add your first holding below or browse the{" "}
            <Link href="/dsestockranking" className="text-[var(--primary)] underline">
              rankings
            </Link>
            .
          </p>
        </Card>
      ) : (
       <>
        {/* Mobile: compact card list */}
        <div className="flex flex-col gap-2 sm:hidden">
          {sortedRows.map((row) => (
            <div
              key={row.holding.id}
              className="soft-card p-3 pl-3.5"
              style={{ borderLeft: `3px solid ${signAccent(row.pnl)}` }}
            >
              {/* Header: code + name | P&L + actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    prefetch={false}
                    href={`/stock/${row.holding.trading_code}`}
                    className="text-[var(--primary)] font-mono font-bold text-base leading-tight"
                  >
                    {row.holding.trading_code}
                  </Link>
                  <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                    {row.company_name ?? "—"}
                  </p>
                  <div className="mt-1.5">
                    <SignalPill signal={row.signal} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 -my-1 -mr-1">
                  <PnlPill value={row.pnl} pct={row.pnl_pct} />
                  <button
                    onClick={() => startEdit(row.holding)}
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1.5"
                    aria-label="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(row.holding.id)}
                    disabled={busyId === row.holding.id}
                    className="text-[var(--text-muted)] hover:text-[var(--negative)] transition-colors p-1.5 disabled:opacity-40"
                    aria-label="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Metric strip */}
              <div className="mt-2.5 grid grid-cols-4 gap-1 text-center rounded-lg py-2 px-1 bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface))]">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Qty</p>
                  <p className="text-xs text-[var(--text)] tabular-nums nums font-medium mt-0.5">{row.holding.qty.toLocaleString()}</p>
                </div>
                <div className="border-l border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Avg</p>
                  <p className="text-xs text-[var(--text)] tabular-nums nums font-medium mt-0.5">{taka(row.holding.buy_price, 2)}</p>
                </div>
                <div className="border-l border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">LTP</p>
                  <p className="text-xs text-[var(--text)] tabular-nums nums font-medium mt-0.5">{row.ltp != null ? taka(row.ltp, 1) : "—"}</p>
                </div>
                <div className="border-l border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Value</p>
                  <p className="text-xs text-[var(--text)] tabular-nums nums font-bold mt-0.5">{row.current_value != null ? taka(row.current_value, 0) : "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <Card padding="none" className="overflow-x-auto hidden sm:block">
          <table className="w-full text-sm sm:text-base">
            <thead>
              <tr className="bg-[var(--surface)] border-b-2 border-[var(--border)]">
                <th className="text-left px-3 sm:px-4 py-3 text-xs sm:text-sm text-[var(--text)] uppercase tracking-wider font-semibold">Edit</th>
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
                      <div className="flex items-center gap-1.5">
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
                          className="text-[var(--text-muted)] hover:text-[var(--negative)] transition-colors p-1.5 disabled:opacity-40"
                          aria-label="Delete"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-4">
                      <Link
                        prefetch={false} href={`/stock/${row.holding.trading_code}`}
                        className="text-[var(--primary)] hover:underline font-mono font-bold text-base sm:text-lg"
                      >
                        {row.holding.trading_code}
                      </Link>
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {row.holding.qty.toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {taka(row.holding.buy_price, 2)}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {taka(row.cost_basis, 0)}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {row.ltp != null ? taka(row.ltp, 1) : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {row.current_value != null ? taka(row.current_value, 0) : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right">
                      <PnlCell value={row.pnl} pct={row.pnl_pct} />
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-right">
                      <SignalPill signal={row.signal} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
       </>
      )}

      {/* Edit portfolio entry point */}
      {holdings.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={openEditPicker}
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-1.5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            Edit Portfolio
          </Button>
        </div>
      )}

      {/* Add holding form */}
      <Card padding="none" className="p-5 sm:p-6">
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

          <Button
            type="submit"
            disabled={adding}
            variant="primary"
            className="w-full sm:w-auto sm:self-start"
          >
            {adding ? "Saving…" : "Add Holding"}
          </Button>
        </form>
        {formError && <p className="text-sm text-[var(--negative)] mt-3 font-medium">{formError}</p>}
      </Card>

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

            {rowError && <p className="text-sm text-[var(--negative)] font-medium">{rowError}</p>}

            <div className="flex flex-col gap-2 mt-1">
              <Button
                onClick={handleEditSave}
                disabled={editSaving}
                variant="primary"
                className="w-full"
              >
                {editSaving ? "Saving…" : "Save changes"}
              </Button>
              <button
                onClick={() => handleDelete(editingHolding.id)}
                disabled={busyId === editingHolding.id || editSaving}
                className="text-sm font-medium text-[var(--negative)] hover:opacity-80 py-2.5 w-full disabled:opacity-50"
              >
                {busyId === editingHolding.id ? "Removing…" : "Remove holding"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Portfolio — pick a holding from a dropdown, then edit qty/price */}
      {editPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => !pickerSaving && setEditPickerOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-[var(--surface)] border-t sm:border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text)]">Edit Portfolio</h3>
              <button
                onClick={() => setEditPickerOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-1"
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L12 13.41 5.71 19.7 4.29 18.3 10.59 12 4.29 5.71 5.71 4.29 12 10.59l6.29-6.3z" />
                </svg>
              </button>
            </div>

            {/* Stock selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text)]">Stock</label>
              <select
                value={pickerCode}
                onChange={(e) => selectPickerCode(e.target.value)}
                className="input-field text-base w-full py-2.5 font-mono"
                aria-label="Select holding to edit"
              >
                {holdings.map((h) => (
                  <option key={h.id} value={h.trading_code}>
                    {h.trading_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text)]">Quantity</label>
                <input
                  type="number"
                  value={pickerForm.qty}
                  min="1"
                  step="1"
                  inputMode="numeric"
                  onChange={(e) => setPickerForm((f) => ({ ...f, qty: e.target.value }))}
                  className="input-field text-lg w-full tabular-nums py-3"
                  aria-label="Quantity"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text)]">Avg Buy Price (৳)</label>
                <input
                  type="number"
                  value={pickerForm.price}
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  onChange={(e) => setPickerForm((f) => ({ ...f, price: e.target.value }))}
                  className="input-field text-lg w-full tabular-nums py-3"
                  aria-label="Avg buy price"
                />
              </div>
            </div>

            {pickerError && <p className="text-sm text-[var(--negative)] font-medium">{pickerError}</p>}

            <div className="flex flex-col gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  const h = holdings.find((x) => x.trading_code === pickerCode);
                  if (h) handleDelete(h.id);
                }}
                disabled={pickerSaving || busyId !== null}
                className="text-sm font-medium text-[var(--negative)] hover:opacity-80 py-2.5 w-full disabled:opacity-50"
              >
                {busyId !== null ? "Removing…" : `Remove ${pickerCode}`}
              </button>
              <Button
                onClick={savePicker}
                disabled={pickerSaving}
                variant="primary"
                className="w-full"
              >
                {pickerSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full sm:max-w-sm bg-[var(--surface-2)] rounded-t-2xl sm:rounded-2xl border border-[var(--border)] p-5 sm:p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-[var(--text)]">Remove holding?</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {(() => {
                  const h = holdings.find((x) => x.id === confirmDeleteId);
                  return h ? (
                    <>
                      Remove <span className="font-mono font-semibold text-[var(--text)]">{h.trading_code}</span> from your portfolio? This can’t be undone.
                    </>
                  ) : (
                    "This can’t be undone."
                  );
                })()}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={confirmDelete} variant="primary" className="w-full bg-[var(--negative)] border-[var(--negative)]">
                Remove
              </Button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] py-2.5 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
