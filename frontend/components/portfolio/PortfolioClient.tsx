"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getScores,
  getAllCodes,
  getRange52w,
  getWatchlistNews,
  getDividendsUpcoming,
  getDividendCalendar,
  getMarketIndex,
  flattenTiers,
  type ScoreItem,
  type ScoresResponse,
  type PortfolioHolding,
  type Range52wItem,
  type WatchlistNewsItem,
  type DividendsUpcoming,
  type DividendCalendarData,
  apiGetPortfolio,
  apiUpdateHolding,
  apiDeleteHolding,
  apiGetSignalEvents,
  apiGetPortfolioHistory,
  apiGetBuyNext,
  apiGetWatchEvents,
  apiPortfolioAction,
  apiDeleteLogEntry,
  MAIN_PORTFOLIO_ID,
  type PortfolioSignalEvent,
  type PortfolioLogEntry,
  type PortfolioResponse,
  type CorporateActionSuggestion,
  type PortfolioSettings,
  type PortfolioListItem,
  type PortfolioHistory,
  type PortfolioWatchEvent,
  type BuyNext,
} from "@/lib/api";
import { taka, takaCompact, takaGroup } from "@/lib/formatters";
import {
  signalInfoFromApi,
  portfolioTodayMove,
  analyzePortfolio,
  planFromEngine,
  type SignalInfo,
  type AnalysisLang,
  type Grade,
  GRADE_WORDS,
} from "@/lib/portfolio-analysis";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import Sheet from "@/components/ui/Sheet";
import SignalChip from "@/components/ui/SignalChip";
import PortfolioAnalysisView from "./PortfolioAnalysisView";
import ProInsights from "./ProInsights";
import RebalanceHelper from "./RebalanceHelper";
import AllocationChart from "./AllocationChart";
import SectorBreakdownChart from "./SectorBreakdownChart";
import { PageLockScope } from "@/components/premium/LockScope";
import Chip from "@/components/ui/Chip";
import DashSectionNav from "@/components/home/personalized/DashSectionNav";
import PfCard, { PfChapterHead } from "./PfCard";
import { IconLock, IconPlus } from "@/components/ui/icons";
import { buildProInsights, buildPremiumStakes } from "@/lib/portfolio-pro";
import { usePremium, isLimitError, PREMIUM_PATH } from "@/lib/premium";
import { moneyMade, DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/portfolio-ledger";
import { savePremiumContext } from "@/lib/premium-context";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import MoneyMadeCard from "./MoneyMadeCard";
import ValueHistoryCard from "./ValueHistoryCard";
import CorrectionsCard from "./CorrectionsCard";
import HistoryCard from "./HistoryCard";
import StockUpdates, { KIND_TAG, LEVEL_TONE } from "./StockUpdates";
import PortfolioPremium from "./PortfolioPremium";
import WhatIfCard from "./WhatIfCard";
import TrialEndingBanner from "./TrialEndingBanner";
import PortfolioSwitcher from "./PortfolioSwitcher";
import PortfolioSettingsSheet from "./PortfolioSettingsSheet";
import ContributionStrip from "./ContributionStrip";
import DividendIncomeCard from "./DividendIncomeCard";
import PortfolioHero from "./PortfolioHero";
import AddHoldingModal from "./AddHoldingModal";
import BuySellModal from "./BuySellModal";
import PortfolioNews from "./PortfolioNews";
import AnalysisTop from "./AnalysisTop";
import GradeLiftCard from "./GradeLiftCard";
import HowWeDecide from "./HowWeDecide";
import { buildNextMove, gradeLifts } from "@/lib/portfolio-next";
import WatchlistAlertCell from "@/components/watchlist/WatchlistAlertCell";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

const pidKey = (uid: string) => `dsex.portfolio.pid.${uid}`;
const nudgeKey = (uid: string) => `dsex.portfolio.nudge3.${uid}`;
const lastSeenKey = (uid: string) => `dsex.portfolio.lastseen.${uid}`;
/** Only surface a "since last visit" delta when the prior visit is at least this old. */
const LAST_SEEN_MIN_AGE_MS = 60 * 60 * 1000;

/** Two cards side by side from `md:`; a lone card takes the full width. */
const PAIR = "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 [&>*:only-child]:md:col-span-2";

const GRADE_TEXT: Record<Grade, string> = {
  A: "text-positive",
  B: "text-positive",
  C: "text-watch",
  D: "text-watch",
  F: "text-negative",
};

function flattenScores(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  return new Map(flattenTiers(scores).map((s) => [s.trading_code.toUpperCase(), s]));
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
    signal: signalInfoFromApi(holding.signal),
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

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "code", label: "Code" },
  { key: "qty", label: "Shares" },
  { key: "avgcost", label: "Price you paid" },
  { key: "invested", label: "Money put in" },
  { key: "ltp", label: "Price now" },
  { key: "curvalue", label: "Value" },
  { key: "pnl", label: "Profit" },
  { key: "range", label: "Place in yearly range" },
  { key: "signal", label: "Signal" },
];

const SORT_LABEL_BN: Record<SortKey, string> = {
  code: "কোড",
  qty: "শেয়ারের সংখ্যা",
  avgcost: "কেনার দাম",
  invested: "বিনিয়োগ",
  ltp: "এখনকার দাম",
  curvalue: "মূল্য",
  pnl: "লাভ-ক্ষতি",
  range: "বছরের সীমায় অবস্থান",
  signal: "সংকেত",
};

/** The sort menu: the useful orders, each in the direction a reader means. */
const SORT_OPTIONS: { key: SortKey; dir: "asc" | "desc" }[] = [
  { key: "curvalue", dir: "desc" },
  { key: "pnl", dir: "desc" },
  { key: "pnl", dir: "asc" },
  { key: "invested", dir: "desc" },
  { key: "range", dir: "asc" },
  { key: "signal", dir: "asc" },
  { key: "code", dir: "asc" },
];

const SIGNAL_RANK: Record<SignalInfo["signal"], number> = { sell: 0, none: 1, buy_more: 2 };

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

/** The ONE loading shape for this page — the hero and the stock list — used
 *  for the auth check and the data fetch alike, so the page never flips
 *  between two placeholders. */
function PortfolioSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading portfolio" role="status">
      <div className="pt-1">
        <Skeleton width={150} height={14} className="mb-3" />
        <Skeleton width="60%" height={48} className="mb-3" />
        <Skeleton width="45%" height={16} />
      </div>
      <div className="soft-card pf-answers">
        <div className="pf-answer-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pf-answer">
              <Skeleton width={70} height={12} />
              <Skeleton width="70%" height={20} />
            </div>
          ))}
        </div>
      </div>
      <div className="soft-card pf-holds">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pf-hold">
            <div className="pf-hold-top">
              <div className="flex flex-col gap-2">
                <Skeleton width={i % 2 ? "45%" : "60%"} height={16} />
                <Skeleton width="35%" height={12} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton width={90} height={16} />
                <Skeleton width={70} height={12} />
              </div>
            </div>
          </div>
        ))}
      </div>
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
  // Upcoming record dates with cash-per-share — sizes each dividend to the
  // user's position in taka. Only the record_dates slice is kept/cached.
  const [calendar, setCalendar] = useState<Pick<DividendCalendarData, "record_dates"> | null>(
    () => readCache<Pick<DividendCalendarData, "record_dates">>(cacheKeys.dividendCalendar),
  );
  const [news, setNews] = useState<WatchlistNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(() => {
    if (!userId) return true;
    return readCache<PortfolioHolding[]>(cacheKeys.portfolio(userId)) === null;
  });
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<PortfolioSignalEvent[]>([]);
  const [dsexPct, setDsexPct] = useState<number | null>(null);
  // When the scores this page reads were computed — the "How we decide" date.
  const [scoresAt, setScoresAt] = useState<string | null>(
    () => readCache<ScoresResponse>(cacheKeys.scores)?.computed_at ?? null,
  );
  // The page follows the one navbar language switch (docs/voice.md).
  const { lang } = useLang();
  const [lastSeen, setLastSeen] = useState<{ value: number; ts: string } | null>(null);
  const wroteLastSeen = useRef(false);

  // Which portfolio is open (main unless the reader picked another), plus the
  // history log, waiting corporate actions, cost rates and the list.
  const [pid, setPid] = useState<string>(MAIN_PORTFOLIO_ID);
  const [log, setLog] = useState<PortfolioLogEntry[]>([]);
  const [suggestions, setSuggestions] = useState<CorporateActionSuggestion[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings>(DEFAULT_PORTFOLIO_SETTINGS);
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [history, setHistory] = useState<PortfolioHistory | null>(null);
  // "What to buy next" from the recommendation engine (null → no card).
  const [buyNext, setBuyNext] = useState<BuyNext | null>(null);
  const [watchEvents, setWatchEvents] = useState<PortfolioWatchEvent[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMain = pid === MAIN_PORTFOLIO_ID;

  function applyHoldings(next: PortfolioHolding[], nextLog?: PortfolioLogEntry[]) {
    setHoldings(next);
    if (nextLog) setLog(nextLog);
    if (userId && isMain) writeCache(cacheKeys.portfolio(userId), next);
  }

  /** A full portfolio response (GET, or an action endpoint that returns the whole state). */
  function applyResponse(res: PortfolioResponse) {
    applyHoldings(res.holdings, res.log ?? []);
    setSuggestions(res.suggestions ?? []);
    if (res.settings) setSettings(res.settings);
    if (res.portfolios) setPortfolios(res.portfolios);
  }

  // Restore the last-open portfolio for this reader.
  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(pidKey(userId));
      if (saved && saved !== MAIN_PORTFOLIO_ID) {
        setPid(saved);
        setDataLoading(true);
      }
    } catch {}
  }, [userId]);

  function selectPortfolio(next: string) {
    if (next === pid) return;
    setPid(next);
    setDataLoading(true);
    setHistory(null);
    setLog([]);
    setSuggestions([]);
    try {
      if (userId) localStorage.setItem(pidKey(userId), next);
    } catch {}
  }

  // Prior-visit snapshot (value + timestamp) powering the "since your last visit" line.
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(lastSeenKey(userId));
      setLastSeen(raw ? JSON.parse(raw) : null);
    } catch {
      setLastSeen(null);
    }
  }, [userId]);

  // Add-stock sheet
  const [addOpen, setAddOpen] = useState(false);

  // Buy / Sell a specific holding — written to the history log.
  const [tx, setTx] = useState<{
    mode: "buy" | "sell";
    holding: PortfolioHolding;
    ltp: number | null;
    companyName: string | null;
  } | null>(null);

  function openTx(mode: "buy" | "sell", row: ComputedRow) {
    setTx({ mode, holding: row.holding, ltp: row.ltp, companyName: row.company_name });
  }

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
    Promise.allSettled([
      apiGetPortfolio(pid),
      getScores(),
      getAllCodes(),
      getDividendsUpcoming(),
      apiGetSignalEvents(),
      getMarketIndex(),
      getDividendCalendar(),
    ])
      .then(([p, s, c, d, e, m, cal]) => {
        if (cancelled) return;
        if (p.status === "fulfilled") {
          applyResponse(p.value);
        } else if (pid !== MAIN_PORTFOLIO_ID && (p.reason as { status?: number })?.status === 404) {
          // The saved portfolio was deleted elsewhere — fall back to the main one.
          selectPortfolio(MAIN_PORTFOLIO_ID);
          return;
        }
        if (e.status === "fulfilled") {
          setEvents(e.value.events);
        }
        if (m.status === "fulfilled") {
          setDsexPct(m.value.dsex_change_pct ?? null);
        }
        if (s.status === "fulfilled") {
          setPriceMap(flattenScores(s.value));
          setScoresAt(s.value.computed_at ?? null);
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
        if (cal.status === "fulfilled") {
          const trimmed = { record_dates: cal.value.record_dates ?? [] };
          setCalendar(trimmed);
          writeCache(cacheKeys.dividendCalendar, trimmed);
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
  }, [isLoggedIn, pid]);

  // What the watcher spotted (all the reader's stocks, any portfolio).
  useEffect(() => {
    if (!isLoggedIn) return;
    apiGetWatchEvents()
      .then((r) => setWatchEvents(r.events ?? []))
      .catch(() => {});
  }, [isLoggedIn]);

  // Value history — refetched when the holdings change shape (codes or share counts).
  const historyKey = useMemo(
    () => holdings.map((h) => `${h.trading_code}:${h.qty}`).sort().join(","),
    [holdings],
  );
  useEffect(() => {
    if (!isLoggedIn || !historyKey) return;
    let cancelled = false;
    apiGetPortfolioHistory(pid)
      .then((h) => !cancelled && setHistory(h))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, pid, historyKey]);

  // Buy ideas — the engine re-reads the holdings, so refetch on the same key.
  useEffect(() => {
    if (!isLoggedIn || !historyKey) {
      setBuyNext(null);
      return;
    }
    let cancelled = false;
    apiGetBuyNext(pid)
      .then((b) => !cancelled && setBuyNext(b))
      .catch(() => !cancelled && setBuyNext(null));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, pid, historyKey]);

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

  const analysis = useMemo(() => analyzePortfolio(rows, priceMap, lang), [rows, priceMap, lang]);
  const rebalance = useMemo(() => planFromEngine(buyNext, lang), [buyNext, lang]);
  const nextMove = useMemo(() => buildNextMove(analysis, rebalance, lang), [analysis, rebalance, lang]);
  const lifts = useMemo(
    () => gradeLifts(rows, priceMap, analysis, rebalance, lang),
    [rows, priceMap, analysis, rebalance, lang],
  );
  const proInsights = useMemo(() => buildProInsights(analysis, priceMap, lang), [analysis, priceMap, lang]);
  const { isPremium, state: planState, premiumUntil } = usePremium();
  // An extra portfolio kept from a free month that has ended: readable, not editable.
  const readOnly = !isMain && !isPremium;
  const made = useMemo(() => moneyMade(holdings, priceMap, log, settings), [holdings, priceMap, log, settings]);
  const caughtThisTrial = useMemo(() => {
    if (!premiumUntil) return watchEvents.length;
    const start = new Date(new Date(premiumUntil).getTime() - 30 * 86_400_000).toISOString();
    return watchEvents.filter((e) => e.created_at >= start).length;
  }, [watchEvents, premiumUntil]);

  // Updates on the stocks in the open portfolio only — chapter 2 is about these.
  const heldUpper = useMemo(
    () => new Set(holdings.map((h) => h.trading_code.toUpperCase())),
    [holdings],
  );
  const myWatch = useMemo(
    () => watchEvents.filter((e) => heldUpper.has(e.code.toUpperCase())),
    [watchEvents, heldUpper],
  );
  const myFlips = useMemo(
    () => events.filter((e) => heldUpper.has(e.trading_code.toUpperCase())),
    [events, heldUpper],
  );
  // Each holding card's own update tags: one per kind, worst first, two at most.
  const updateTags = useMemo(() => {
    const rank = { bad: 0, watch: 1, good: 2 } as const;
    const by = new Map<string, PortfolioWatchEvent[]>();
    for (const e of [...myWatch].sort((a, b) => rank[a.level] - rank[b.level] || b.day.localeCompare(a.day))) {
      const code = e.code.toUpperCase();
      const list = by.get(code) ?? [];
      if (list.length < 2 && !list.some((x) => x.kind === e.kind)) list.push(e);
      by.set(code, list);
    }
    return by;
  }, [myWatch]);

  const lockedWatchCount = useMemo(() => myWatch.filter((e) => !e.free).length, [myWatch]);

  // The reader's own stakes for the page's one Premium lock, in taka.
  const proStakes = useMemo(
    // The week's free events are open above the lock, so they aren't stakes.
    () => buildPremiumStakes(analysis, proInsights, lockedWatchCount, lang),
    [analysis, proInsights, lockedWatchCount, lang],
  );

  // Moment of value: the reader just reached 3 stocks — tell them what Premium
  // adds, once. Opens /premium (Premium is bought there).
  const prevCount = useRef<number | null>(null);
  useEffect(() => {
    if (dataLoading) return;
    const n = holdings.length;
    const before = prevCount.current;
    prevCount.current = n;
    if (before == null || !userId || !isMain || planState !== "free") return;
    if (before >= 3 || n < 3) return;
    try {
      if (localStorage.getItem(nudgeKey(userId))) return;
      localStorage.setItem(nudgeKey(userId), "1");
    } catch {}
    trackEvent("premium_nudge", { area: "portfolio", why: "third_holding" });
    toast({
      message: lang === "bn"
        ? `আপনার পোর্টফোলিওতে এখন ${n}টি শেয়ার। প্রিমিয়াম প্রতিদিন সবগুলোর ওপর নজর রাখে।`
        : `You now have ${n} shares in your portfolio. Premium keeps an eye on every one of them each day.`,
      duration: 8000,
      action: {
        label: lang === "bn" ? "দেখুন" : "See Premium",
        onClick: () => {
          savePremiumContext({
            from: "portfolio",
            label: lang === "bn" ? "আপনার প্রতিটি শেয়ারের ওপর নজর" : "A daily check on every share you own",
            stakes: proStakes,
          });
          window.location.href = PREMIUM_PATH;
        },
      },
    });
  }, [holdings.length, dataLoading, userId, isMain, planState, lang, proStakes]);

  async function runAction(verb: "apply" | "dismiss" | "undo", id: string) {
    try {
      applyResponse(await apiPortfolioAction(verb, id, pid));
      toast({
        message:
          verb === "apply" ? (
            <T en="Added to your holding" bn="আপনার শেয়ারে যোগ হয়েছে" />
          ) : verb === "undo" ? (
            <T en="Undone" bn="আগের অবস্থায় ফেরানো হয়েছে" />
          ) : (
            <T en="Hidden" bn="লুকানো হয়েছে" />
          ),
        tone: verb === "dismiss" ? "neutral" : "success",
      });
    } catch (err) {
      if (isLimitError(err, "portfolios")) return showLimitNotice("portfolios");
      toast({ message: <T en="We couldn't save that. Please try again." bn="সেভ করা যায়নি। আবার চেষ্টা করুন।" />, tone: "error" });
    }
  }

  async function removeLogEntry(id: string) {
    try {
      applyResponse(await apiDeleteLogEntry(id, pid));
    } catch (err) {
      if (isLimitError(err, "portfolios")) return showLimitNotice("portfolios");
      toast({ message: <T en="We couldn't remove it. Please try again." bn="সরানো যায়নি। আবার চেষ্টা করুন।" />, tone: "error" });
    }
  }

  // Snapshot this visit's value once data has settled, so the *next* visit can
  // show the change since now. Written once per mount.
  useEffect(() => {
    if (dataLoading || !userId || wroteLastSeen.current || summary.totalValue == null) return;
    wroteLastSeen.current = true;
    try {
      localStorage.setItem(
        lastSeenKey(userId),
        JSON.stringify({ value: summary.totalValue, ts: new Date().toISOString() }),
      );
    } catch {}
  }, [dataLoading, userId, summary.totalValue]);

  const valueDelta = useMemo(() => {
    if (!lastSeen || summary.totalValue == null) return null;
    if (Date.now() - Date.parse(lastSeen.ts) < LAST_SEEN_MIN_AGE_MS) return null;
    return { delta: summary.totalValue - lastSeen.value, since: lastSeen.ts };
  }, [lastSeen, summary.totalValue]);

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const bn = lang === "bn";
  const navItems = useMemo(
    () => [
      { id: "pf-money", label: lang === "bn" ? "টাকা" : "Money" },
      { id: "pf-analysis", label: lang === "bn" ? "বিশ্লেষণ" : "Analysis" },
      { id: "pf-stocks", label: lang === "bn" ? "শেয়ার" : "Stocks" },
    ],
    [lang],
  );
  const statementHref = isMain ? "/portfolio/statement" : `/portfolio/statement?pid=${encodeURIComponent(pid)}`;

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
      const res = await apiUpdateHolding(editId, { buy_price: price, qty }, pid);
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
      const res = await apiUpdateHolding(h.id, { buy_price: price, qty }, pid);
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
      const res = await apiDeleteHolding(id, pid);
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
    return <PortfolioSkeleton />;
  }

  if (!isLoggedIn) {
    return (
      <section className="soft-card pf-empty mx-auto mt-4 w-full max-w-md">
        <h2 className="pf-empty-title">
          <T en="Sign in to see your portfolio" bn="পোর্টফোলিও দেখতে সাইন ইন করুন" />
        </h2>
        <p className="pf-empty-text">
          <T
            en="Your shares, your profit or loss and your dividends, all in one place."
            bn="আপনার শেয়ার, মুনাফা বা লোকসান আর ডিভিডেন্ড, সব এক জায়গায়।"
          />
        </p>
        <div className="pf-empty-actions">
          <Button href="/login" variant="primary">
            <T en="Sign in" bn="সাইন ইন" />
          </Button>
          <Button href="/register" variant="quiet">
            <T en="Create an account" bn="অ্যাকাউন্ট খুলুন" />
          </Button>
        </div>
      </section>
    );
  }

  if (dataLoading) {
    return <PortfolioSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        size="inline"
        title={<T en="We couldn't load your portfolio" bn="আপনার পোর্টফোলিও এখন লোড করা যাচ্ছে না" />}
        reload
        className="mt-4"
      />
    );
  }

  const editingHolding = holdings.find((h) => h.id === editId) ?? null;

  const bnCls = bn ? "font-bn" : "";
  const L = (en: string, b: string) => (bn ? b : en);
  const sortLabel = (key: SortKey) => (bn ? SORT_LABEL_BN[key] : COLUMNS.find((c) => c.key === key)?.label ?? key);

  return (
    <div className="flex flex-col" data-privacy={privacy ? "on" : "off"}>
      {/* Top row: which portfolio (main + any extra, Premium) */}
      {(portfolios.length > 1 || holdings.length > 0) && (
        <div className="pf-topbar mb-4">
          <div className="min-w-0 flex-1">
            <PortfolioSwitcher
              portfolios={portfolios.length ? portfolios : [{ id: MAIN_PORTFOLIO_ID, name: "My portfolio", count: holdings.length }]}
              active={pid}
              lang={lang}
              onSelect={selectPortfolio}
              onChanged={(list, select) => {
                setPortfolios(list);
                if (select) selectPortfolio(select);
              }}
            />
          </div>
        </div>
      )}

      {readOnly && (
        <div className="soft-card pf-note mb-4">
          <span className="pf-note-icon"><IconLock size={16} /></span>
          <p className={`pf-note-text ${bnCls}`}>
            {L(
              "This extra portfolio is read-only now. Premium lets you change it again.",
              "এই বাড়তি পোর্টফোলিওটি এখন শুধু দেখা যাবে। বদলাতে প্রিমিয়াম লাগবে।",
            )}
          </p>
        </div>
      )}

      <TrialEndingBanner caught={caughtThisTrial} extraPortfolios={Math.max(0, portfolios.length - 1)} lang={lang} />

      {rowError && <p className="form-error mb-3">{rowError}</p>}

      {holdings.length === 0 ? (
        <div className="flex flex-col gap-4">
          <section className={`soft-card pf-empty pf-rise ${bnCls}`} lang={bn ? "bn" : undefined}>
            <h2 className="pf-empty-title">{L("Start tracking your portfolio", "আপনার পোর্টফোলিও শুরু করুন")}</h2>
            <p className="pf-empty-text">
              {L(
                "Add the shares you own once. After that, this page shows your profit and loss, dividends, news and what to do with each share, every day.",
                "আপনার শেয়ারগুলো একবার যোগ করুন। এরপর প্রতিদিন এই পেজে আপনার লাভ-লোকসান, ডিভিডেন্ড, খবর আর প্রতিটি শেয়ার নিয়ে কী করবেন, তা দেখবেন।",
              )}
            </p>
            <ol className="pf-steps">
              {[
                [L("Find your share", "শেয়ার খুঁজুন"), L("Type the code, such as GP or BATBC.", "কোড লিখুন, যেমন GP বা BATBC।")],
                [L("Enter the price and number", "দাম ও সংখ্যা দিন"), L("What you paid, and how many shares you bought.", "কত দামে কিনেছেন, আর কতগুলো শেয়ার।")],
                [L("See the full picture", "পুরো চিত্র দেখুন"), L("Profit, dividends and next steps, updated every day.", "লাভ, ডিভিডেন্ড আর পরের পদক্ষেপ, প্রতিদিন হালনাগাদ।")],
              ].map(([t, d], i) => (
                <li key={i} className="pf-step">
                  <span className="pf-step-n">{i + 1}</span>
                  <span>
                    <p className="pf-step-t">{t}</p>
                    <p className="pf-step-d">{d}</p>
                  </span>
                </li>
              ))}
            </ol>
            <div className="pf-empty-actions">
              <Button type="button" variant="primary" size="lg" onClick={() => setAddOpen(true)}>
                {L("Add your first share", "প্রথম শেয়ার যোগ করুন")}
              </Button>
              <Button href="/sample-portfolio/diversified" variant="quiet" size="lg">
                {L("See a sample portfolio", "নমুনা পোর্টফোলিও দেখুন")}
              </Button>
            </div>
          </section>

          {/* A reader who sold everything still has their records */}
          <CorrectionsCard
            log={log}
            suggestions={suggestions}
            holdings={holdings}
            lang={lang}
            readOnly={readOnly}
            onAction={runAction}
          />
          <MoneyMadeCard made={made} settings={settings} lang={lang} onEditSettings={() => setSettingsOpen(true)} />
          <HistoryCard
            log={log}
            lang={lang}
            readOnly={readOnly}
            statementHref={statementHref}
            onRemove={removeLogEntry}
          />
        </div>
      ) : (
        // Three chapters (2026-10-26): your money · your stocks · analysis &
        // next steps. Every block lives in exactly one of them; the Premium
        // parts blur where they belong and link to the one card at the end.
        <PageLockScope anchor="pf-premium">
          <DashSectionNav items={navItems} lang={lang} />

          {/* ── 1 · Your money ── */}
          <section id="pf-money" className="dash-section pf-chapter pf-chapter--first" aria-labelledby="pf-money-h">
            <PortfolioHero
              totalInvested={summary.totalInvested}
              totalValue={summary.totalValue}
              pnl={summary.pnl}
              pnlPct={summary.pnl_pct}
              todayMove={todayMove}
              dsexPct={dsexPct}
              holdingsCount={holdings.length}
              privacy={privacy}
              onTogglePrivacy={togglePrivacy}
              lang={lang}
              grade={{
                letter: analysis.grade,
                title: L(
                  `Grade ${analysis.grade} · ${GRADE_WORDS[analysis.gradeLabel].en}`,
                  `গ্রেড ${analysis.grade} · ${GRADE_WORDS[analysis.gradeLabel].bn}`,
                ),
                line:
                  analysis.bad.length > 0
                    ? L(
                        `${analysis.bad.length} thing${analysis.bad.length === 1 ? " needs" : "s need"} your attention. See the analysis.`,
                        `${analysis.bad.length}টি বিষয়ে নজর দেওয়া দরকার। বিশ্লেষণ দেখুন।`,
                      )
                    : L("See what's working and what to do next", "কী ভালো চলছে আর এরপর কী করবেন, দেখুন"),
                onOpen: () => goTo("pf-analysis"),
              }}
            />
            <h2 id="pf-money-h" className="sr-only">{L("Your money", "আপনার টাকা")}</h2>

            {/* The stocks you own — one card, one row per stock */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="pf-hold-bar">
                <h3 className={`text-lg font-bold text-text-main ${bnCls}`} lang={bn ? "bn" : undefined}>
                  {L("Your shares", "আপনার শেয়ারগুলো")}{" "}
                  <span className="pf-num font-semibold text-text-muted">{holdings.length}</span>
                </h3>
                <div className="pf-hold-tools">
                  {/* Phones: Add on the title line, the sort full width under it (the Edit + Add pair below is 640px+) */}
                  {!readOnly && (
                    <span className="sm:hidden">
                      <Button type="button" onClick={() => setAddOpen(true)} variant="quiet" size="md" className="pf-add">
                        <span className="pf-add-dot"><IconPlus size={14} /></span>
                        <span className={bnCls}>{L("Add stock", "শেয়ার যোগ")}</span>
                      </Button>
                    </span>
                  )}
                  {holdings.length > 1 && (
                    <>
                      <label htmlFor="pf-sort" className="sr-only">{L("Sort your shares", "শেয়ারগুলো সাজান")}</label>
                      <select
                        id="pf-sort"
                        value={sort ? `${sort.key}:${sort.dir}` : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return setSort(null);
                          const [key, dir] = v.split(":") as [SortKey, "asc" | "desc"];
                          setSort({ key, dir });
                        }}
                        className={`pf-sort ${bnCls}`}
                      >
                        <option value="">{L("Sort: as added", "সাজানো: যোগের ক্রমে")}</option>
                        {SORT_OPTIONS.map((o) => (
                          <option key={`${o.key}:${o.dir}`} value={`${o.key}:${o.dir}`}>
                            {L("Sort: ", "সাজানো: ")}
                            {sortLabel(o.key)}
                            {o.key === "code" ? "" : o.dir === "desc" ? L(" (high first)", " (বেশি আগে)") : L(" (low first)", " (কম আগে)")}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {!readOnly && (
                    <span className="hidden items-center gap-2 sm:flex">
                      <Button type="button" onClick={openEditPicker} variant="quiet" size="sm">
                        {L("Edit", "বদলান")}
                      </Button>
                      <Button type="button" onClick={() => setAddOpen(true)} variant="quiet" size="md" className="pf-add">
                        <span className="pf-add-dot"><IconPlus size={14} /></span>
                        <span className={bnCls}>{L("Add stock", "শেয়ার যোগ")}</span>
                      </Button>
                    </span>
                  )}
                </div>
              </div>

              <div id="pf-holds" className="dash-section soft-card pf-holds pf-rise">
                {sortedRows.map((row) => {
                  const code = row.holding.trading_code;
                  const tags = updateTags.get(code.toUpperCase()) ?? [];
                  const pos =
                    row.ltp != null && row.w52_high != null && row.w52_low != null && row.w52_high > row.w52_low
                      ? Math.max(0, Math.min(1, (row.ltp - row.w52_low) / (row.w52_high - row.w52_low)))
                      : null;
                  return (
                    <article key={row.holding.id} className="pf-hold">
                      <div className="pf-hold-top">
                        <div className="min-w-0">
                          <Link prefetch={false} href={`/stock/${code}`} className="pf-hold-name">
                            {row.company_name ?? code}
                          </Link>
                          <p className={`pf-hold-sub ${bnCls}`}>
                            <span className="pf-hold-code">{code}</span>
                            {" · "}
                            <span className="pv">
                              {bn
                                ? `${row.holding.qty.toLocaleString("en-IN")}টি শেয়ার`
                                : `${row.holding.qty.toLocaleString("en-IN")} share${row.holding.qty === 1 ? "" : "s"}`}
                            </span>
                          </p>
                        </div>
                        <div className="pf-hold-val">
                          <b className="pv">{row.current_value != null ? takaGroup(row.current_value) : "—"}</b>
                          {row.pnl != null && (
                            <span className={`pv ${row.pnl > 0 ? "pf-up" : row.pnl < 0 ? "pf-down" : "pf-flat"}`}>
                              {row.pnl > 0 ? "+" : row.pnl < 0 ? "−" : ""}
                              {takaGroup(Math.abs(row.pnl))}
                              {row.pnl_pct != null ? ` · ${row.pnl_pct > 0 ? "+" : row.pnl_pct < 0 ? "−" : ""}${Math.abs(row.pnl_pct).toFixed(1)}%` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {(row.signal.signal !== "none" || tags.length > 0) && (
                        <div className="pf-hold-mid">
                          <SignalChip
                            signal={row.signal.signal}
                            reason={row.signal.reason}
                            muted={row.signal.muted}
                            lang={bn ? "bn" : "en"}
                          />
                          {/* This stock's own updates, from chapter 2's list */}
                          {tags.map((e) => (
                            <Chip key={e.kind} tone={LEVEL_TONE[e.level]}>
                              <span className={bnCls}>{bn ? KIND_TAG[e.kind].bn : KIND_TAG[e.kind].en}</span>
                            </Chip>
                          ))}
                        </div>
                      )}

                      <div className={`pf-hold-facts ${bnCls}`}>
                        <div className="pf-fact">
                          <span className="pf-fact-k">{L("You paid", "কেনার দাম")}</span>
                          <span className="pf-fact-v pv">{taka(row.holding.buy_price, 2)}</span>
                        </div>
                        <div className="pf-fact">
                          <span className="pf-fact-k">{L("Price now", "এখনকার দাম")}</span>
                          <span className="pf-fact-v">{row.ltp != null ? taka(row.ltp, 2) : "—"}</span>
                        </div>
                        <div className="pf-fact">
                          <span className="pf-fact-k">{L("You put in", "বিনিয়োগ")}</span>
                          <span className="pf-fact-v pv">{takaCompact(row.cost_basis)}</span>
                        </div>
                        {pos != null && (
                          <div
                            className="pf-fact pf-fact--range"
                            title={`${L("Yearly range", "বছরের সীমা")}: ৳${row.w52_low!.toFixed(1)} – ৳${row.w52_high!.toFixed(1)}`}
                          >
                            <span className="pf-fact-k">{L("Where the price sits this year", "এ বছরে দাম কোথায়")}</span>
                            <div className="pf-range" aria-hidden>
                              <i style={{ left: `${(pos * 100).toFixed(1)}%` }} />
                            </div>
                            <div className="pf-range-ends">
                              <span>{L("Low", "সর্বনিম্ন")} {row.w52_low!.toFixed(1)}</span>
                              <span>{L("High", "সর্বোচ্চ")} {row.w52_high!.toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {!readOnly && (
                        <div className="pf-hold-actions">
                          <Button type="button" variant="quiet" size="sm" onClick={() => openTx("buy", row)} aria-label={`${L("Bought more", "আরও কিনেছি")} ${code}`}>
                            {L("Bought more", "আরও কিনেছি")}
                          </Button>
                          <Button type="button" variant="quiet" size="sm" onClick={() => openTx("sell", row)} aria-label={`${L("Sold", "বিক্রি করেছি")} ${code}`}>
                            {L("Sold", "বিক্রি করেছি")}
                          </Button>
                          <span className="pf-spacer" />
                          <WatchlistAlertCell code={code} ltp={row.ltp} w52High={row.w52_high} w52Low={row.w52_low} />
                          <Button type="button" variant="link" size="sm" iconOnly onClick={() => startEdit(row.holding)} aria-label={`${L("Edit", "বদলান")} ${code}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            iconOnly
                            onClick={() => handleDelete(row.holding.id)}
                            disabled={busyId === row.holding.id}
                            className="hover:text-negative"
                            aria-label={`${L("Remove", "সরান")} ${code}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                            </svg>
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            {/* How it's moving — own daily snapshots, or a replay of today's shares */}
            <ValueHistoryCard history={history} lang={lang} />
            {/* What moved it — per-stock share of the gain / loss */}
            <ContributionStrip rows={rows} lang={lang} />
            {/* Where it sits — per company, per sector */}
            <div className="pf-pair">
              <AllocationChart analysis={analysis} lang={lang} />
              <SectorBreakdownChart analysis={analysis} lang={lang} />
            </div>
            {/* Money made so far · cash coming */}
            <div className="pf-pair">
              <MoneyMadeCard made={made} settings={settings} lang={lang} onEditSettings={() => setSettingsOpen(true)} />
              <DividendIncomeCard rows={rows} priceMap={priceMap} dividends={dividends} calendar={calendar} lang={lang} />
            </div>
            {/* Every buy, sale, dividend and bonus — the records */}
            <HistoryCard
              log={log}
              lang={lang}
              readOnly={readOnly}
              statementHref={statementHref}
              onRemove={removeLogEntry}
            />
          </section>

          {/* ── 2 · Analysis & next steps ── */}
          <section id="pf-analysis" className="dash-section pf-chapter" aria-labelledby="pf-analysis-h">
            <PfChapterHead
              id="pf-analysis-h"
              title={L("Analysis and what to do next", "বিশ্লেষণ ও এরপর কী করবেন")}

              lead={L("How your portfolio stands, and the next steps.", "আপনার পোর্টফোলিও কেমন, আর পরের পদক্ষেপ।")}
            />
            {/* The grade, its three scores and the one thing to act on first — free */}
            <AnalysisTop analysis={analysis} next={nextMove} lang={lang} />
            {/* The three lists (the rest of each list blurs in place) */}
            <PortfolioAnalysisView
              analysis={analysis}
              lang={lang}
              locked={!isPremium}
              moreHref="#pf-premium"
              showSectorSpread={false}
              showHoldingsList={false}
              showDisclaimer={false}
              showGrade={false}
            />
            {/* What to do next — every card shows for everyone; for free readers
                only the data inside blurs, with one "Unlock with Premium" button */}
            {lifts.length > 0 && <GradeLiftCard lifts={lifts} lang={lang} />}
            {(rebalance.gaps.length > 0 || rebalance.picks.length > 0) && <RebalanceHelper plan={rebalance} lang={lang} />}
            <ProInsights insights={proInsights} lang={lang} />
            <div id="pf-whatif" className="dash-section">
              <WhatIfCard rows={rows} priceMap={priceMap} allCodes={allCodes} lang={lang} />
            </div>
            {/* THE one Premium card on this page — nothing for Premium readers */}
            <PortfolioPremium stakes={proStakes} lang={lang} />
            {/* Every input and cut-off behind this chapter — free */}
            <HowWeDecide analysis={analysis} scoresAt={scoresAt} lang={lang} />
            <p className={`pf-disclaimer ${bnCls}`}>
              {L(
                "This analysis is for guidance only. Always do your own research before making investment decisions.",
                "এই বিশ্লেষণ শুধু ধারণা দেওয়ার জন্য। বিনিয়োগের সিদ্ধান্ত নেওয়ার আগে সবসময় নিজে যাচাই করুন।",
              )}
            </p>
          </section>

          {/* ── 3 · Your stocks ── */}
          <section id="pf-stocks" className="dash-section pf-chapter" aria-labelledby="pf-stocks-h">
            <PfChapterHead
              id="pf-stocks-h"
              title={L("What's new on your shares", "আপনার শেয়ারে নতুন কী")}

              lead={L("Everything that happened on the shares you own, and their news.", "আপনার শেয়ারে যা ঘটেছে, আর সেগুলোর খবর।")}
            />
            <StockUpdates
              flips={myFlips}
              watchEvents={myWatch}
              valueDelta={valueDelta}
              isPremium={isPremium}
              lang={lang}
            />
            {/* Bonus shares + cash dividends kept right on the holding (with Undo) */}
            <CorrectionsCard
              log={log}
              suggestions={suggestions}
              holdings={holdings}
              lang={lang}
              readOnly={readOnly}
              onAction={runAction}
            />
            <PfCard
              title={L("News on your shares", "আপনার শেয়ারের খবর")}

              note={L("Announcements from the companies you own.", "আপনার কোম্পানিগুলোর ঘোষণা।")}
              lang={lang}
              dataCard="news"
            >
              <PortfolioNews
                news={news}
                loading={newsLoading}
                names={new Map(rows.map((r) => [r.holding.trading_code.toUpperCase(), r.company_name]))}
                lang={lang}
              />
            </PfCard>
          </section>
        </PageLockScope>
      )}

      {/* Add stock — bottom-sheet on mobile, centered modal on desktop */}
      {addOpen && (
        <AddHoldingModal
          allCodes={allCodes}
          priceMap={priceMap}
          existingCodes={existingCodes}
          onClose={() => setAddOpen(false)}
          onAdded={applyHoldings}
          pid={pid}
          lang={lang}
        />
      )}

      {/* Buy / Sell a holding — both written to the history; a sale keeps its profit */}
      {tx && (
        <BuySellModal
          mode={tx.mode}
          holding={tx.holding}
          ltp={tx.ltp}
          companyName={tx.companyName}
          onClose={() => setTx(null)}
          onDone={applyHoldings}
          pid={pid}
          lang={lang}
        />
      )}

      <PortfolioSettingsSheet
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSaved={setSettings}
      />

      {/* Edit holding — the shared Sheet (bottom sheet on phones, dialog from 640px) */}
      <Sheet
        open={editingHolding != null}
        onClose={() => setEditId(null)}
        dismissible={!editSaving}
        title={editingHolding ? L(`Edit ${editingHolding.trading_code}`, `${editingHolding.trading_code} বদলান`) : ""}

        footer={
          editingHolding && (
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={handleEditSave} disabled={editSaving} variant="primary" block>
                {editSaving ? L("Saving…", "সেভ হচ্ছে…") : L("Save changes", "সেভ করুন")}
              </Button>
              <Button
                type="button"
                variant="danger"
                block
                onClick={() => handleDelete(editingHolding.id)}
                disabled={busyId === editingHolding.id || editSaving}
              >
                {busyId === editingHolding.id ? L("Removing…", "সরানো হচ্ছে…") : L("Remove this share", "এই শেয়ার সরান")}
              </Button>
            </div>
          )
        }
      >
        <div className={`flex flex-col gap-4 ${bnCls}`}>
          <p className="text-sm text-text-muted">
            {L(
              "Fixing a mistake? Change it here. If you bought or sold shares, use “Bought more” or “Sold” instead, so your history stays right.",
              "ভুল ঠিক করছেন? এখানে বদলান। শেয়ার কিনলে বা বেচলে “আরও কিনেছি” বা “বিক্রি করেছি” ব্যবহার করুন, তাহলে ইতিহাস ঠিক থাকবে।",
            )}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pf-1" className="text-sm font-semibold text-text-main">{L("Shares", "শেয়ারের সংখ্যা")}</label>
              <input
                id="pf-1"
                type="number"
                value={editForm.qty}
                min="1"
                step="1"
                inputMode="numeric"
                onChange={(e) => setEditForm((f) => ({ ...f, qty: e.target.value }))}
                className="input-field w-full py-3 text-lg tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pf-2" className="text-sm font-semibold text-text-main">{L("Price you paid (৳)", "কেনার গড় দাম (৳)")}</label>
              <input
                id="pf-2"
                type="number"
                value={editForm.price}
                min="0.01"
                step="0.01"
                inputMode="decimal"
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                className="input-field w-full py-3 text-lg tabular-nums"
              />
            </div>
          </div>
          {rowError && <p className="form-error">{rowError}</p>}
        </div>
      </Sheet>

      {/* Edit portfolio — pick a stock, then fix its shares / price */}
      <Sheet
        open={editPickerOpen}
        onClose={() => setEditPickerOpen(false)}
        dismissible={!pickerSaving}
        title={L("Edit your shares", "আপনার শেয়ার বদলান")}

        footer={
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={savePicker} disabled={pickerSaving} variant="primary" block>
              {pickerSaving ? L("Saving…", "সেভ হচ্ছে…") : L("Save changes", "সেভ করুন")}
            </Button>
            <Button
              type="button"
              variant="danger"
              block
              onClick={() => {
                const h = holdings.find((x) => x.trading_code === pickerCode);
                if (h) handleDelete(h.id);
              }}
              disabled={pickerSaving || busyId !== null}
            >
              {busyId !== null ? L("Removing…", "সরানো হচ্ছে…") : L(`Remove ${pickerCode}`, `${pickerCode} সরান`)}
            </Button>
          </div>
        }
      >
        <div className={`flex flex-col gap-4 ${bnCls}`}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pf-3" className="text-sm font-semibold text-text-main">{L("Share", "শেয়ার")}</label>
            <select
              id="pf-3"
              value={pickerCode}
              onChange={(e) => selectPickerCode(e.target.value)}
              className="input-field w-full py-2.5 text-base"
            >
              {holdings.map((h) => (
                <option key={h.id} value={h.trading_code}>
                  {h.trading_code}
                  {priceMap.get(h.trading_code)?.company_name ? ` · ${priceMap.get(h.trading_code)?.company_name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pf-4" className="text-sm font-semibold text-text-main">{L("Shares", "শেয়ারের সংখ্যা")}</label>
              <input
                id="pf-4"
                type="number"
                value={pickerForm.qty}
                min="1"
                step="1"
                inputMode="numeric"
                onChange={(e) => setPickerForm((f) => ({ ...f, qty: e.target.value }))}
                className="input-field w-full py-3 text-lg tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pf-5" className="text-sm font-semibold text-text-main">{L("Price you paid (৳)", "কেনার গড় দাম (৳)")}</label>
              <input
                id="pf-5"
                type="number"
                value={pickerForm.price}
                min="0.01"
                step="0.01"
                inputMode="decimal"
                onChange={(e) => setPickerForm((f) => ({ ...f, price: e.target.value }))}
                className="input-field w-full py-3 text-lg tabular-nums"
              />
            </div>
          </div>
          {pickerError && <p className="form-error">{pickerError}</p>}
        </div>
      </Sheet>

      {/* Remove a stock — confirm first */}
      <Sheet
        open={confirmDeleteId != null}
        onClose={() => setConfirmDeleteId(null)}
        title={L("Remove this share?", "এই শেয়ার সরাবেন?")}
        footer={
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={confirmDelete} variant="danger" block>
              {L("Remove", "সরান")}
            </Button>
            <Button type="button" variant="quiet" block onClick={() => setConfirmDeleteId(null)}>
              {L("Cancel", "বাতিল")}
            </Button>
          </div>
        }
      >
        <p className={`text-sm text-text-main ${bnCls}`}>
          {L(
            `${holdings.find((x) => x.id === confirmDeleteId)?.trading_code ?? "This stock"} comes off your portfolio. This can’t be undone. If you sold the shares, use “Sold” instead so the profit is kept.`,
            `${holdings.find((x) => x.id === confirmDeleteId)?.trading_code ?? "এই শেয়ার"} আপনার পোর্টফোলিও থেকে সরে যাবে, ফেরানো যাবে না। শেয়ার বিক্রি করে থাকলে “বিক্রি করেছি” ব্যবহার করুন, তাহলে লাভ হিসাবে থাকবে।`,
          )}
        </p>
      </Sheet>
    </div>
  );
}
