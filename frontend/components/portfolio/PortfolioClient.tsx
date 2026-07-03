"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getScores,
  getAllCodes,
  getRange52w,
  getWatchlistNews,
  getDividendsUpcoming,
  type ScoreItem,
  type ScoresResponse,
  type PortfolioHolding,
  type Range52wItem,
  type WatchlistNewsItem,
  type DividendsUpcoming,
  apiGetPortfolio,
  apiUpdateHolding,
  apiDeleteHolding,
} from "@/lib/api";
import { taka, formatDate } from "@/lib/formatters";
import { computeHoldingSignal, portfolioTodayMove, type SignalInfo } from "@/lib/portfolio-analysis";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import PortfolioAnalysis from "./PortfolioAnalysis";
import PortfolioHero from "./PortfolioHero";
import AddHoldingModal from "./AddHoldingModal";
import WatchlistNews from "@/components/watchlist/WatchlistNews";
import WatchlistAlertCell from "@/components/watchlist/WatchlistAlertCell";

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
  w52_high: number | null;
  w52_low: number | null;
}

function compute(
  holding: PortfolioHolding,
  priceMap: Map<string, ScoreItem>,
  ranges: Map<string, Range52wItem>,
): ComputedRow {
  const item = priceMap.get(holding.trading_code);
  const range = ranges.get(holding.trading_code);
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
    w52_high: range?.w52_high ?? null,
    w52_low: range?.w52_low ?? null,
  };
}

/** Where today's price sits in the 52-week range (0 = at low, 1 = at high). */
function rangePosition(row: ComputedRow): number | null {
  if (row.ltp == null || row.w52_high == null || row.w52_low == null) return null;
  if (row.w52_high <= row.w52_low) return null;
  return Math.max(0, Math.min(1, (row.ltp - row.w52_low) / (row.w52_high - row.w52_low)));
}

type SortKey = "code" | "qty" | "avgcost" | "invested" | "ltp" | "curvalue" | "pnl" | "range" | "signal";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "code", label: "Code", align: "left" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "avgcost", label: "Avg Cost", align: "right" },
  { key: "invested", label: "Invested", align: "right" },
  { key: "ltp", label: "LTP", align: "right" },
  { key: "curvalue", label: "Cur. Value", align: "right" },
  { key: "pnl", label: "P&L", align: "right" },
  { key: "range", label: "52W", align: "right" },
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
    case "range":
      return rangePosition(row);
    case "signal":
      return SIGNAL_RANK[row.signal.signal];
  }
}

function PnlCell({ value, pct }: { value: number | null; pct: number | null }) {
  if (value == null) return <span className="text-[var(--text-muted)]">—</span>;
  const cls = value > 0 ? "text-[var(--positive)]" : value < 0 ? "text-[var(--negative)]" : "text-[var(--text-muted)]";
  return (
    <span className={`pv ${cls} font-semibold tabular-nums nums`}>
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
      className="pv inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums nums whitespace-nowrap"
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

/** Where today's price sits between the 52-week low and high. */
function RangeBar52({ ltp, high, low }: { ltp: number | null; high: number | null; low: number | null }) {
  if (ltp == null || high == null || low == null || high <= low) {
    return <span className="text-[var(--text-muted)] text-xs">—</span>;
  }
  const pos = Math.max(0, Math.min(1, (ltp - low) / (high - low)));
  return (
    <div
      className="flex flex-col gap-1 min-w-[88px]"
      title={`52-week range: ৳${low.toFixed(1)} – ৳${high.toFixed(1)} · now ৳${ltp.toFixed(1)}`}
    >
      <div className="relative h-1.5 rounded-full bg-[var(--border)]">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[var(--primary)] border-2 border-[var(--surface)] shadow-sm"
          style={{ left: `calc(${(pos * 100).toFixed(1)}% - 5px)` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-[var(--text-muted)] tabular-nums nums leading-none">
        <span>{low.toFixed(1)}</span>
        <span>{high.toFixed(1)}</span>
      </div>
    </div>
  );
}

/** Estimated yearly dividend income + upcoming dividend dates for held stocks. */
function DividendIncomeCard({
  rows,
  priceMap,
  dividends,
}: {
  rows: ComputedRow[];
  priceMap: Map<string, ScoreItem>;
  dividends: DividendsUpcoming | null;
}) {
  let income = 0;
  let payers = 0;
  for (const r of rows) {
    const y = priceMap.get(r.holding.trading_code)?.div_yield_pct;
    const value = r.current_value ?? r.cost_basis;
    if (y != null && y > 0 && value > 0) {
      income += (y / 100) * value;
      payers += 1;
    }
  }

  const held = new Set(rows.map((r) => r.holding.trading_code));
  const seen = new Set<string>();
  const upcoming: { code: string; pct: number | null; date: string | null; kind: "declared" | "record" }[] = [];
  for (const d of dividends?.upcoming_declarations ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!held.has(code) || seen.has(code)) continue;
    seen.add(code);
    upcoming.push({ code, pct: d.dividend_pct, date: d.projected_date, kind: "declared" });
  }
  for (const d of dividends?.upcoming_record_dates ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!held.has(code) || seen.has(code)) continue;
    seen.add(code);
    upcoming.push({ code, pct: d.dividend_pct, date: d.record_date, kind: "record" });
  }

  if (income <= 0 && upcoming.length === 0) return null;

  return (
    <Card padding="none" className="p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="grid place-items-center w-8 h-8 rounded-lg shrink-0 text-[var(--positive)]"
          style={{ background: "color-mix(in srgb, var(--positive) 12%, transparent)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1H6.32c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
          </svg>
        </span>
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] uppercase tracking-wider leading-tight">
            Dividend Income
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Cash your stocks pay you, on top of any price gains.
          </p>
        </div>
      </div>

      {income > 0 && (
        <div className="mb-4">
          <p className="pv text-2xl sm:text-3xl font-bold text-[var(--positive)] nums leading-none">
            ≈ {taka(income, 0)}
            <span className="text-sm sm:text-base text-[var(--text-muted)] font-semibold"> / year</span>
          </p>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
            Rough estimate from {payers} of your {rows.length} stock{rows.length === 1 ? "" : "s"}, at
            today&apos;s dividend rates and prices. Actual payouts depend on what each company declares.
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={income > 0 ? "border-t border-[var(--border)] pt-3" : ""}>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
            Coming up on your stocks
          </p>
          <ul className="flex flex-col gap-2">
            {upcoming.slice(0, 5).map((u) => (
              <li key={u.code} className="flex items-center gap-2 text-sm">
                <Link
                  prefetch={false}
                  href={`/stock/${u.code}`}
                  className="font-mono font-bold text-[var(--primary)] hover:underline"
                >
                  {u.code}
                </Link>
                <span className="text-[var(--text)]">
                  {u.pct != null ? `${u.pct}% dividend` : "dividend"}
                </span>
                <span className="ml-auto text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {u.kind === "record" ? "record date" : "expected"}
                  {u.date ? ` · ${formatDate(u.date)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Deterministic tint per code — matches the hero/allocation palette family. */
const MONO_COLORS = [
  "var(--primary)", "var(--positive)", "#EA580C", "#6366F1", "#DB2777",
  "#0891B2", "#CA8A04", "#9333EA", "#0D9488",
];

function monoColor(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return MONO_COLORS[h % MONO_COLORS.length];
}

function Monogram({ code }: { code: string }) {
  return (
    <span className="pf-mono" style={{ "--mono-c": monoColor(code) } as React.CSSProperties} aria-hidden>
      {code.slice(0, 2)}
    </span>
  );
}

/** Uniform section header — icon chip + title + one-line subtitle (+ actions). */
function SectionHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm sm:text-[15px] uppercase tracking-wider font-bold text-[var(--text)] leading-tight">
          {title}
        </h2>
        {subtitle && <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </div>
  );
}

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
  const [ranges, setRanges] = useState<Map<string, Range52wItem>>(new Map());
  const [dividends, setDividends] = useState<DividendsUpcoming | null>(
    () => readCache<DividendsUpcoming>(cacheKeys.dividends),
  );
  const [news, setNews] = useState<WatchlistNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(() => {
    if (!userId) return true;
    return readCache<PortfolioHolding[]>(cacheKeys.portfolio(userId)) === null;
  });
  const [error, setError] = useState<string | null>(null);

  function applyHoldings(next: PortfolioHolding[]) {
    setHoldings(next);
    if (userId) writeCache(cacheKeys.portfolio(userId), next);
  }

  // Add-stock sheet
  const [addOpen, setAddOpen] = useState(false);

  // Privacy mode — blur personal amounts. Read after mount (SSR-safe).
  const [privacy, setPrivacy] = useState(false);
  useEffect(() => {
    try {
      setPrivacy(localStorage.getItem("dsex.portfolio.privacy") === "1");
    } catch {}
  }, []);
  function togglePrivacy() {
    setPrivacy((p) => {
      const next = !p;
      try {
        localStorage.setItem("dsex.portfolio.privacy", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

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
    Promise.allSettled([apiGetPortfolio(), getScores(), getAllCodes(), getDividendsUpcoming()])
      .then(([p, s, c, d]) => {
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
        if (d.status === "fulfilled") {
          setDividends(d.value);
          writeCache(cacheKeys.dividends, d.value);
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

  // 52-week ranges + news for the held codes — refetch when the set changes.
  const holdingCodesKey = useMemo(
    () => holdings.map((h) => h.trading_code).sort().join(","),
    [holdings],
  );
  useEffect(() => {
    const codes = holdingCodesKey ? holdingCodesKey.split(",") : [];
    if (codes.length === 0) {
      setRanges(new Map());
      setNews([]);
      setNewsLoading(false);
      return;
    }
    let cancelled = false;
    getRange52w(codes).then((items) => {
      if (cancelled) return;
      setRanges(new Map(items.map((it) => [it.trading_code.toUpperCase(), it])));
    });
    setNewsLoading(true);
    getWatchlistNews(codes)
      .then((items) => {
        if (!cancelled) setNews(items);
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [holdingCodesKey]);

  const rows = useMemo(
    () => holdings.map((h) => compute(h, priceMap, ranges)),
    [holdings, priceMap, ranges],
  );

  const todayMove = useMemo(() => portfolioTodayMove(holdings, priceMap), [holdings, priceMap]);

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
        {/* Hero skeleton */}
        <Card padding="none" className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div className="flex-1">
              <Skeleton width={130} height={12} className="mb-3" />
              <Skeleton width="55%" height={40} className="mb-4" />
              <div className="flex gap-2 mb-3">
                <Skeleton width={120} height={26} rounded="999px" />
                <Skeleton width={120} height={26} rounded="999px" />
              </div>
              <Skeleton width="40%" height={12} />
            </div>
            <Skeleton width={118} height={118} rounded="50%" className="hidden sm:block shrink-0" />
          </div>
        </Card>
        {/* Holdings skeleton */}
        <Card padding="md">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton width={34} height={34} rounded="12px" />
              <Skeleton width="35%" height={14} />
              <Skeleton width="18%" height={14} className="ml-auto" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (error) {
    return <p className="text-[var(--negative)] mt-4">Failed to load: {error}</p>;
  }

  const editingHolding = holdings.find((h) => h.id === editId) ?? null;

  return (
    <div className="flex flex-col gap-6" data-privacy={privacy ? "on" : "off"}>
      {/* Hero — value first */}
      {holdings.length > 0 && (
        <PortfolioHero
          totalInvested={summary.totalInvested}
          totalValue={summary.totalValue}
          pnl={summary.pnl}
          pnlPct={summary.pnl_pct}
          todayMove={todayMove}
          holdingsCount={holdings.length}
          slices={rows.map((r) => ({
            code: r.holding.trading_code,
            value: r.current_value ?? r.cost_basis,
          }))}
          privacy={privacy}
          onTogglePrivacy={togglePrivacy}
        />
      )}

      {rowError && <p className="text-xs text-[var(--negative)] -mb-3">{rowError}</p>}

      {/* Holdings */}
      {holdings.length === 0 ? (
        <Card padding="none" className="pf-rise relative overflow-hidden p-8 sm:p-12 text-center ambient-panel">
          {/* Simple bar-chart illustration */}
          <div className="mx-auto mb-6 flex items-end justify-center gap-2 h-20" aria-hidden>
            {[36, 56, 44, 72].map((h, i) => (
              <span
                key={i}
                className="w-7 rounded-t-lg"
                style={{
                  height: h,
                  background:
                    i === 3
                      ? "linear-gradient(180deg, var(--positive), color-mix(in srgb, var(--positive) 55%, transparent))"
                      : `color-mix(in srgb, var(--primary) ${22 + i * 12}%, var(--surface-2))`,
                }}
              />
            ))}
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text)] mb-2">
            Start tracking your portfolio
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            Add the stocks you own once — after that, this page shows your profit &amp; loss,
            dividends, news, and advice on every holding, every day.
          </p>

          {/* 3 steps */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-2xl mx-auto mt-7 text-left">
            {[
              ["Search your stock", "Type the code — like GP or BATBC."],
              ["Enter price & quantity", "What you paid and how many shares."],
              ["Get the full picture", "P&L, signals, and advice — updated daily."],
            ].map(([t, d], i) => (
              <div key={i} className="flex items-start gap-3 flex-1">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--primary)] text-white text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)] leading-tight">{t}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-8">
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              + Add your first stock
            </Button>
            <Link
              prefetch={false}
              href="/sample-portfolio/diversified"
              className="text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              See a sample portfolio first →
            </Link>
          </div>
        </Card>
      ) : (
       <div className="pf-rise flex flex-col gap-3">
        <SectionHeader
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          }
          title={`Holdings (${holdings.length})`}
          subtitle="Tap a stock for its full analysis."
          right={
            <>
              <Button
                type="button"
                onClick={openEditPicker}
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Edit
              </Button>
              <Button
                type="button"
                onClick={() => setAddOpen(true)}
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex"
              >
                + Add stock
              </Button>
            </>
          }
        />

        {/* Mobile: compact card list */}
        <div className="flex flex-col gap-2 sm:hidden">
          {sortedRows.map((row) => (
            <div
              key={row.holding.id}
              className="soft-card p-3 pl-3.5 transition-transform active:scale-[0.99]"
              style={{ borderLeft: `3px solid ${signAccent(row.pnl)}` }}
            >
              {/* Row 1: monogram + code + name | icon actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Monogram code={row.holding.trading_code} />
                  <div className="min-w-0">
                    <Link
                      prefetch={false}
                      href={`/stock/${row.holding.trading_code}`}
                      className="block truncate text-[var(--primary)] font-mono font-bold text-base leading-tight"
                    >
                      {row.holding.trading_code}
                    </Link>
                    <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                      {row.company_name ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 -mr-1">
                  <WatchlistAlertCell
                    code={row.holding.trading_code}
                    ltp={row.ltp}
                    w52High={row.w52_high}
                    w52Low={row.w52_low}
                  />
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

              {/* Row 2: signal | P&L */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <SignalPill signal={row.signal} />
                <PnlPill value={row.pnl} pct={row.pnl_pct} />
              </div>

              {/* Metric strip */}
              <div className="mt-2.5 grid grid-cols-4 gap-1 text-center rounded-lg py-2 px-1 bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface))]">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Qty</p>
                  <p className="pv text-xs text-[var(--text)] tabular-nums nums font-medium mt-0.5">{row.holding.qty.toLocaleString()}</p>
                </div>
                <div className="border-l border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Avg</p>
                  <p className="pv text-xs text-[var(--text)] tabular-nums nums font-medium mt-0.5">{taka(row.holding.buy_price, 2)}</p>
                </div>
                <div className="border-l border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">LTP</p>
                  <p className="text-xs text-[var(--text)] tabular-nums nums font-medium mt-0.5">{row.ltp != null ? taka(row.ltp, 1) : "—"}</p>
                </div>
                <div className="border-l border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Value</p>
                  <p className="pv text-xs text-[var(--text)] tabular-nums nums font-bold mt-0.5">{row.current_value != null ? taka(row.current_value, 0) : "—"}</p>
                </div>
              </div>

              {/* 52-week position */}
              {row.w52_high != null && row.w52_low != null && row.w52_high > row.w52_low && (
                <div className="mt-2.5 flex items-center gap-2 px-0.5">
                  <span className="text-[9px] uppercase tracking-wide text-[var(--text-muted)] font-semibold shrink-0">
                    52W
                  </span>
                  <div className="flex-1">
                    <RangeBar52 ltp={row.ltp} high={row.w52_high} low={row.w52_low} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <Card padding="none" className="overflow-x-auto hidden sm:block">
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
                <th className="px-3 sm:px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                return (
                  <tr
                    key={row.holding.id}
                    className="group border-b border-[var(--border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--primary)_3%,transparent)] transition-colors"
                  >
                    <td className="px-3 sm:px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Monogram code={row.holding.trading_code} />
                        <div className="min-w-0">
                          <Link
                            prefetch={false} href={`/stock/${row.holding.trading_code}`}
                            className="text-[var(--primary)] hover:underline font-mono font-bold text-base leading-tight"
                          >
                            {row.holding.trading_code}
                          </Link>
                          <p className="text-xs text-[var(--text-muted)] truncate max-w-[180px] leading-tight">
                            {row.company_name ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="pv px-3 sm:px-4 py-3.5 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {row.holding.qty.toLocaleString()}
                    </td>
                    <td className="pv px-3 sm:px-4 py-3.5 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {taka(row.holding.buy_price, 2)}
                    </td>
                    <td className="pv px-3 sm:px-4 py-3.5 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {taka(row.cost_basis, 0)}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-right text-[var(--text)] tabular-nums nums font-medium">
                      {row.ltp != null ? taka(row.ltp, 1) : "—"}
                    </td>
                    <td className="pv px-3 sm:px-4 py-3.5 text-right text-[var(--text)] tabular-nums nums font-semibold">
                      {row.current_value != null ? taka(row.current_value, 0) : "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-right">
                      <PnlCell value={row.pnl} pct={row.pnl_pct} />
                    </td>
                    <td className="px-3 sm:px-4 py-3.5">
                      <div className="flex justify-end">
                        <RangeBar52 ltp={row.ltp} high={row.w52_high} low={row.w52_low} />
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-right">
                      <SignalPill signal={row.signal} />
                    </td>
                    <td className="px-3 sm:px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <WatchlistAlertCell
                          code={row.holding.trading_code}
                          ltp={row.ltp}
                          w52High={row.w52_high}
                          w52Low={row.w52_low}
                        />
                        <button
                          onClick={() => startEdit(row.holding)}
                          className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors p-1.5"
                          aria-label={`Edit ${row.holding.trading_code}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(row.holding.id)}
                          disabled={busyId === row.holding.id}
                          className="text-[var(--text-muted)] hover:text-[var(--negative)] transition-colors p-1.5 disabled:opacity-40"
                          aria-label={`Delete ${row.holding.trading_code}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_3%,var(--surface))]">
                <td className="px-3 sm:px-4 py-3.5 text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                  Total
                </td>
                <td />
                <td />
                <td className="pv px-3 sm:px-4 py-3.5 text-right text-[var(--text)] tabular-nums nums font-bold">
                  {taka(summary.totalInvested, 0)}
                </td>
                <td />
                <td className="pv px-3 sm:px-4 py-3.5 text-right text-[var(--text)] tabular-nums nums font-bold">
                  {summary.totalValue != null ? taka(summary.totalValue, 0) : "—"}
                </td>
                <td className="px-3 sm:px-4 py-3.5 text-right">
                  <PnlCell value={summary.pnl} pct={summary.pnl_pct} />
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </Card>
       </div>
      )}

      {/* Dividend income — estimated yearly cash + upcoming dates on held stocks */}
      {holdings.length > 0 && (
        <DividendIncomeCard rows={rows} priceMap={priceMap} dividends={dividends} />
      )}

      {holdings.length > 0 && <PortfolioAnalysis rows={rows} priceMap={priceMap} />}

      {/* News on held stocks */}
      {holdings.length > 0 && (
        <section>
          <SectionHeader
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14H6v-2h6v2zm6-4H6v-2h12v2zm0-4H6V7h12v2z" />
              </svg>
            }
            title="News On Your Stocks"
            subtitle="Announcements from the companies you own."
          />
          <WatchlistNews
            codes={holdings.map((h) => h.trading_code)}
            news={news}
            loading={newsLoading}
            limit={6}
            compact
          />
        </section>
      )}

      {/* Floating add button — mobile only */}
      {holdings.length > 0 && (
        <button type="button" className="pf-fab sm:hidden" onClick={() => setAddOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add stock
        </button>
      )}

      {/* Add stock — bottom-sheet on mobile, centered modal on desktop */}
      {addOpen && (
        <AddHoldingModal
          allCodes={allCodes}
          priceMap={priceMap}
          existingCodes={existingCodes}
          onClose={() => setAddOpen(false)}
          onAdded={applyHoldings}
        />
      )}

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
