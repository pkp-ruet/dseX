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
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { bnDate } from "@/lib/bn";
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

const SORT_OPTIONS: { key: SortKey; en: string; bn: string }[] = [
  { key: "az", en: "A–Z", bn: "A–Z" },
  { key: "recent", en: "Recently added", bn: "সম্প্রতি যোগ করা" },
  { key: "move", en: "Biggest move today", bn: "আজ সবচেয়ে বেশি ওঠানামা" },
  { key: "since", en: "Since added", bn: "যোগ করার পর থেকে" },
  { key: "score", en: "Best score", bn: "সেরা স্কোর" },
  { key: "yield", en: "Dividend yield", bn: "ডিভিডেন্ড ইল্ড" },
];

/** A Bengali date from a timestamp, Western digits ("6 সেপ্টেম্বর 2026"). */
function bnDateOf(iso: string, withYear = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const s = bnDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  return withYear ? s : s.replace(/\s\d{4}$/, "");
}

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
  const { lang } = useLang();
  return (
    <Card padding="md" aria-busy="true" aria-label={lang === "bn" ? "ওয়াচলিস্ট লোড হচ্ছে" : "Loading your watchlist"}>
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
      title={<T en="Sign in to use your watchlist" bn="ওয়াচলিস্ট ব্যবহার করতে সাইন ইন করুন" />}
      message={
        <T
          en="Follow shares on any device. We show their price moves, news and dividend dates in one place."
          bn="যেকোনো ডিভাইস থেকে শেয়ার অনুসরণ করুন। তাদের দামের ওঠানামা, খবর আর ডিভিডেন্ডের তারিখ এক জায়গায় দেখাই।"
        />
      }
      actions={[
        { href: `/login?next=${encNext}`, label: <T en="Sign in" bn="সাইন ইন" /> },
        { href: `/register?next=${encNext}`, label: <T en="Create an account" bn="অ্যাকাউন্ট খুলুন" /> },
      ]}
    >
      {pendingCodes.length > 0 && (
        <p className="mt-4 text-xs text-text-muted">
          <T
            en={`We will add ${pendingCodes.length} shared ${pendingCodes.length === 1 ? "share" : "shares"} to your list after you sign in.`}
            bn={`সাইন ইন করার পর শেয়ার করা ${pendingCodes.length}টি শেয়ার আপনার তালিকায় যোগ হবে।`}
          />
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
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);

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
          <T en="Add a company to your watchlist" bn="ওয়াচলিস্টে একটি কোম্পানি যোগ করুন" />
        </label>
        <input
          id="wl-add-input"
          className="wl-add-input"
          placeholder={L("Add a company by name or code", "নাম বা কোড লিখে কোম্পানি যোগ করুন")}
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
            aria-label={L("Clear the search", "খোঁজা মুছুন")}
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
                <span className="wl-add-state">
                  {watched ? <T en="Following" bn="অনুসরণ করছেন" /> : <T en="+ Follow" bn="+ অনুসরণ" />}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && scores && (
        <div className="wl-add-empty">
          <T en={`No company matches "${query}"`} bn={`"${query}" নামে কোনো কোম্পানি পাওয়া যায়নি`} />
        </div>
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
  const { lang } = useLang();
  if (ltp == null || high == null || low == null || high <= low) {
    return <span className="wl-dash">—</span>;
  }
  const pos = Math.max(0, Math.min(1, (ltp - low) / (high - low)));
  return (
    <div
      className="wl-range"
      title={
        lang === "bn"
          ? `গত এক বছরের দামের সীমা: ${money(low)} থেকে ${money(high)}`
          : `Price range over the past year: ${money(low)} to ${money(high)}`
      }
    >
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
  const { lang } = useLang();
  // Only Buy is shown on the watchlist; Sell lives on the stock page.
  const buy = signal != null && signal.signal === "buy";
  if (!buy && !extreme && !hasDividendSoon) return null;
  return (
    <div className="wl-notes">
      {buy && <SignalChip
          signal={signal.signal}
          strength={signal.strength}
          reason={(lang === "bn" ? signal.reason_bn : signal.reason_en) || signal.reason_en}
        />}
      {extreme && (
        <Chip tone={extreme.side === "high" ? "positive" : "negative"}>
          {extreme.side === "high" ? (
            <T en="Near its yearly high" bn="বছরের সর্বোচ্চের কাছে" />
          ) : (
            <T en="Near its yearly low" bn="বছরের সর্বনিম্নের কাছে" />
          )}
        </Chip>
      )}
      {hasDividendSoon && (
        <Chip tone="info">
          <T en="Dividend soon" bn="শিগগির ডিভিডেন্ড" />
        </Chip>
      )}
    </div>
  );
}

function EnrichedRow({ item, extreme, hasDividendSoon, meta, onRemove }: RowProps) {
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);
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
      <td data-cell="since" data-label={L("Since added", "যোগ করার পর")} className="wl-num">
        {since != null && meta ? (
          <span
            title={L(
              `Added on ${formatDateLong(meta.added_at)} at ${taka(meta.price_at_add, 1)}`,
              `${bnDateOf(meta.added_at)} তারিখে ${taka(meta.price_at_add, 1)} দামে যোগ করা`,
            )}
          >
            <span className={`font-semibold nums ${changeTone(since)}`}>{changePct(since, 1)}</span>
            <span className="wl-sub">
              <T en={`since ${shortDate(meta.added_at)}`} bn={`${bnDateOf(meta.added_at, false)} থেকে`} />
            </span>
          </span>
        ) : (
          <span className="wl-dash">—</span>
        )}
      </td>
      <td data-cell="eps" data-label={L("Profit growth", "মুনাফা বৃদ্ধি")} className="wl-num">
        {eps != null && !Number.isNaN(eps) ? (
          <span
            className={`font-semibold nums ${changeTone(eps)}`}
            title={L(
              `Earnings per share against last year: ${changePct(eps, 1)}`,
              `গত বছরের তুলনায় ইপিএস: ${changePct(eps, 1)}`,
            )}
          >
            {changePct(eps, 0)}
          </span>
        ) : (
          <span className="wl-dash">—</span>
        )}
      </td>
      <td data-cell="yld" data-label={L("Yield", "ইল্ড")} className="wl-num">
        {yld != null && !Number.isNaN(yld) ? (
          <span className="font-semibold nums" title={L(`Dividend yield: ${yld.toFixed(2)}%`, `ডিভিডেন্ড ইল্ড: ${yld.toFixed(2)}%`)}>
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
            aria-label={L(`Stop following ${item.trading_code}`, `${item.trading_code} অনুসরণ বন্ধ করুন`)}
            title={L("Stop following", "অনুসরণ বন্ধ করুন")}
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
  const { lang } = useLang();
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
      message: <T en={`${upper} was removed from your watchlist`} bn={`${upper} ওয়াচলিস্ট থেকে সরানো হয়েছে`} />,
      action: { label: <T en="Undo" bn="ফিরিয়ে আনুন" />, onClick: () => addToWatchlist(upper, restore) },
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
              <T
                en={`Someone shared a watchlist with you. Would you like to follow ${sharedCodes.length} ${sharedCodes.length === 1 ? "share" : "shares"}?`}
                bn={`কেউ আপনার সঙ্গে একটি ওয়াচলিস্ট শেয়ার করেছেন। ${sharedCodes.length}টি শেয়ার অনুসরণ করবেন?`}
              />
            </p>
            <p className="wl-note-text text-text-muted">{sharedCodes.join(" · ")}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={handleImportShared} variant="primary" size="sm">
                <T en="Follow them" bn="অনুসরণ করুন" />
              </Button>
              <Button type="button" onClick={handleDismissImport} variant="quiet" size="sm">
                <T en="Not now" bn="এখন না" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {codes.length > 0 && (
        <div className="wl-bar">
          <p className="wl-count">
            <T
              en={
                <>
                  <strong>{codes.length}</strong>
                  {limits.watchlist !== null && <span className="nums"> of {limits.watchlist}</span>}{" "}
                  {codes.length === 1 && limits.watchlist === null ? "share" : "shares"} followed
                </>
              }
              bn={
                <>
                  <strong>{codes.length}</strong>
                  {limits.watchlist !== null && <span className="nums">/{limits.watchlist}</span>}টি শেয়ার
                  অনুসরণ করছেন
                </>
              }
            />
            {limits.watchlist !== null && codes.length >= limits.watchlist && (
              <>
                {" · "}
                <Link href={PREMIUM_PATH} className="font-semibold text-primary-ink hover:underline">
                  <T en="Follow more with Premium" bn="প্রিমিয়ামে আরও অনুসরণ করুন" />
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
          title={
            codes.length > 0 ? (
              <T en="Your shares" bn="আপনার শেয়ারগুলো" />
            ) : (
              <T en="Start your watchlist" bn="আপনার ওয়াচলিস্ট শুরু করুন" />
            )
          }
          lead={
            <T
              en="Search any DSE company to follow it. Tap a name to see its full report."
              bn="ডিএসইর যেকোনো কোম্পানি খুঁজে অনুসরণ করুন। পুরো রিপোর্ট দেখতে নামে চাপুন।"
            />
          }
        />
        <AddBar scores={scores} />

        {codes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={<T en="Your watchlist is empty" bn="আপনার ওয়াচলিস্ট এখনো খালি" />}
              message={
                <T
                  en="Search above to add any share, or choose one of these."
                  bn="ওপরে খুঁজে যেকোনো শেয়ার যোগ করুন, অথবা নিচের একটি বেছে নিন।"
                />
              }
              actions={[{ href: "/dsestockranking", label: <T en="See the top-ranked shares" bn="সেরা র‍্যাংকের শেয়ার দেখুন" /> }]}
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
              title={<T en="We couldn't load your watchlist" bn="আপনার ওয়াচলিস্ট এখন লোড করা যাচ্ছে না" />}
              onRetry={() => setRetryKey((k) => k + 1)}
            />
          </div>
        ) : (
          <>
            <div className="wl-chips" role="group" aria-label={lang === "bn" ? "শেয়ারগুলো সাজান" : "Sort your shares"}>
              {SORT_OPTIONS.map((opt) => (
                <Chip key={opt.key} active={sort === opt.key} onClick={() => setSort(opt.key)}>
                  <T en={opt.en} bn={opt.bn} />
                </Chip>
              ))}
            </div>
            <Card padding="none" className="wl-list">
              <table className="wl-table">
                <thead>
                  <tr>
                    <th scope="col"><T en="Company" bn="কোম্পানি" /></th>
                    <th scope="col" className="wl-num"><T en="Price" bn="দাম" /></th>
                    <th scope="col" className="wl-num"><T en="Today" bn="আজ" /></th>
                    <th scope="col" className="wl-num"><T en="Since added" bn="যোগ করার পর" /></th>
                    <th scope="col" className="wl-num"><T en="Profit growth" bn="মুনাফা বৃদ্ধি" /></th>
                    <th scope="col" className="wl-num"><T en="Yield" bn="ইল্ড" /></th>
                    <th scope="col"><T en="Yearly range" bn="বছরের সীমা" /></th>
                    <th scope="col">
                      <span className="sr-only">
                        <T en="Alert and remove" bn="অ্যালার্ট ও সরানো" />
                      </span>
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
                  <T
                    en={`${missing} ${missing === 1 ? "code is" : "codes are"} not in today's scores. ${missing === 1 ? "It may have been" : "They may have been"} delisted, or not rated yet.`}
                    bn={`${missing}টি কোড আজকের স্কোরে নেই। হয়তো তালিকা থেকে বাদ পড়েছে, বা এখনো রেটিং হয়নি।`}
                  />
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
          <T
            en="Written automatically from today's scores and prices. It is not investment advice, so please check for yourself before you decide."
            bn="আজকের স্কোর আর দাম থেকে নিজে থেকে লেখা। এটি বিনিয়োগ পরামর্শ নয়, তাই নিজে যাচাই করে সিদ্ধান্ত নিন।"
          />
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
