"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getScores,
  getNearExtremes,
  getDividendsUpcoming,
  getWatchlistNews,
  getWatchlistGlance,
  type GlanceRow,
  type ScoreItem,
  type ScoresResponse,
  type NearExtremeItem,
  type DividendsUpcoming,
  type NearExtremesData,
  type WatchlistNewsItem,
  type WatchlistMeta,
} from "@/lib/api";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
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
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SectionHeader from "@/components/ui/SectionHeader";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import WatchlistNews from "./WatchlistNews";
import WatchlistAnalysis from "./WatchlistAnalysis";
import PriceAlertTip from "./PriceAlertTip";
import EmptyStateActions from "./EmptyStateActions";
import ShareWatchlistButton from "./ShareWatchlistButton";
import SinceLastVisit from "./SinceLastVisit";
import WatchTable, { sinceFollowed, type WatchRow } from "./WatchTable";
import { toast } from "@/lib/toast";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";

/*
 * /watchlist (styles: app/styles/watchlist.css, `wl-*`). Order: count + share
 * → hero (mood, one sentence, four answers) → since-last-visit note → "Your
 * shares" (add search, one sort menu, THE table — free basics + Premium "our
 * read" in one row per stock, see WatchTable.tsx) → "What stands out" folds →
 * news. The separate Premium glance board was folded into the table
 * 2026-10-28 (user decision: one table, not two).
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

type SortKey = "az" | "recent" | "move" | "since" | "score" | "yield" | "value" | "event" | "risk";

/** One sort menu. The last three order by our read, so they are Premium —
 *  a free reader sees them, locked (the order alone would give it away). */
const SORT_OPTIONS: { key: SortKey; en: string; bn: string; premium?: boolean }[] = [
  { key: "az", en: "A–Z", bn: "A–Z" },
  { key: "recent", en: "Recently added", bn: "সম্প্রতি যোগ করা" },
  { key: "move", en: "Biggest move today", bn: "আজ সবচেয়ে বেশি ওঠানামা" },
  { key: "since", en: "Best since you followed", bn: "অনুসরণের পর সবচেয়ে ভালো" },
  { key: "score", en: "Best score", bn: "সেরা স্কোর" },
  { key: "yield", en: "Highest dividend yield", bn: "সবচেয়ে বেশি ডিভিডেন্ড ইল্ড" },
  { key: "value", en: "Most under fair value", bn: "ন্যায্য দামের সবচেয়ে নিচে", premium: true },
  { key: "event", en: "Next record date or AGM", bn: "আগে রেকর্ড ডেট বা এজিএম", premium: true },
  { key: "risk", en: "Most watch-outs", bn: "সবচেয়ে বেশি সতর্কতা", premium: true },
];

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
  const { limits } = usePremium();
  const premiumOpen = usePremiumOpen();
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

  // Our read on each stock (fair value, signal, next event, watch-outs) — the
  // table's Premium half. Public payload; the lock is screen-only.
  const [glance, setGlance] = useState<GlanceRow[] | null>(null);
  const [glanceLoading, setGlanceLoading] = useState(false);

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

  // Our read — same pattern: cached copy first, then the fresh one.
  useEffect(() => {
    if (!codes.length) {
      setGlance([]);
      setGlanceLoading(false);
      return;
    }
    const key = cacheKeys.watchlistGlance(codes);
    const cached = readCache<GlanceRow[]>(key);
    setGlance(cached);
    setGlanceLoading(!cached);
    let cancelled = false;
    getWatchlistGlance(codes)
      .then((fresh) => {
        if (cancelled) return;
        setGlance(fresh);
        writeCache(key, fresh);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGlanceLoading(false);
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

  // A Premium order picked before a membership ended falls back to A–Z.
  const sortKey: SortKey = SORT_OPTIONS.find((o) => o.key === sort)?.premium && !premiumOpen ? "az" : sort;

  // Score rows for the table, in the chosen order.
  const scoreRows = useMemo(() => {
    const map = new Map(flatten(scores).map((it) => [it.trading_code.toUpperCase(), it]));
    return codes
      .map((c) => map.get(c.toUpperCase()))
      .filter((it): it is ScoreItem => Boolean(it));
  }, [scores, codes]);

  const rows = useMemo<WatchRow[]>(() => {
    const byCode = new Map((glance ?? []).map((g) => [g.code.toUpperCase(), g]));
    const built = scoreRows.map((item): WatchRow => {
      const code = item.trading_code.toUpperCase();
      const g = byCode.get(code) ?? null;
      const ex = extremes.get(code)?.item;
      return {
        item,
        glance: g,
        meta: meta[code] ?? null,
        hi: g?.hi52 ?? ex?.w52_high ?? null,
        lo: g?.lo52 ?? ex?.w52_low ?? null,
      };
    });
    // Nulls sort last; ties fall back to A–Z so order is stable.
    const desc = (a: number | null | undefined, b: number | null | undefined) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      return b - a;
    };
    const asc = (a: number | null | undefined, b: number | null | undefined) =>
      desc(a == null ? null : -a, b == null ? null : -b);
    const addedMs = (r: WatchRow) => {
      const t = r.meta ? Date.parse(r.meta.added_at) : NaN;
      return Number.isFinite(t) ? t : null;
    };
    const abs = (v: number | null | undefined) => (v == null ? null : Math.abs(v));
    return built.sort((a, b) => {
      const x = a.item;
      const y = b.item;
      let d = 0;
      if (sortKey === "recent") d = desc(addedMs(a), addedMs(b));
      else if (sortKey === "since") d = desc(sinceFollowed(x, a.meta), sinceFollowed(y, b.meta));
      else if (sortKey === "move") d = desc(abs(x.change_pct), abs(y.change_pct));
      else if (sortKey === "score") d = desc(x.score, y.score);
      else if (sortKey === "yield") d = desc(x.div_yield_pct, y.div_yield_pct);
      else if (sortKey === "value") d = asc(a.glance?.fair?.gap_pct, b.glance?.fair?.gap_pct);
      else if (sortKey === "event") d = asc(a.glance?.event?.days_left, b.glance?.event?.days_left);
      else if (sortKey === "risk") d = desc(a.glance?.risks.length, b.glance?.risks.length);
      return d !== 0 ? d : x.trading_code.localeCompare(y.trading_code);
    });
  }, [scoreRows, glance, extremes, meta, sortKey]);

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
  const missing = codes.length - scoreRows.length;

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
          <SinceLastVisit codes={codes} rows={scoreRows} news={news} dividendSoon={dividends} />
          <PriceAlertTip />
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
              en="Search any DSE company to follow it. Tap a share to see everything we know about it."
              bn="ডিএসইর যেকোনো কোম্পানি খুঁজে অনুসরণ করুন। কোনো শেয়ারের সব তথ্য দেখতে তাতে চাপুন।"
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
            <div className="wl-tools">
              <p className="wl-hint">
                <T
                  en="Tap Details on any share to see more about it."
                  bn="কোনো শেয়ারের আরও তথ্য দেখতে তার বিস্তারিত বোতামে চাপুন।"
                />
              </p>
              <label htmlFor="wl-sort" className="sr-only">
                <T en="Sort your shares" bn="শেয়ারগুলো সাজান" />
              </label>
              <select
                id="wl-sort"
                className="wl-sort"
                value={sortKey}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORT_OPTIONS.map((o) => {
                  const locked = o.premium && !premiumOpen;
                  const label = lang === "bn" ? `সাজানো: ${o.bn}` : `Sort: ${o.en}`;
                  const tag = locked ? (lang === "bn" ? " · প্রিমিয়াম" : " · Premium") : "";
                  return (
                    <option key={o.key} value={o.key} disabled={locked}>
                      {`${label}${tag}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <WatchTable
              rows={rows}
              glanceLoading={glanceLoading}
              onRemove={handleRemove}
              footer={
                missing > 0 && (
                  <p className="wl-missing">
                    <T
                      en={`${missing} ${missing === 1 ? "code is" : "codes are"} not in today's scores. ${missing === 1 ? "It may have been" : "They may have been"} delisted, or not rated yet.`}
                      bn={`${missing}টি কোড আজকের স্কোরে নেই। হয়তো তালিকা থেকে বাদ পড়েছে, বা এখনো রেটিং হয়নি।`}
                    />
                  </p>
                )
              }
            />
          </>
        )}
      </section>

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
