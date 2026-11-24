"use client";

import { authHref } from "@/lib/next-path";
import Link from "@/components/ui/Link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  getScores,
  getAllCodes,
  getRange52w,
  getWatchlistNews,
  getDividendsUpcoming,
  getDividendCalendar,
  getMarketIndex,
  getUpcomingResults,
  getWatchlistGlance,
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
  apiGetNotifications,
  apiVisitWatchlist,
  MAIN_PORTFOLIO_ID,
  type NotificationItem,
  type NotificationsFeed,
  type WatchlistMeta,
  type PortfolioSignalEvent,
  type PortfolioLogEntry,
  type PortfolioResponse,
  type CorporateActionSuggestion,
  type PortfolioSettings,
  type PortfolioListItem,
  type PortfolioHistory,
  type PortfolioWatchEvent,
  type BuyNext,
  type GlanceRow,
  type UpcomingResult,
} from "@/lib/api";
import { changePct, changeTone, companyShort, money, takaGroup } from "@/lib/formatters";
import {
  signalInfoFromApi,
  portfolioTodayMove,
  analyzePortfolio,
  planFromEngine,
  type SignalInfo,
  type AnalysisLang,
} from "@/lib/portfolio-analysis";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { getStoredUser } from "@/lib/auth";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import Sheet from "@/components/ui/Sheet";
import AllocationChart from "./AllocationChart";
import SectorBreakdownChart from "./SectorBreakdownChart";
import { OpenScope, PageLockScope } from "@/components/premium/LockScope";
import { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import Chip from "@/components/ui/Chip";
import PfCard from "./PfCard";
import {
  IconChevronRight,
  IconClose,
  IconLock,
  IconPlus,
  IconSearch,
} from "@/components/ui/icons";
import { buildProInsights, buildPremiumStakes } from "@/lib/portfolio-pro";
import { usePremium, isLimitError, MAX_HOLDINGS, PREMIUM_PATH } from "@/lib/premium";
import { moneyMade, DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/portfolio-ledger";
import { savePremiumContext } from "@/lib/premium-context";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import MoneyMadeCard from "./MoneyMadeCard";
import ValueHistoryCard from "./ValueHistoryCard";
import CorrectionsCard from "./CorrectionsCard";
import HistoryCard from "./HistoryCard";
import WhatIfCard from "./WhatIfCard";
import PortfolioSwitcher from "./PortfolioSwitcher";
import PortfolioSettingsSheet from "./PortfolioSettingsSheet";
import ContributionStrip from "./ContributionStrip";
import DividendIncomeCard from "./DividendIncomeCard";
import PortfolioHero from "./PortfolioHero";
import AddHoldingModal from "./AddHoldingModal";
import BuySellModal from "./BuySellModal";
import PortfolioNews from "./PortfolioNews";
import PortfolioPromo from "./report/PortfolioPromo";
import PfHealth, { PfHealthLocked } from "./report/PfHealth";
import PfTodo from "./report/PfTodo";
import PfShareSheet, { type ShareSheetRow } from "./report/PfShareSheet";
import PfFirstNote from "./report/PfFirstNote";
import PfMoneyRoom from "./report/PfMoneyRoom";
import TierPill from "@/components/ui/TierPill";
import { getTier, type TierKey } from "@/lib/constants";
import { visibleFeed } from "@/lib/feed";
import { getCachedWatchlist, getCachedWatchlistMeta, loadWatchlist, setWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { getCachedAlerts, loadAlerts, subscribeAlerts } from "@/lib/price-alerts";
import { stopWatching } from "@/components/watch-rules/store";
import WatchShareSheet, { type WatchSheetRow } from "./WatchShareSheet";
import WatchSearch from "./WatchSearch";
import WatchPlanLine from "@/components/watchlist/WatchPlanLine";
import ShareWatchlistButton from "@/components/watchlist/ShareWatchlistButton";
import EmptyStateActions from "@/components/watchlist/EmptyStateActions";
import AlertsClient from "@/components/alerts/AlertsClient";
import SectionHeader from "@/components/ui/SectionHeader";
import { buildNextMove, gradeLifts, gradePath } from "@/lib/portfolio-next";
import { buildPortfolioReport } from "@/lib/portfolio-report";
import { SAMPLE_PORTFOLIOS } from "@/lib/sample-portfolios";
import { isoLocal, todayDhaka } from "@/lib/dividend-dates";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

const pidKey = (uid: string) => `dsex.portfolio.pid.${uid}`;
const nudgeKey = (uid: string) => `dsex.portfolio.nudge3.${uid}`;
const lastSeenKey = (uid: string) => `dsex.portfolio.lastseen.${uid}`;
/** Only surface a "since last visit" delta when the prior visit is at least this old. */
const LAST_SEEN_MIN_AGE_MS = 60 * 60 * 1000;

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

type SortKey = "code" | "qty" | "avgcost" | "invested" | "ltp" | "curvalue" | "pnl" | "range";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "code", label: "Code" },
  { key: "qty", label: "Shares" },
  { key: "avgcost", label: "Price you paid" },
  { key: "invested", label: "Money put in" },
  { key: "ltp", label: "Price now" },
  { key: "curvalue", label: "Value" },
  { key: "pnl", label: "Profit" },
  { key: "range", label: "Place in yearly range" },
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
};

/** The sort menu: the useful orders, each in the direction a reader means. */
const SORT_OPTIONS: { key: SortKey; dir: "asc" | "desc" }[] = [
  { key: "curvalue", dir: "desc" },
  { key: "pnl", dir: "desc" },
  { key: "pnl", dir: "asc" },
  { key: "invested", dir: "desc" },
  { key: "range", dir: "asc" },
  { key: "code", dir: "asc" },
];

/** From this many stocks the list gets a search field and filter chips. */
const FILTER_FROM = 8;

// No Buy more / Sell chips here (2026-11-01): the holding's signal shows only
// in the Premium chapters below.
type HoldFilter = "all" | "loss" | "updates";

const FILTERS: { key: HoldFilter; en: string; bn: string }[] = [
  { key: "all", en: "All", bn: "সব" },
  { key: "loss", en: "In loss", bn: "লোকসানে" },
  { key: "updates", en: "Has updates", bn: "আপডেট আছে" },
];

function matchesFilter(row: ComputedRow, f: HoldFilter, hasUpdates: boolean): boolean {
  switch (f) {
    case "loss":
      return row.pnl != null && row.pnl < 0;
    case "updates":
      return hasUpdates;
    default:
      return true;
  }
}

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
        <div className="pf-answer-grid pf-answer-grid--two">
          {[0, 1].map((i) => (
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
            <div className="pf-hold-main">
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
          </div>
        ))}
      </div>
    </div>
  );
}

/** A feed row counts as new on a share's row for this many days. */
const NEW_DAYS = 7;
type ListView = "all" | "own" | "watch";
const CODE_RX = /^[A-Z0-9&.-]{1,20}$/;

/**
 * Two pages, one component (2026-11-25, step 3 of the simplify review: the
 * user chose a separate /my page and one sheet for every row):
 *  - `view="portfolio"` (/portfolio): the money, the check, what to do and
 *    the details. For the main portfolio its share list is one card that
 *    links to My shares; an extra portfolio keeps its own list here.
 *  - `view="shares"` (/my, "My shares"): ONE list of every share the reader
 *    owns (main portfolio) and watches, with All · I own · I watch; a tap
 *    opens one sheet (owned: `PfShareSheet`, watched: `WatchShareSheet`);
 *    adding, buying, selling, fixing and watching all happen here. The
 *    watchlist page folded into it (/watchlist 301s here).
 * Both read the same data and dialogs, so a sale or a new share shows on
 * both. Each share's updates are the Updates feed's own rows ("one feed,
 * told once"): a row's "N new" and its sheet's list read the feed.
 */
export default function PortfolioClient({ view = "portfolio" }: { view?: "portfolio" | "shares" }) {
  const { isLoading, isLoggedIn } = useAuth();
  const router = useRouter();
  const shares = view === "shares";

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
  // The report's per-share reads (warnings, dividend safety, fair value,
  // profit change, next date) and the results calendar.
  const [glance, setGlance] = useState<Map<string, GlanceRow>>(new Map());
  const [results, setResults] = useState<UpcomingResult[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMain = pid === MAIN_PORTFOLIO_ID;

  // The shares the reader watches (both views: My shares lists them, the
  // portfolio's Activity tab reads their news), the Updates feed (each
  // share's "N new" and its sheet's list), and the price alerts (My shares).
  const [watchCodes, setWatchCodes] = useState<string[]>(() => getCachedWatchlist());
  const [watchMeta, setWatchMeta] = useState<WatchlistMeta>(() => getCachedWatchlistMeta());
  const [feed, setFeed] = useState<NotificationsFeed | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [listView, setListView] = useState<ListView>("all");
  const [watchSheet, setWatchSheet] = useState<string | null>(null);
  const [addInitial, setAddInitial] = useState<string | undefined>(undefined);
  const [sharedCodes, setSharedCodes] = useState<string[]>([]);
  const pendingShare = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const sync = () => {
      setWatchCodes(getCachedWatchlist());
      setWatchMeta(getCachedWatchlistMeta());
    };
    loadWatchlist().then(sync).catch(() => {});
    apiGetNotifications().then(setFeed).catch(() => {});
    loadAlerts().then(() => setAlertCount(getCachedAlerts().length)).catch(() => {});
    const offW = subscribeWatchlist(sync);
    const offA = subscribeAlerts(() => setAlertCount(getCachedAlerts().length));
    return () => {
      offW();
      offA();
    };
  }, [isLoggedIn]);

  // My shares: ?view=own|watch, ?share=CODE (opens its sheet: the portfolio's
  // to-do and old links land here), ?codes=A,B (a shared watchlist link); the
  // visit clears the navbar's news dot (it was the watchlist page's job).
  useEffect(() => {
    if (!shares || !isLoggedIn) return;
    const qs = new URLSearchParams(window.location.search);
    const v = qs.get("view");
    if (v === "own" || v === "watch") setListView(v);
    pendingShare.current = qs.get("share")?.toUpperCase() ?? null;
    const codes = (qs.get("codes") ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => CODE_RX.test(c))
      .slice(0, 50);
    setSharedCodes(codes);
    apiVisitWatchlist().catch(() => {});
  }, [shares, isLoggedIn]);

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

  // Restore the last-open portfolio for this reader (My shares is always the main one).
  useEffect(() => {
    if (!userId || shares) return;
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

  // What the watcher spotted (all the reader's stocks, any portfolio), and
  // the results meetings in the next two weeks.
  useEffect(() => {
    if (!isLoggedIn) return;
    apiGetWatchEvents()
      .then((r) => setWatchEvents(r.events ?? []))
      .catch(() => {});
    getUpcomingResults()
      .then((r) => setResults(r.meetings ?? []))
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
      setGlance(new Map());
      return;
    }
    let cancelled = false;
    // The glance takes 100 codes a request.
    const chunks: string[][] = [];
    for (let i = 0; i < codes.length; i += 100) chunks.push(codes.slice(i, i + 100));
    Promise.all(chunks.map((c) => getWatchlistGlance(c).catch(() => [] as GlanceRow[]))).then((parts) => {
      if (!cancelled) setGlance(new Map(parts.flat().map((g) => [g.code.toUpperCase(), g])));
    });
    getRange52w(codes).then((items) => {
      if (cancelled) return;
      setRanges(new Map(items.map((it) => [it.trading_code.toUpperCase(), it])));
    });
    return () => {
      cancelled = true;
    };
  }, [holdingCodesKey]);

  // News on the shares they own and watch (the Activity tab; since
  // 2026-11-25 watched shares' news lives here, not on a watchlist page).
  const newsCodesKey = useMemo(
    () => [...new Set([...holdings.map((h) => h.trading_code.toUpperCase()), ...watchCodes.map((c) => c.toUpperCase())])].sort().join(","),
    [holdings, watchCodes],
  );
  useEffect(() => {
    const codes = newsCodesKey ? newsCodesKey.split(",") : [];
    if (codes.length === 0) {
      setNews([]);
      setNewsLoading(false);
      return;
    }
    let cancelled = false;
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
  }, [newsCodesKey]);

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

  // The stock page's price lines per held code (glance), so "did you pay a
  // fair price?" uses the stock page's own rule once they have loaded.
  const priceLines = useMemo(
    // A backend without the field yet leaves the code out (the fallback method).
    () => new Map([...glance].filter(([, g]) => g.price_lines !== undefined).map(([code, g]) => [code, g.price_lines ?? null] as const)),
    [glance],
  );
  const analysis = useMemo(
    () => analyzePortfolio(rows, priceMap, lang, { lines: priceLines }),
    [rows, priceMap, lang, priceLines],
  );
  // Cash dividends logged on each holding since it was added (the loss
  // chapter takes them off the price that gives the money back).
  const divReceived = useMemo(() => {
    const added = new Map(holdings.map((h) => [h.trading_code.toUpperCase(), (h.added_at ?? "").slice(0, 10)]));
    const out = new Map<string, number>();
    for (const e of log) {
      if (e.kind !== "dividend" || e.status !== "applied") continue;
      const code = e.code.toUpperCase();
      const since = added.get(code);
      if (since == null || (e.record_date ?? e.date) < since) continue;
      out.set(code, (out.get(code) ?? 0) + (e.amount ?? 0));
    }
    return out;
  }, [holdings, log]);
  const rebalance = useMemo(() => planFromEngine(buyNext, lang), [buyNext, lang]);
  // The report writes both languages, so the first move is built in each.
  const nextBoth = useMemo(
    () => ({
      en: buildNextMove(analysis, planFromEngine(buyNext, "en"), "en"),
      bn: buildNextMove(analysis, planFromEngine(buyNext, "bn"), "bn"),
    }),
    [analysis, buyNext],
  );
  const lifts = useMemo(
    () => gradeLifts(rows, priceMap, analysis, rebalance, lang),
    [rows, priceMap, analysis, rebalance, lang],
  );
  // Three changes to an A (2026-11-11): the grade lifts chained, step by step.
  const path = useMemo(
    () => gradePath(rows, priceMap, analysis, rebalance, { lines: priceLines }),
    [rows, priceMap, analysis, rebalance, priceLines],
  );
  const proInsights = useMemo(() => buildProInsights(analysis, priceMap, lang), [analysis, priceMap, lang]);
  const { isPremium, state: planState } = usePremium();
  // An extra portfolio kept from a free month that has ended: readable, not editable.
  const readOnly = !isMain && !isPremium;
  const made = useMemo(() => moneyMade(holdings, priceMap, log, settings), [holdings, priceMap, log, settings]);

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
  // Each share's updates: the Updates feed's own rows the reader may see
  // (a free reader's counted ones never name a share), newest first.
  const feedOf = useMemo(() => {
    const by = new Map<string, NotificationItem[]>();
    if (!feed) return by;
    for (const i of visibleFeed(feed.items, feed.premium).shown) {
      if (!i.code || i.kind === "letter" || i.kind === "brief") continue;
      const code = i.code.toUpperCase();
      by.set(code, [...(by.get(code) ?? []), i]);
    }
    return by;
  }, [feed]);
  const newOf = useMemo(() => {
    const cut = Date.now() - NEW_DAYS * 86_400_000;
    const by = new Map<string, number>();
    for (const [code, items] of feedOf) {
      const n = items.filter((i) => Date.parse(i.at) >= cut).length;
      if (n > 0) by.set(code, n);
    }
    return by;
  }, [feedOf]);

  // Search + filter chips, shown from FILTER_FROM stocks. A filter whose chip
  // has gone (its count fell to 0) falls back to "All".
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HoldFilter>("all");
  const showFilters = holdings.length >= FILTER_FROM;
  const filterCounts = useMemo(() => {
    const counts: Record<HoldFilter, number> = { all: rows.length, loss: 0, updates: 0 };
    for (const r of rows) {
      const hasUpdates = newOf.has(r.holding.trading_code.toUpperCase());
      for (const f of FILTERS) if (f.key !== "all" && matchesFilter(r, f.key, hasUpdates)) counts[f.key]++;
    }
    return counts;
  }, [rows, newOf]);
  const activeFilter: HoldFilter = showFilters && filterCounts[filter] > 0 ? filter : "all";
  const q = showFilters ? query.trim().toLowerCase() : "";
  const visibleRows = useMemo(() => {
    if (activeFilter === "all" && !q) return sortedRows;
    return sortedRows.filter((r) => {
      const code = r.holding.trading_code.toUpperCase();
      if (!matchesFilter(r, activeFilter, newOf.has(code))) return false;
      return !q || code.toLowerCase().includes(q) || (r.company_name ?? "").toLowerCase().includes(q);
    });
  }, [sortedRows, activeFilter, q, newOf]);

  // A tap on a share opens its whole story in a sheet (2026-11-23; it was a
  // drawer that opened in the list).
  const [sheetId, setSheetId] = useState<string | null>(null);

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
      // The backend refuses an undo it can't make exact (a trade logged after
      // the bonus, or fewer shares now than it added) with a 400.
      if (verb === "undo" && (err as { status?: number })?.status === 400) {
        toast({
          message: (
            <T
              en="This bonus can't be undone here, because the share count has changed since. Edit the holding's share count and price instead."
              bn="এই বোনাস এখানে ফেরানো যাবে না, কারণ এরপর শেয়ারের সংখ্যা বদলেছে। এর বদলে শেয়ারের সংখ্যা আর দাম সম্পাদনা করুন।"
            />
          ),
          tone: "error",
        });
        return;
      }
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

  // The report (2026-10-30): the answer, four chapters, the plan and the
  // questions for the Premium card — all from what the page already holds.
  const report = useMemo(
    () =>
      buildPortfolioReport({
        analysis,
        next: nextBoth,
        plan: rebalance,
        lifts,
        pro: proInsights,
        priceMap,
        glance,
        results,
        watch: myWatch,
        flips: myFlips,
        today: isoLocal(todayDhaka()),
        sinceLast: valueDelta,
        feePct: settings.fee_pct,
        divReceived,
        path,
        divTaxPct: settings.div_tax_pct,
      }),
    [analysis, nextBoth, rebalance, lifts, proInsights, priceMap, glance, results, myWatch, myFlips, valueDelta, settings.fee_pct, settings.div_tax_pct, divReceived, path],
  );
  // Each share's group (free) and the plan's word for it (Premium), for the rows.
  const insightOf = useMemo(() => new Map(analysis.holdings.map((h) => [h.code.toUpperCase(), h])), [analysis]);
  const actionOf = useMemo(() => new Map(report.each.act.map((a) => [a.code.toUpperCase(), a])), [report.each]);
  // Each share's "getting back what you paid" (the old way-back item), for its sheet.
  const wayOf = useMemo(
    () => new Map((report.wayBack?.groups ?? []).flatMap((g) => g.items).map((it) => [it.code.toUpperCase(), it])),
    [report.wayBack],
  );
  const sheetSrc = rows.find((r) => r.holding.id === sheetId) ?? null;
  const sheetRow: ShareSheetRow | null = sheetSrc
    ? {
        code: sheetSrc.holding.trading_code,
        name: companyShort(sheetSrc.company_name) || sheetSrc.holding.trading_code,
        qty: sheetSrc.holding.qty,
        buyPrice: sheetSrc.holding.buy_price,
        ltp: sheetSrc.ltp,
        costBasis: sheetSrc.cost_basis,
        value: sheetSrc.current_value,
        pnl: sheetSrc.pnl,
        pnlPct: sheetSrc.pnl_pct,
        w52High: sheetSrc.w52_high,
        w52Low: sheetSrc.w52_low,
        tier: (() => {
          const k = insightOf.get(sheetSrc.holding.trading_code.toUpperCase())?.tierKey;
          return k && k !== "unscored" ? (k as TierKey) : null;
        })(),
      }
    : null;
  /** Close the share's sheet, then act on its row (the next dialog opens on its own). */
  function sheetFor(act: (r: ComputedRow) => void) {
    const r = sheetSrc;
    setSheetId(null);
    if (r) act(r);
  }
  function openShareByCode(code: string) {
    // The main portfolio's shares live on My shares (2026-11-25): open the sheet there.
    if (!shares && isMain) {
      router.push(`/my?share=${encodeURIComponent(code.toUpperCase())}`);
      return;
    }
    const r = rows.find((x) => x.holding.trading_code.toUpperCase() === code.toUpperCase());
    if (r) setSheetId(r.holding.id);
  }

  // The shares they watch but don't own (My shares lists them after the owned ones).
  const watchRows = useMemo<WatchSheetRow[]>(
    () =>
      watchCodes
        .map((c) => c.toUpperCase())
        .filter((c) => !heldUpper.has(c))
        .map((code) => {
          const s = priceMap.get(code);
          return {
            code,
            name: companyShort(s?.company_name) || code,
            ltp: s?.ltp ?? null,
            change: s?.change_pct ?? null,
            tier: s?.score != null ? getTier(s.score) : null,
            meta: watchMeta[code] ?? null,
          };
        }),
    [watchCodes, heldUpper, priceMap, watchMeta],
  );
  const watchSheetRow = watchRows.find((w) => w.code === watchSheet) ?? null;

  // ?share=CODE: open that share's sheet once the list is in.
  useEffect(() => {
    const c = pendingShare.current;
    if (!c || dataLoading) return;
    const r = rows.find((x) => x.holding.trading_code.toUpperCase() === c);
    if (r) {
      pendingShare.current = null;
      setSheetId(r.holding.id);
    } else if (watchRows.some((w) => w.code === c)) {
      pendingShare.current = null;
      setWatchSheet(c);
    }
  }, [dataLoading, rows, watchRows]);

  async function stopWatchingShare(code: string) {
    setWatchSheet(null);
    const undo = await stopWatching(code);
    toast({
      tone: "neutral",
      message: <T en={`You stopped watching ${code}`} bn={`${code}-এ নজর রাখা বন্ধ করেছেন`} />,
      action: { label: <T en="Undo" bn="ফিরিয়ে আনুন" />, onClick: () => void undo() },
    });
  }

  async function importShared() {
    const merged = Array.from(new Set([...watchCodes.map((c) => c.toUpperCase()), ...sharedCodes]));
    await setWatchlist(merged);
    dismissShared();
  }
  function dismissShared() {
    setSharedCodes([]);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("codes");
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }

  const bn = lang === "bn";
  // The analysis is Premium (2026-11-02): a free reader's chips skip its
  // chapters and point at the one Premium card instead.
  const reportOpen = usePremiumOpen();
  const statementHref = isMain ? "/portfolio/statement" : `/portfolio/statement?pid=${encodeURIComponent(pid)}`;

  const existingCodes = useMemo(
    () => new Set(holdings.map((h) => h.trading_code)),
    [holdings],
  );

  // No free cap on shares since 2026-11-02 (was 7): every account holds up to
  // MAX_HOLDINGS (100) shares a portfolio; buying more of one held always works.
  function openAdd() {
    if (holdings.length >= MAX_HOLDINGS) {
      toast({
        message: lang === "bn"
          ? `একটি পোর্টফোলিওতে সর্বোচ্চ ${MAX_HOLDINGS}টি শেয়ার রাখা যায়। নতুন যোগ করতে একটি বাদ দিন।`
          : `A portfolio can hold up to ${MAX_HOLDINGS} shares. Remove one to add another.`,
      });
      return;
    }
    setAddOpen(true);
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
          {shares ? (
            <T en="Sign in to see your shares" bn="আপনার শেয়ার দেখতে সাইন ইন করুন" />
          ) : (
            <T en="Sign in to see your portfolio" bn="পোর্টফোলিও দেখতে সাইন ইন করুন" />
          )}
        </h2>
        <p className="pf-empty-text">
          {shares ? (
            <T
              en="Every share you own or watch, in one list, with what's new on each."
              bn="আপনার কেনা আর নজরে রাখা সব শেয়ার, এক তালিকায়, প্রতিটির নতুন খবরসহ।"
            />
          ) : (
            <T
              en="Your shares, your profit or loss and your dividends, all in one place."
              bn="আপনার শেয়ার, মুনাফা বা লোকসান আর ডিভিডেন্ড, সব এক জায়গায়।"
            />
          )}
        </p>
        <div className="pf-empty-actions">
          <Button href={authHref("/login", shares ? "/my" : "/portfolio")} variant="primary">
            <T en="Sign in" bn="সাইন ইন" />
          </Button>
          <Button href={authHref("/register", shares ? "/my" : "/portfolio")} variant="quiet">
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

  const ownedRow = (row: ComputedRow) => {
    const code = row.holding.trading_code;
    const name = row.company_name ?? code;
    const fresh = newOf.get(code.toUpperCase()) ?? 0;
    const ins = insightOf.get(code.toUpperCase());
    const tierOf = ins && ins.tierKey !== "unscored" ? (ins.tierKey as TierKey) : null;
    const st = report.status[code.toUpperCase()] ?? null;
    return (
      <article key={row.holding.id} className="pf-hold">
        <button
          type="button"
          className="pf-hold-row"
          onClick={() => {
            setSheetId(row.holding.id);
            trackEvent("pf_open", { what: "share", key: st?.kind ?? "none" });
          }}
          aria-label={L(`${name}: open`, `${name}: খুলুন`)}
        >
          <span className="pf-hold-who">
            <span className="pf-hold-name">{name}</span>
            <span className={`pf-hold-sub ${bnCls}`}>
              <span className="pf-hold-code">{code}</span>
              {" · "}
              <span className="pv">
                {bn
                  ? `${row.holding.qty.toLocaleString("en-IN")}টি শেয়ার`
                  : `${row.holding.qty.toLocaleString("en-IN")} share${row.holding.qty === 1 ? "" : "s"}`}
              </span>
            </span>
          </span>
          <span className="pf-hold-val">
            <b className="pv">{row.current_value != null ? takaGroup(row.current_value) : "—"}</b>
            {row.pnl != null && (
              <span className={`pv ${row.pnl > 0 ? "pf-up" : row.pnl < 0 ? "pf-down" : "pf-flat"}`}>
                {row.pnl > 0 ? "+" : row.pnl < 0 ? "−" : ""}
                {takaGroup(Math.abs(row.pnl))}
              </span>
            )}
          </span>
          <span className={`pf-hold-st ${bnCls}`}>
            {reportOpen && st ? (
              <span className="pf-st" data-tone={st.tone}>
                <i aria-hidden="true" />
                {bn ? st.word.bn : st.word.en}
              </span>
            ) : tierOf ? (
              <TierPill tier={tierOf} />
            ) : null}
            {fresh > 0 && (
              <span className="pf-hold-new">{bn ? `${fresh}টি নতুন` : `${fresh} new`}</span>
            )}
          </span>
          {/* What the row opens, in words (2026-11-23) */}
          <span className="pf-hold-go" aria-hidden="true">
            {L("Details", "বিস্তারিত")}
            <IconChevronRight size={14} />
          </span>
          {/* A share that needs something shows why, open (2026-11-23) */}
          {reportOpen && st?.why && st.kind !== "ok" && (
            <span className={`pf-hold-why ${bnCls}`}>{bn ? st.why.bn : st.why.en}</span>
          )}
        </button>
      </article>
    );
  };

  const watchedRow = (w: WatchSheetRow) => {
    const fresh = newOf.get(w.code) ?? 0;
    const since =
      w.meta?.price_at_add != null && w.meta.price_at_add > 0 && w.ltp != null
        ? ((w.ltp - w.meta.price_at_add) / w.meta.price_at_add) * 100
        : null;
    return (
      <article key={`w-${w.code}`} className="pf-hold">
        <button
          type="button"
          className="pf-hold-row"
          onClick={() => {
            setWatchSheet(w.code);
            trackEvent("pf_open", { what: "watched", key: "none" });
          }}
          aria-label={L(`${w.name}: open`, `${w.name}: খুলুন`)}
        >
          <span className="pf-hold-who">
            <span className="pf-hold-name">{w.name}</span>
            <span className={`pf-hold-sub ${bnCls}`}>
              <span className="pf-hold-code">{w.code}</span>
              {" · "}
              {since != null
                ? L(`${changePct(since, 1)} since you started watching`, `নজর রাখার পর ${changePct(since, 1)}`)
                : L("You watch it", "নজরে রাখছেন")}
            </span>
          </span>
          <span className="pf-hold-val">
            <b>{money(w.ltp)}</b>
            <span className={changeTone(w.change)}>{changePct(w.change)}</span>
          </span>
          <span className={`pf-hold-st ${bnCls}`}>
            {w.tier && <TierPill tier={w.tier} />}
            {fresh > 0 && <span className="pf-hold-new">{bn ? `${fresh}টি নতুন` : `${fresh} new`}</span>}
          </span>
          <span className="pf-hold-go" aria-hidden="true">
            {L("Details", "বিস্তারিত")}
            <IconChevronRight size={14} />
          </span>
        </button>
      </article>
    );
  };

  const shareSheet = (
    <PfShareSheet
      open={sheetRow != null}
      row={sheetRow}
      status={sheetRow ? report.status[sheetRow.code.toUpperCase()] ?? null : null}
      way={sheetRow ? wayOf.get(sheetRow.code.toUpperCase()) ?? null : null}
      updates={sheetRow ? feedOf.get(sheetRow.code.toUpperCase()) ?? [] : []}
      premium={reportOpen}
      readOnly={readOnly}
      premiumHref={shares ? "/portfolio#pf-premium" : "#pf-premium"}
      onClose={() => setSheetId(null)}
      onBuy={() => sheetFor((r) => openTx("buy", r))}
      onSell={() => sheetFor((r) => openTx("sell", r))}
      onEdit={() => sheetFor((r) => startEdit(r.holding))}
      onRemove={() => sheetFor((r) => handleDelete(r.holding.id))}
    />
  );

  /** My shares (/my): one list of what they own and what they watch. */
  const renderShares = () => {
    const total = holdings.length + watchRows.length;
    const showSearch = total >= FILTER_FROM;
    const sq = showSearch ? query.trim().toLowerCase() : "";
    const match = (code: string, name: string) =>
      !sq || code.toLowerCase().includes(sq) || name.toLowerCase().includes(sq);
    const ownList =
      listView === "watch"
        ? []
        : sortedRows.filter((r) => {
            const code = r.holding.trading_code.toUpperCase();
            if (listView === "own" && showFilters && !matchesFilter(r, activeFilter, newOf.has(code))) return false;
            return match(code, r.company_name ?? "");
          });
    const watchList = listView === "own" ? [] : watchRows.filter((w) => match(w.code, w.name));
    const both = holdings.length > 0 && watchRows.length > 0;
    const owned = heldUpper;
    const watchedSet = new Set(watchCodes.map((c) => c.toUpperCase()));
    const newShared = sharedCodes.filter((c) => !watchedSet.has(c));
    const VIEWS: { key: ListView; en: string; bn: string; n: number }[] = [
      { key: "all", en: "All", bn: "সব", n: total },
      { key: "own", en: "I own", bn: "আমার আছে", n: holdings.length },
      { key: "watch", en: "I watch", bn: "নজরে রাখি", n: watchRows.length },
    ];
    return (
      <PageLockScope anchor="pf-premium">
        {newShared.length > 0 && (
          <div className={`soft-card pf-note mb-4 ${bnCls}`}>
            <p className="pf-note-text">
              {L(
                `Someone shared a list of ${newShared.length} ${newShared.length === 1 ? "share" : "shares"}: ${newShared.slice(0, 5).join(", ")}${newShared.length > 5 ? "…" : ""}. Watch them too?`,
                `কেউ ${newShared.length}টি শেয়ারের একটি তালিকা পাঠিয়েছেন: ${newShared.slice(0, 5).join(", ")}${newShared.length > 5 ? "…" : ""}। এগুলোতেও নজর রাখবেন?`,
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="sm" onClick={importShared}>
                {L("Watch them", "নজর রাখুন")}
              </Button>
              <Button type="button" variant="quiet" size="sm" onClick={dismissShared}>
                {L("No, thanks", "না, ধন্যবাদ")}
              </Button>
            </div>
          </div>
        )}

        {rowError && <p className="form-error mb-3">{rowError}</p>}

        {/* One line on what is here, and the two pages it leads to. */}
        <div className={`ms-top ${bnCls}`} lang={bn ? "bn" : undefined}>
          <p className="ms-line">
            {total === 0
              ? L("Nothing here yet.", "এখানে এখনো কিছু নেই।")
              : L(
                  `You own ${holdings.length} ${holdings.length === 1 ? "share" : "shares"} and watch ${watchRows.length}.`,
                  `আপনার ${holdings.length}টি শেয়ার আছে, আর ${watchRows.length}টিতে নজর রাখছেন।`,
                )}
          </p>
          <div className="ms-links">
            {holdings.length > 0 && (
              <Link href="/portfolio" className="ms-go">
                {L("Your money and your check", "আপনার টাকা আর যাচাই")}
                <IconChevronRight size={14} />
              </Link>
            )}
            <Link href="/notifications" className="ms-go">
              {L("Updates", "আপডেট")}
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>

        <WatchPlanLine />

        {total === 0 ? (
          <section className={`soft-card pf-empty ${bnCls}`} lang={bn ? "bn" : undefined}>
            <h2 className="pf-empty-title">{L("Add the shares you own, or watch a few", "আপনার শেয়ার যোগ করুন, বা কয়েকটিতে নজর রাখুন")}</h2>
            <p className="pf-empty-text">
              {L(
                "We check them after every close and tell you when results, a dividend or a warning comes.",
                "প্রতিদিন বাজার বন্ধের পর আমরা সেগুলো দেখি, আর আর্থিক ফল, ডিভিডেন্ড বা সতর্কতা এলে জানাই।",
              )}
            </p>
            <div className="pf-empty-actions">
              <Button type="button" variant="primary" size="lg" onClick={openAdd}>
                {L("Add a share I own", "আমার একটি শেয়ার যোগ করুন")}
              </Button>
            </div>
            <EmptyStateActions />
          </section>
        ) : (
          <section id="pf-shares" className="pf-block flex flex-col gap-3" aria-labelledby="pf-shares-h">
            <div className="pf-hold-bar">
              <h2 id="pf-shares-h" className={`pfh-title ${bnCls}`} lang={bn ? "bn" : undefined}>
                {L("Your shares", "আপনার শেয়ারগুলো")} <span className="pf-num font-semibold">{total}</span>
              </h2>
              <div className="pf-hold-tools">
                {holdings.length > 1 && listView !== "watch" && (
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
                <Button type="button" onClick={openAdd} variant="quiet" size="md" className="pf-add">
                  <span className="pf-add-dot"><IconPlus size={14} /></span>
                  <span className={bnCls}>{L("I own a share", "আমার শেয়ার")}</span>
                </Button>
              </div>
            </div>

            {both && (
              <div className="ms-views" role="group" aria-label={L("Show", "দেখান")}>
                {VIEWS.map((v) => (
                  <Chip key={v.key} active={listView === v.key} onClick={() => setListView(v.key)}>
                    <span className={bnCls}>{bn ? v.bn : v.en}</span>
                    <span className="pf-num">{v.n}</span>
                  </Chip>
                ))}
              </div>
            )}

            {showSearch && (
              <div className="pf-find">
                <div className="pf-search">
                  <label htmlFor="pf-search" className="sr-only">{L("Find a share", "শেয়ার খুঁজুন")}</label>
                  <span className="pf-search-icon"><IconSearch size={16} /></span>
                  <input
                    id="pf-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={L("Find by name or code", "নাম বা কোড দিয়ে খুঁজুন")}
                    autoComplete="off"
                    enterKeyHint="search"
                    className={`input-field ${bnCls}`}
                  />
                  {query && (
                    <button type="button" className="pf-search-clear" onClick={() => setQuery("")} aria-label={L("Clear search", "খোঁজা মুছুন")}>
                      <IconClose size={16} />
                    </button>
                  )}
                </div>
                {listView === "own" && showFilters && (
                  <div className="pf-filters" role="group" aria-label={L("Show", "দেখান")}>
                    {FILTERS.filter((f) => f.key === "all" || filterCounts[f.key] > 0).map((f) => (
                      <Chip key={f.key} active={activeFilter === f.key} onClick={() => setFilter(f.key)}>
                        <span className={bnCls}>{bn ? f.bn : f.en}</span>
                        <span className="pf-num">{filterCounts[f.key]}</span>
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div id="pf-holds" className="soft-card pf-holds pf-rise">
              {ownList.length + watchList.length === 0 && (
                <div className={`pf-holds-none ${bnCls}`}>
                  <p>{L("No shares match.", "কোনো শেয়ার মেলেনি।")}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                      setListView("all");
                    }}
                  >
                    {L("Show all", "সব দেখুন")}
                  </Button>
                </div>
              )}
              {ownList.map(ownedRow)}
              {ownList.length > 0 && watchList.length > 0 && (
                <p className={`ms-sep ${bnCls}`}>{L("Shares you watch", "যেগুলোতে নজর রাখছেন")}</p>
              )}
              {watchList.map(watchedRow)}
            </div>
            {holdings.length > 1 && listView !== "watch" && (
              <div className="pf-hold-foot">
                <Button type="button" onClick={openEditPicker} variant="link" size="sm">
                  {L("Fix a mistake in your shares", "শেয়ারের ভুল ঠিক করুন")}
                </Button>
              </div>
            )}
          </section>
        )}

        <WatchSearch priceMap={priceMap} watched={watchedSet} owned={owned} />

        {watchRows.length > 0 && (
          <div className="ms-share">
            <ShareWatchlistButton codes={watchRows.map((w) => w.code)} />
          </div>
        )}

        {/* Price alerts (2026-11-25: moved here with the watchlist; /alerts
            301s to #alerts). Set in each share's Watch sheet. */}
        {alertCount > 0 && (
          <section id="alerts" className="pf-block stock-anchor" aria-labelledby="ms-alerts">
            <SectionHeader
              id="ms-alerts"
              title={<T en="Your price alerts" bn="আপনার প্রাইস অ্যালার্ট" />}
              lead={
                <T
                  en="We tell you on the day a share reaches your price. Each armed alert counts as a rule."
                  bn="শেয়ারের দাম আপনার ঠিক করা দামে পৌঁছালে সেদিনই জানাই। চালু প্রতিটি অ্যালার্ট একটি নিয়ম হিসেবে গোনা হয়।"
                />
              }
            />
            <AlertsClient shared />
          </section>
        )}

        {suggestions.length > 0 && (
          <p className={`pf-pending ${bnCls}`}>
            <Link href="/portfolio#pf-corrections">
              {L(
                `${suggestions.length} bonus or dividend ${suggestions.length === 1 ? "entry is" : "entries are"} waiting for you to confirm, on your portfolio.`,
                `${suggestions.length}টি বোনাস বা ডিভিডেন্ড আপনার নিশ্চিত করার অপেক্ষায়, আপনার পোর্টফোলিওতে।`,
              )}
            </Link>
          </p>
        )}

        {shareSheet}
        <WatchShareSheet
          open={watchSheetRow != null}
          row={watchSheetRow}
          updates={watchSheetRow ? feedOf.get(watchSheetRow.code) ?? [] : []}
          onClose={() => setWatchSheet(null)}
          onOwn={() => {
            const c = watchSheetRow?.code;
            setWatchSheet(null);
            if (c) {
              setAddInitial(c);
              openAdd();
            }
          }}
          onStop={() => watchSheetRow && stopWatchingShare(watchSheetRow.code)}
        />
      </PageLockScope>
    );
  };

  return (
    <div className="flex flex-col" data-privacy={privacy ? "on" : "off"}>
      {shares ? renderShares() : (<>
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
                [L("See your grade and what to do", "আপনার গ্রেড আর কী করবেন, দেখুন"), L("Your profit, a grade for your portfolio and the next step, after every close.", "আপনার লাভ, পোর্টফোলিওর গ্রেড আর পরের পদক্ষেপ, প্রতিদিন বাজার বন্ধের পর।")],
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
              <Button type="button" variant="primary" size="lg" onClick={openAdd}>
                {L("Add your first share", "প্রথম শেয়ার যোগ করুন")}
              </Button>
              <Button href="/sample-portfolio/diversified" variant="quiet" size="lg">
                {L("See a sample portfolio", "নমুনা পোর্টফোলিও দেখুন")}
              </Button>
            </div>
            {/* 2026-11-23: the biggest moment for the portfolio builder. */}
            <p className="pf-empty-text">
              {L("No shares yet? ", "এখনো কোনো শেয়ার নেই? ")}
              <Link href="/portfolio-builder" className="font-semibold text-primary">
                {L(
                  "Tell us how much you want to invest, and we'll build a portfolio.",
                  "কত টাকা বিনিয়োগ করতে চান বলুন, আমরা পোর্টফোলিও বানিয়ে দেব।",
                )}
              </Link>
            </p>
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
        // The simple portfolio page (2026-11-23, plan
        // https://claude.ai/artifact/Gmoy9sYiEcvK4wZL5eqTXN — user: the page
        // "feels little disorganized, complex presentation and hard to
        // grasp"). Three answers on top, in the order a reader asks them —
        // what is it worth, is everything okay, what to do — then each share
        // once with one status (a tap opens its whole story in a sheet), then
        // "More details" folded. The check stays Premium (everything we say,
        // since 2026-11-02): a free reader sees the grade and counts, and the
        // one Premium card sits where "What to do" would be. The Premium
        // parts stay in the HTML, open, under `Locked`.
        <PageLockScope anchor="pf-premium">
          {/* ── 1 · How much is my money worth? ── */}
          <section id="pf-money" className="dash-section pf-chapter pf-chapter--first" aria-label={L("Your money", "আপনার টাকা")}>
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
            />
          </section>

          <PfFirstNote uid={userId} />

          {/* ── 2 · Is everything okay? ── 3 · What to do ──
              A free reader: the grade and counts, and the one Premium card
              where "What to do" would be. A Premium reader keeps the
              #pf-premium anchor (the watcher's teaser push lands there). */}
          {reportOpen ? (
            <span id="pf-premium" className="dash-section block" aria-hidden="true" />
          ) : (
            <div className="pl-free pf-block pf-top2">
              <PfHealthLocked grade={analysis.grade} toLook={report.health.toLook} />
              <PortfolioPromo
                findings={report.findings}
                promo={report.promo}
                outline={report.outline}
                things={report.todo.total}
                sampleHref={`/sample-portfolio/${SAMPLE_PORTFOLIOS.diversified.slug}`}
              />
            </div>
          )}
          <Locked>
            <OpenScope>
              <div className="pf-block pf-top2">
                <PfHealth health={report.health} areas={report.areas} />
                <PfTodo todo={report.todo} onOpenShare={openShareByCode}>
                  <WhatIfCard rows={rows} priceMap={priceMap} allCodes={allCodes} lang={lang} />
                </PfTodo>
              </div>
            </OpenScope>
          </Locked>

          {/* ── Your shares: on My shares since 2026-11-25 (one list with the
              shares they watch); an extra portfolio keeps its own list here ── */}
          {isMain ? (
            <section id="pf-shares" className="dash-section pf-block" aria-labelledby="pf-shares-h">
              <div className="soft-card ms-link">
                <div className="min-w-0">
                  <h2 id="pf-shares-h" className={`pfh-title ${bnCls}`} lang={bn ? "bn" : undefined}>
                    {L("Your shares", "আপনার শেয়ারগুলো")}{" "}
                    <span className="pf-num font-semibold">{holdings.length}</span>
                  </h2>
                  <p className={`ms-link-p ${bnCls}`}>
                    {watchRows.length > 0
                      ? L(
                          `Each of your ${holdings.length} shares, and the ${watchRows.length} you watch, is on My shares, with its status and everything you can do with it.`,
                          `আপনার ${holdings.length}টি শেয়ার আর নজরে রাখা ${watchRows.length}টি, প্রতিটির অবস্থা আর যা যা করতে পারেন, সব আমার শেয়ার পেজে।`,
                        )
                      : L(
                          `Each of your ${holdings.length} shares is on My shares, with its status and everything you can do with it.`,
                          `আপনার ${holdings.length}টি শেয়ারের প্রতিটি, অবস্থা আর যা যা করতে পারেন, সব আমার শেয়ার পেজে।`,
                        )}
                  </p>
                </div>
                <div className="ms-link-acts">
                  <Button href="/my" variant="primary" size="md">
                    {L("See my shares", "আমার শেয়ার দেখুন")}
                    <IconChevronRight size={14} />
                  </Button>
                  {!readOnly && (
                    <Button type="button" onClick={openAdd} variant="quiet" size="md">
                      <IconPlus size={14} />
                      {L("Add a share", "শেয়ার যোগ করুন")}
                    </Button>
                  )}
                </div>
              </div>
              {!readOnly && (
                <p className="pf-empty-text mt-3">
                  {L("Have new money to add? ", "নতুন টাকা যোগ করবেন? ")}
                  <Link href="/portfolio-builder?start=mine&src=portfolio" className="font-semibold text-primary">
                    {L(
                      "We'll split it across strong companies without making any share or business too big.",
                      "কোনো শেয়ার বা ব্যবসা বেশি বড় না করে আমরা তা শক্তিশালী কোম্পানিতে ভাগ করে দেব।",
                    )}
                  </Link>
                </p>
              )}
            </section>
          ) : (
          <section id="pf-shares" className="dash-section pf-block flex flex-col gap-3" aria-labelledby="pf-shares-h">
            <div className="pf-hold-bar">
              <h2 id="pf-shares-h" className={`pfh-title ${bnCls}`} lang={bn ? "bn" : undefined}>
                {L("Your shares", "আপনার শেয়ারগুলো")}{" "}
                <span className="pf-num font-semibold">{holdings.length}</span>
              </h2>
              <div className="pf-hold-tools">
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
                  <Button type="button" onClick={openAdd} variant="quiet" size="md" className="pf-add">
                    <span className="pf-add-dot"><IconPlus size={14} /></span>
                    <span className={bnCls}>{L("Add", "যোগ")}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Search + filter chips once the list is long (FILTER_FROM stocks) */}
            {showFilters && (
              <div className="pf-find">
                <div className="pf-search">
                  <label htmlFor="pf-search" className="sr-only">{L("Find a share", "শেয়ার খুঁজুন")}</label>
                  <span className="pf-search-icon"><IconSearch size={16} /></span>
                  <input
                    id="pf-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={L("Find by name or code", "নাম বা কোড দিয়ে খুঁজুন")}
                    autoComplete="off"
                    enterKeyHint="search"
                    className={`input-field ${bnCls}`}
                  />
                  {query && (
                    <button type="button" className="pf-search-clear" onClick={() => setQuery("")} aria-label={L("Clear search", "খোঁজা মুছুন")}>
                      <IconClose size={16} />
                    </button>
                  )}
                </div>
                <div className="pf-filters" role="group" aria-label={L("Show", "দেখান")}>
                  {FILTERS.filter((f) => f.key === "all" || filterCounts[f.key] > 0).map((f) => (
                    <Chip key={f.key} active={activeFilter === f.key} onClick={() => setFilter(f.key)}>
                      <span className={bnCls}>{bn ? f.bn : f.en}</span>
                      <span className="pf-num">{filterCounts[f.key]}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div id="pf-holds" className="dash-section soft-card pf-holds pf-rise">
              {visibleRows.length === 0 && (
                <div className={`pf-holds-none ${bnCls}`}>
                  <p>{L("No shares match.", "কোনো শেয়ার মেলেনি।")}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    {L("Show all", "সব দেখুন")}
                  </Button>
                </div>
              )}
              {visibleRows.map(ownedRow)}
            </div>
            {!readOnly && holdings.length > 1 && (
              <div className="pf-hold-foot">
                <Button type="button" onClick={openEditPicker} variant="link" size="sm">
                  {L("Fix a mistake in your shares", "শেয়ারের ভুল ঠিক করুন")}
                </Button>
              </div>
            )}
            {/* 2026-11-23, the portfolio builder phase 2: new money added to these shares. */}
            {isMain && !readOnly && (
              <p className="pf-empty-text">
                {L("Have new money to add? ", "নতুন টাকা যোগ করবেন? ")}
                <Link href="/portfolio-builder?start=mine&src=portfolio" className="font-semibold text-primary">
                  {L(
                    "We'll split it across strong companies without making any share or business too big.",
                    "কোনো শেয়ার বা ব্যবসা বেশি বড় না করে আমরা তা শক্তিশালী কোম্পানিতে ভাগ করে দেব।",
                  )}
                </Link>
              </p>
            )}
          </section>
          )}

          {/* ── More details: four tabs, folded, all free ── */}
          <div className="pf-block">
            <PfMoneyRoom
              panels={[
                {
                  key: "growth",
                  label: { en: "Growth", bn: "বৃদ্ধি" },
                  anchors: ["value"],
                  body: (
                    <>
                      <ValueHistoryCard history={history} lang={lang} />
                      <ContributionStrip rows={rows} lang={lang} />
                    </>
                  ),
                },
                {
                  key: "where",
                  label: { en: "Where it sits", bn: "কোথায় আছে" },
                  body: (
                    <>
                      <AllocationChart analysis={analysis} lang={lang} />
                      <SectorBreakdownChart analysis={analysis} lang={lang} />
                    </>
                  ),
                },
                {
                  key: "income",
                  label: { en: "Income", bn: "আয়" },
                  anchors: ["dividends", "made"],
                  body: (
                    <>
                      <MoneyMadeCard made={made} settings={settings} lang={lang} onEditSettings={() => setSettingsOpen(true)} />
                      <DividendIncomeCard rows={rows} priceMap={priceMap} dividends={dividends} calendar={calendar} lang={lang} />
                    </>
                  ),
                },
                {
                  key: "activity",
                  label: { en: "Activity", bn: "কার্যক্রম" },
                  anchors: ["pf-news", "pf-corrections", "news"],
                  body: (
                    <>
                      <span id="pf-corrections" />
                      <CorrectionsCard
                        log={log}
                        suggestions={suggestions}
                        holdings={holdings}
                        lang={lang}
                        readOnly={readOnly}
                        onAction={runAction}
                      />
                      <HistoryCard
                        log={log}
                        lang={lang}
                        readOnly={readOnly}
                        statementHref={statementHref}
                        onRemove={removeLogEntry}
                      />
                      <PfCard
                        title={L("News on your shares", "আপনার শেয়ারের খবর")}
                        note={L("Announcements from the companies you own.", "আপনার কোম্পানিগুলোর ঘোষণা।")}
                        lang={lang}
                        dataCard="news"
                      >
                        <span id="pf-news" />
                        <PortfolioNews
                          news={news}
                          loading={newsLoading}
                          names={new Map(rows.map((r) => [r.holding.trading_code.toUpperCase(), r.company_name]))}
                          lang={lang}
                        />
                      </PfCard>
                    </>
                  ),
                },
              ]}
            />
          </div>

          {/* Bonus shares / dividends waiting to be confirmed stay in sight */}
          {suggestions.length > 0 && (
            <p className={`pf-pending ${bnCls}`}>
              <a href="#pf-corrections">
                {L(
                  `${suggestions.length} bonus or dividend ${suggestions.length === 1 ? "entry is" : "entries are"} waiting for you to confirm. See Activity.`,
                  `${suggestions.length}টি বোনাস বা ডিভিডেন্ড আপনার নিশ্চিত করার অপেক্ষায়। কার্যক্রম দেখুন।`,
                )}
              </a>
            </p>
          )}

          {shareSheet}
        </PageLockScope>
      )}
      </>)}

      {/* Add stock — bottom-sheet on mobile, centered modal on desktop */}
      {addOpen && (
        <AddHoldingModal
          allCodes={allCodes}
          priceMap={priceMap}
          existingCodes={existingCodes}
          holdings={holdings}
          initialCode={addInitial}
          onClose={() => {
            setAddOpen(false);
            setAddInitial(undefined);
          }}
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
          holdings={holdings}
          priceMap={priceMap}
          plan={reportOpen ? actionOf.get(tx.holding.trading_code.toUpperCase()) ?? null : null}
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
