"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getScores,
  getNearExtremes,
  getDividendsUpcoming,
  getWatchlistNews,
  type ScoreItem,
  type ScoresResponse,
  type NearExtremeItem,
  type DividendsUpcoming,
  type NearExtremesData,
  type WatchlistNewsItem,
  type StockSignalInfo,
  type WatchlistMeta,
  type WatchlistMetaEntry,
} from "@/lib/api";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { changePct, changeTone, money, taka } from "@/lib/formatters";
import {
  getCachedWatchlist,
  getCachedWatchlistMeta,
  subscribeWatchlist,
  loadWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  setWatchlist,
} from "@/lib/watchlist";
import { useAuth } from "@/context/AuthContext";
import { getTier } from "@/lib/constants";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Bn from "@/components/i18n/Bn";
import WatchlistNews from "./WatchlistNews";
import WatchlistAnalysis from "./WatchlistAnalysis";
import WatchlistAlertCell from "./WatchlistAlertCell";
import PriceAlertTip from "./PriceAlertTip";
import EmptyStateActions from "./EmptyStateActions";
import ShareWatchlistButton from "./ShareWatchlistButton";
import SinceLastVisit from "./SinceLastVisit";
import GlanceBoard from "./GlanceBoard";
import { toast } from "@/lib/toast";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";

/*
 * /watchlist, redesigned clean 2026-10-25 (styles: app/styles/watchlist.css,
 * `wl-*`). Order: count + share → hero (mood, one sentence, four answers) →
 * since-last-visit note → "Your stocks" (search, sort chips, the list) →
 * glance board → "What stands out" folds → news. Company name leads every
 * row (its Buy / near-high / dividend tags sit under it), numbers are plain (no tinted pills), colour only for up / down,
 * grade and Buy.
 */

function flatten(scores: ScoresResponse | null): ScoreItem[] {
  if (!scores) return [];
  return Object.values(scores.tiers).flat();
}

function parseCodesParam(raw: string | null): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((c) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean),
    ),
  );
}

/** Near-extreme record tagged with which list it came from. */
interface ExtremeInfo {
  item: NearExtremeItem;
  side: "high" | "low";
}

type SortKey = "az" | "recent" | "move" | "score" | "yield" | "since";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "az", label: "A–Z" },
  { key: "recent", label: "Recently added" },
  { key: "move", label: "Biggest move today" },
  { key: "since", label: "Since added" },
  { key: "score", label: "Best score" },
  { key: "yield", label: "Dividend yield" },
];

/** % move from the close on the day the stock was followed to today. */
function sinceAddedPct(item: ScoreItem, m: WatchlistMetaEntry | null | undefined): number | null {
  if (!m || m.price_at_add == null || m.price_at_add <= 0 || item.ltp == null) return null;
  return ((item.ltp - m.price_at_add) / m.price_at_add) * 100;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-GB", sameYear ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" });
}

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Loading — the ONE placeholder for this page (auth check, Suspense, data)
// ---------------------------------------------------------------------------

function WatchlistSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card padding="md" aria-busy="true" aria-label="Loading watchlist">
      <div className="skeleton-rows" role="status">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="skeleton-row">
            <Skeleton width={i % 2 === 0 ? "34%" : "26%"} height={14} />
            <Skeleton width={56} height={14} className="ml-auto" />
            <Skeleton width={44} height={14} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Logged-out CTA
// ---------------------------------------------------------------------------

function SignInCTA({ pendingCodes }: { pendingCodes: string[] }) {
  const nextHref = pendingCodes.length
    ? `/watchlist?codes=${pendingCodes.join(",")}`
    : "/watchlist";
  const encNext = encodeURIComponent(nextHref);
  return (
    <EmptyState
      title="Sign in to use your watchlist"
      message="Follow stocks on every device. We'll show their price moves, news and dividend dates in one place."
      bn="আপনার পছন্দের শেয়ারগুলো অনুসরণ করতে সাইন ইন করুন।"
      actions={[
        { href: `/login?next=${encNext}`, label: "Sign in" },
        { href: `/register?next=${encNext}`, label: "Create account" },
      ]}
    >
      {pendingCodes.length > 0 && (
        <p className="mt-4 text-xs text-text-muted">
          We&apos;ll add {pendingCodes.length} shared{" "}
          {pendingCodes.length === 1 ? "stock" : "stocks"} to your list after sign-in.
        </p>
      )}
    </EmptyState>
  );
}

// ---------------------------------------------------------------------------
// Add search
// ---------------------------------------------------------------------------

function AddBar({ scores }: { scores: ScoresResponse | null }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [watchedCodes, setWatchedCodes] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWatchedCodes(getCachedWatchlist());
    return subscribeWatchlist(() => setWatchedCodes(getCachedWatchlist()));
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const all = flatten(scores);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return all
      .filter(
        (it) =>
          it.trading_code.toUpperCase().includes(q) ||
          (it.company_name ?? "").toUpperCase().includes(q),
      )
      .slice(0, 8);
  }, [query, all]);

  function handleSelect(code: string) {
    addToWatchlist(code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="wl-add" ref={wrapRef}>
      <div className="wl-add-field">
        <svg className="wl-add-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M14 14l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <label htmlFor="wl-add-input" className="sr-only">
          Add a company to your watchlist
        </label>
        <input
          id="wl-add-input"
          className="wl-add-input"
          placeholder="Add a company — name or code"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            type="button"
            className="wl-add-clear"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="wl-add-list">
          {filtered.map((it) => {
            const watched = watchedCodes.includes(it.trading_code.toUpperCase());
            return (
              <li
                key={it.trading_code}
                className={`wl-add-item${watched ? " is-watched" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(it.trading_code)}
              >
                <span className="wl-add-who">
                  <span className="wl-add-name">{it.company_name ?? it.trading_code}</span>
                  <span className="wl-add-code">{it.trading_code}</span>
                </span>
                <span className="wl-add-state">{watched ? "Following" : "+ Follow"}</span>
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && scores && (
        <div className="wl-add-empty">No company matches &quot;{query}&quot;</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One row of the list (a table row on desktop, a block in the card on phones)
// ---------------------------------------------------------------------------

interface RowProps {
  item: ScoreItem;
  extreme: ExtremeInfo | null;
  hasDividendSoon: boolean;
  meta: WatchlistMetaEntry | null;
  onRemove: (code: string) => void;
}

function RangeBar({ ltp, high, low }: { ltp: number | null; high: number | null; low: number | null }) {
  if (ltp == null || high == null || low == null || high <= low) {
    return <span className="wl-dash">—</span>;
  }
  const pos = Math.max(0, Math.min(1, (ltp - low) / (high - low)));
  return (
    <div className="wl-range" title={`52-week range: ${money(low)} – ${money(high)}`}>
      <div className="wl-range-track">
        <span className="wl-range-dot" style={{ left: `${pos * 100}%` }} />
      </div>
      <div className="wl-range-ends">
        <span>{money(low)}</span>
        <span>{money(high)}</span>
      </div>
    </div>
  );
}

function Notes({
  signal,
  extreme,
  hasDividendSoon,
}: {
  signal: StockSignalInfo | null | undefined;
  extreme: ExtremeInfo | null;
  hasDividendSoon: boolean;
}) {
  // Only Buy is shown on the watchlist; Sell lives on the stock page.
  const buy = signal != null && signal.signal === "buy";
  if (!buy && !extreme && !hasDividendSoon) return null;
  return (
    <div className="wl-notes">
      {buy && <SignalChip signal={signal.signal} strength={signal.strength} reason={signal.reason_en} />}
      {extreme && (
        <Chip tone={extreme.side === "high" ? "positive" : "negative"}>
          {extreme.side === "high" ? "Near yearly high" : "Near yearly low"}
        </Chip>
      )}
      {hasDividendSoon && <Chip tone="info">Dividend soon</Chip>}
    </div>
  );
}

function EnrichedRow({ item, extreme, hasDividendSoon, meta, onRemove }: RowProps) {
  const chg = item.change_pct;
  const ex = extreme?.item ?? null;
  // wl-empty cells collapse on the phone layout instead of showing "—"
  const hasRange = ex?.w52_high != null && ex?.w52_low != null;
  const hasNotes =
    extreme != null || hasDividendSoon || (item.signal != null && item.signal.signal === "buy");
  const since = sinceAddedPct(item, meta);
  const eps = item.eps_yoy_pct;
  const yld = item.div_yield_pct;
  return (
    <tr>
      <td data-cell="who">
        <Link prefetch={false} href={`/stock/${item.trading_code}`} className="wl-who">
          <span className="wl-name" title={item.company_name ?? undefined}>
            {item.company_name ?? item.trading_code}
          </span>
        </Link>
        <span className="wl-meta">
          <span className="wl-code">{item.trading_code}</span>
          <TierPill tier={getTier(item.score)} />
        </span>
        {hasNotes && <Notes signal={item.signal} extreme={extreme} hasDividendSoon={hasDividendSoon} />}
      </td>
      <td data-cell="price" className="wl-num">
        <span className="wl-price nums">{item.ltp != null ? money(item.ltp) : "—"}</span>
      </td>
      <td data-cell="chg" className="wl-num">
        <span className={`wl-chg nums ${changeTone(chg)}`}>{chg != null ? changePct(chg) : "—"}</span>
      </td>
      <td data-cell="since" data-label="Since added" className="wl-num">
        {since != null && meta ? (
          <span title={`Added ${formatDateLong(meta.added_at)} at ${taka(meta.price_at_add, 1)}`}>
            <span className={`font-semibold nums ${changeTone(since)}`}>{changePct(since, 1)}</span>
            <span className="wl-sub">since {shortDate(meta.added_at)}</span>
          </span>
        ) : (
          <span className="wl-dash">—</span>
        )}
      </td>
      <td data-cell="eps" data-label="Profit growth" className="wl-num">
        {eps != null && !Number.isNaN(eps) ? (
          <span
            className={`font-semibold nums ${changeTone(eps)}`}
            title={`Earnings per share, change on last year: ${changePct(eps, 1)}`}
          >
            {changePct(eps, 0)}
          </span>
        ) : (
          <span className="wl-dash">—</span>
        )}
      </td>
      <td data-cell="yld" data-label="Yield" className="wl-num">
        {yld != null && !Number.isNaN(yld) ? (
          <span className="font-semibold nums" title={`Dividend yield: ${yld.toFixed(2)}%`}>
            {yld.toFixed(1)}%
          </span>
        ) : (
          <span className="wl-dash">—</span>
        )}
      </td>
      <td data-cell="range" className={hasRange ? undefined : "wl-empty"}>
        <RangeBar ltp={ex?.ltp ?? item.ltp} high={ex?.w52_high ?? null} low={ex?.w52_low ?? null} />
      </td>
      <td data-cell="act">
        <div className="wl-actions">
          <WatchlistAlertCell
            code={item.trading_code}
            ltp={ex?.ltp ?? item.ltp}
            w52High={ex?.w52_high ?? null}
            w52Low={ex?.w52_low ?? null}
          />
          <button
            type="button"
            onClick={() => onRemove(item.trading_code)}
            aria-label={`Stop following ${item.trading_code}`}
            title="Stop following"
            className="star-btn star-btn--on"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

function extremesToMap(data: NearExtremesData): Map<string, ExtremeInfo> {
  const map = new Map<string, ExtremeInfo>();
  for (const it of data.near_high)
    map.set(it.trading_code.toUpperCase(), { item: it, side: "high" });
  for (const it of data.near_low)
    map.set(it.trading_code.toUpperCase(), { item: it, side: "low" });
  return map;
}

function dividendsToSet(data: DividendsUpcoming): Set<string> {
  const set = new Set<string>();
  const horizon = Date.now() + 14 * 24 * 3600 * 1000;
  const soon = (date: string | null) => {
    if (!date) return false;
    const t = Date.parse(date);
    return t >= Date.now() && t <= horizon;
  };
  for (const item of data.upcoming_declarations) {
    if (soon(item.projected_date)) set.add(item.trading_code.toUpperCase());
  }
  for (const item of data.upcoming_record_dates) {
    if (soon(item.record_date)) set.add(item.trading_code.toUpperCase());
  }
  return set;
}

function WatchlistTableInner() {
  const { isLoggedIn, isLoading } = useAuth();
  const { limits, isPremium } = usePremium();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sharedCodes = useMemo(() => parseCodesParam(searchParams.get("codes")), [searchParams]);

  // Hydrate from localStorage SWR cache on mount for an instant first paint.
  const [scores, setScores] = useState<ScoresResponse | null>(
    () => readCache<ScoresResponse>(cacheKeys.scores),
  );
  const [extremesData, setExtremesData] = useState<NearExtremesData | null>(
    () => readCache<NearExtremesData>(cacheKeys.extremes),
  );
  const [dividendsData, setDividendsData] = useState<DividendsUpcoming | null>(
    () => readCache<DividendsUpcoming>(cacheKeys.dividends),
  );
  const extremes = useMemo(
    () => (extremesData ? extremesToMap(extremesData) : new Map<string, ExtremeInfo>()),
    [extremesData],
  );
  const dividends = useMemo(
    () => (dividendsData ? dividendsToSet(dividendsData) : new Set<string>()),
    [dividendsData],
  );
  const [codes, setCodes] = useState<string[]>([]);
  const [meta, setMeta] = useState<WatchlistMeta>({});
  const [loading, setLoading] = useState(
    () => readCache<ScoresResponse>(cacheKeys.scores) === null,
  );
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [importPrompt, setImportPrompt] = useState(false);
  const [sort, setSort] = useState<SortKey>("az");

  // News fetched in parallel with public data — keyed on the sorted code list.
  const [news, setNews] = useState<WatchlistNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Load watchlist when logged in.
  // loadWatchlist synchronously hydrates its module-level cache from
  // localStorage if available, so the snapshot right after the call gives us
  // instant codes even before the network round-trip resolves.
  useEffect(() => {
    if (!isLoggedIn) return;
    const sync = () => {
      setCodes(getCachedWatchlist());
      setMeta(getCachedWatchlistMeta());
    };
    const wPromise = loadWatchlist();
    sync();
    wPromise.then(sync);
    const offW = subscribeWatchlist(sync);
    return () => {
      offW();
    };
  }, [isLoggedIn]);

  // Public data — SWR refresh in background. State already hydrated from cache.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (retryKey > 0) setLoading(true);
    Promise.allSettled([getScores(), getNearExtremes(), getDividendsUpcoming()])
      .then(([s, e, d]) => {
        if (cancelled) return;
        if (s.status === "fulfilled") {
          setScores(s.value);
          writeCache(cacheKeys.scores, s.value);
        }
        if (e.status === "fulfilled") {
          setExtremesData(e.value);
          writeCache(cacheKeys.extremes, e.value);
        }
        if (d.status === "fulfilled") {
          setDividendsData(d.value);
          writeCache(cacheKeys.dividends, d.value);
        }
        // Only surface an error when no cache served the first paint.
        if (
          s.status === "rejected" &&
          e.status === "rejected" &&
          d.status === "rejected"
        ) {
          // Logged to the console; the user sees ErrorState, never the raw message.
          console.error("Watchlist data failed to load:", s.reason);
          setError("failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  // News — fires as soon as codes are known, parallel to scores/extremes/dividends.
  useEffect(() => {
    if (!codes.length) {
      setNews([]);
      setNewsLoading(false);
      return;
    }
    const key = cacheKeys.watchlistNews(codes);
    const cached = readCache<WatchlistNewsItem[]>(key);
    if (cached) setNews(cached);
    setNewsLoading(!cached);
    let cancelled = false;
    getWatchlistNews(codes)
      .then((fresh) => {
        if (cancelled) return;
        setNews(fresh);
        writeCache(key, fresh);
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codes.join(",")]);

  // Shared-link import prompt
  useEffect(() => {
    if (isLoggedIn && sharedCodes.length > 0) {
      setImportPrompt(true);
    }
  }, [isLoggedIn, sharedCodes]);

  const rows = useMemo(() => {
    const all = flatten(scores);
    const map = new Map(all.map((it) => [it.trading_code.toUpperCase(), it]));
    const resolved = codes
      .map((c) => map.get(c.toUpperCase()))
      .filter((it): it is ScoreItem => Boolean(it));
    // Nulls sort last; ties fall back to A–Z so order is stable.
    const desc = (a: number | null | undefined, b: number | null | undefined) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return b - a;
    };
    const addedMs = (it: ScoreItem) => {
      const m = meta[it.trading_code.toUpperCase()];
      const t = m ? Date.parse(m.added_at) : NaN;
      return Number.isFinite(t) ? t : null;
    };
    return resolved.sort((a, b) => {
      let d = 0;
      if (sort === "recent") {
        d = desc(addedMs(a), addedMs(b));
      } else if (sort === "since") {
        d = desc(
          sinceAddedPct(a, meta[a.trading_code.toUpperCase()]),
          sinceAddedPct(b, meta[b.trading_code.toUpperCase()]),
        );
      } else if (sort === "move") {
        d = desc(
          a.change_pct == null ? null : Math.abs(a.change_pct),
          b.change_pct == null ? null : Math.abs(b.change_pct),
        );
      } else if (sort === "score") {
        d = desc(a.score, b.score);
      } else if (sort === "yield") {
        d = desc(a.div_yield_pct, b.div_yield_pct);
      }
      return d !== 0 ? d : a.trading_code.localeCompare(b.trading_code);
    });
  }, [scores, codes, sort, meta]);

  // Remove with a short undo window (shared toast) instead of an instant, silent
  // delete. The undo restores the original added-on date + price meta instead
  // of re-stamping today.
  function handleRemove(code: string) {
    const upper = code.toUpperCase();
    const m = getCachedWatchlistMeta()[upper];
    const restore: WatchlistMeta | undefined = m ? { [upper]: m } : undefined;
    removeFromWatchlist(upper);
    toast({
      message: `Removed ${upper} from your watchlist`,
      action: { label: "Undo", onClick: () => addToWatchlist(upper, restore) },
    });
  }

  async function handleImportShared() {
    const merged = Array.from(new Set([...codes, ...sharedCodes]));
    await setWatchlist(merged);
    setImportPrompt(false);
    // Clean the URL so we don't re-prompt on reload
    router.replace("/watchlist");
  }

  function handleDismissImport() {
    setImportPrompt(false);
    router.replace("/watchlist");
  }

  if (isLoading) {
    return <WatchlistSkeleton />;
  }

  if (!isLoggedIn) {
    return <SignInCTA pendingCodes={sharedCodes} />;
  }

  const ready = codes.length > 0 && !loading && !error;
  const missing = codes.length - rows.length;

  return (
    <>
      {importPrompt && sharedCodes.length > 0 && (
        <Card padding="none" className="wl-note mb-6">
          <div className="wl-note-body">
            <p className="wl-note-title">
              Someone shared a watchlist with you. Follow {sharedCodes.length}{" "}
              {sharedCodes.length === 1 ? "stock" : "stocks"}?
            </p>
            <p className="wl-note-text text-text-muted">{sharedCodes.join(" · ")}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={handleImportShared} variant="primary" size="sm">
                Follow them
              </Button>
              <Button type="button" onClick={handleDismissImport} variant="quiet" size="sm">
                Not now
              </Button>
            </div>
          </div>
        </Card>
      )}

      {codes.length > 0 && (
        <div className="wl-bar">
          <p className="wl-count">
            <strong>{codes.length}</strong>
            {limits.watchlist !== null && <span className="nums"> of {limits.watchlist}</span>}{" "}
            {codes.length === 1 && limits.watchlist === null ? "stock" : "stocks"} followed
            {limits.watchlist !== null && codes.length >= limits.watchlist && (
              <>
                {" · "}
                <Link href={PREMIUM_PATH} className="font-semibold text-primary-ink hover:underline">
                  Follow more with Premium
                </Link>
              </>
            )}
          </p>
          <ShareWatchlistButton codes={codes} />
        </div>
      )}

      {ready && (
        <WatchlistAnalysis
          mode="snapshot"
          codes={codes}
          scores={scores}
          extremes={extremesData}
          dividends={dividendsData}
          meta={meta}
        />
      )}

      {ready && (
        <div className="wl-stack mt-6 empty:hidden">
          <SinceLastVisit codes={codes} rows={rows} news={news} dividendSoon={dividends} />
          <PriceAlertTip />
        </div>
      )}

      {/* Premium readers get the board as their main view; free readers see
          its counts + the lock under the list, so the list stays on top. */}
      {ready && isPremium && (
        <div className="wl-section">
          <GlanceBoard codes={codes} />
        </div>
      )}

      <section className={codes.length > 0 ? "wl-section" : undefined} aria-labelledby="wl-stocks">
        <SectionHeader
          id="wl-stocks"
          title={codes.length > 0 ? "Your stocks" : "Start your watchlist"}
          bn={codes.length > 0 ? "আপনার শেয়ারগুলো" : "আপনার পছন্দের শেয়ার যোগ করুন"}
          lead="Search any DSE company to follow it. Tap a name for its full report."
        />
        <AddBar scores={scores} />

        {codes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Your watchlist is empty"
              message="Search above to add any stock, or pick one of these."
              bn="উপরে সার্চ করে কোনো শেয়ার যোগ করুন, বা নিচের একটি বেছে নিন।"
              actions={[{ href: "/dsestockranking", label: "See top-ranked stocks" }]}
            >
              <EmptyStateActions />
            </EmptyState>
          </div>
        ) : loading ? (
          <div className="mt-4">
            <WatchlistSkeleton />
          </div>
        ) : error ? (
          <div className="mt-4">
            <ErrorState
              size="inline"
              title="Couldn't load your watchlist"
              bn="আপনার ওয়াচলিস্ট এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
              onRetry={() => setRetryKey((k) => k + 1)}
            />
          </div>
        ) : (
          <>
            <div className="wl-chips" role="group" aria-label="Sort your stocks">
              {SORT_OPTIONS.map((opt) => (
                <Chip key={opt.key} active={sort === opt.key} onClick={() => setSort(opt.key)}>
                  {opt.label}
                </Chip>
              ))}
            </div>
            <Card padding="none" className="wl-list">
              <table className="wl-table">
                <thead>
                  <tr>
                    <th scope="col">Company</th>
                    <th scope="col" className="wl-num">Price</th>
                    <th scope="col" className="wl-num">Today</th>
                    <th scope="col" className="wl-num">Since added</th>
                    <th scope="col" className="wl-num">Profit growth</th>
                    <th scope="col" className="wl-num">Yield</th>
                    <th scope="col">52-week range</th>
                    <th scope="col">
                      <span className="sr-only">Alert and remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((it) => {
                    const code = it.trading_code.toUpperCase();
                    return (
                      <EnrichedRow
                        key={code}
                        item={it}
                        extreme={extremes.get(code) ?? null}
                        hasDividendSoon={dividends.has(code)}
                        meta={meta[code] ?? null}
                        onRemove={handleRemove}
                      />
                    );
                  })}
                </tbody>
              </table>
              {missing > 0 && (
                <p className="wl-missing">
                  {missing} {missing === 1 ? "code isn't" : "codes aren't"} in today&apos;s scores
                  (delisted or not rated yet).
                </p>
              )}
            </Card>
          </>
        )}
      </section>

      {ready && !isPremium && (
        <div className="wl-section">
          <GlanceBoard codes={codes} />
        </div>
      )}

      {ready && (
        <WatchlistAnalysis
          mode="details"
          codes={codes}
          scores={scores}
          extremes={extremesData}
          dividends={dividendsData}
          meta={meta}
        />
      )}

      {codes.length > 0 && !error && (
        <WatchlistNews codes={codes} news={news} loading={newsLoading} />
      )}

      {ready && (
        <p className="wl-footnote">
          Written automatically from today&apos;s scores and prices — not investment advice.{" "}
          <Bn as="span">নিজে যাচাই করে সিদ্ধান্ত নিন।</Bn>
        </p>
      )}
    </>
  );
}

export default function WatchlistTable() {
  return (
    <Suspense fallback={<WatchlistSkeleton />}>
      <WatchlistTableInner />
    </Suspense>
  );
}
