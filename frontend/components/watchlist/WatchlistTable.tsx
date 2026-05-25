"use client";

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
} from "@/lib/api";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { taka } from "@/lib/formatters";
import {
  getCachedWatchlist,
  subscribeWatchlist,
  loadWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  setWatchlist,
  getCachedNotes,
  loadNotes,
  subscribeNotes,
  getNote,
} from "@/lib/watchlist";
import { useAuth } from "@/context/AuthContext";
import { getTier, TIER_LABELS, type TierKey } from "@/lib/constants";
import WatchlistNews from "./WatchlistNews";
import WatchlistAnalysis from "./WatchlistAnalysis";
import SinceLastVisit from "./SinceLastVisit";
import NoteEditor from "./NoteEditor";
import EmptyStateActions from "./EmptyStateActions";
import ShareWatchlistButton from "./ShareWatchlistButton";

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

// ---------------------------------------------------------------------------
// Logged-out CTA
// ---------------------------------------------------------------------------

function SignInCTA({ pendingCodes }: { pendingCodes: string[] }) {
  const nextHref = pendingCodes.length
    ? `/watchlist?codes=${pendingCodes.join(",")}`
    : "/watchlist";
  const encNext = encodeURIComponent(nextHref);
  return (
    <div className="watchlist-empty">
      <h2>Sign in to use your watchlist</h2>
      <p>
        Save your favorite stocks across devices. We&apos;ll surface fresh news, price moves, and
        dividend events on your list.
      </p>
      <div className="mt-4 flex gap-2 justify-center">
        <Link
          href={`/login?next=${encNext}`}
          className="navbar-rank-btn text-sm px-4 py-2"
        >
          Sign In
        </Link>
        <Link
          href={`/register?next=${encNext}`}
          className="navbar-intel-btn text-sm px-4 py-2"
        >
          Create Account
        </Link>
      </div>
      {pendingCodes.length > 0 && (
        <p className="mt-4 text-xs text-[var(--ink-muted)]">
          We&apos;ll add {pendingCodes.length} shared{" "}
          {pendingCodes.length === 1 ? "stock" : "stocks"} to your list after sign-in.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add bar
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
    <div className="watchlist-add-bar" ref={wrapRef}>
      <div className="watchlist-add-input-wrap">
        <svg className="watchlist-add-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          className="watchlist-add-input"
          placeholder="Add company to watchlist…"
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
            className="watchlist-add-clear"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="watchlist-add-dropdown">
          {filtered.map((it) => {
            const watched = watchedCodes.includes(it.trading_code.toUpperCase());
            return (
              <li
                key={it.trading_code}
                className={`watchlist-add-item${watched ? " watched" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(it.trading_code)}
              >
                <span className="watchlist-add-code">{it.trading_code}</span>
                <span className="watchlist-add-name">{it.company_name ?? ""}</span>
                <span className={`watchlist-add-badge ${watched ? "done" : "add"}`}>
                  {watched ? "✓ Added" : "+ Add"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && scores && (
        <div className="watchlist-add-empty">No match for &quot;{query}&quot;</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enriched row
// ---------------------------------------------------------------------------

interface RowProps {
  item: ScoreItem;
  extreme: NearExtremeItem | null;
  hasDividendSoon: boolean;
  note: string;
  onOpenNote: () => void;
}

const TIER_CHIP_CLS: Record<TierKey, string> = {
  strong_buy:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
  buy: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20",
  keep_watching:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
  avoid: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20",
};

function TierBadge({ tier }: { tier: TierKey }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${TIER_CHIP_CLS[tier]}`}
      title={`Tier: ${TIER_LABELS[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

function RangeBar({ ltp, high, low }: { ltp: number | null; high: number | null; low: number | null }) {
  if (ltp == null || high == null || low == null || high <= low) {
    return <span className="text-[var(--ink-muted)] text-xs">—</span>;
  }
  const pos = Math.max(0, Math.min(1, (ltp - low) / (high - low)));
  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]" title={`52w: ${low.toFixed(1)} – ${high.toFixed(1)}`}>
      <div className="relative h-1.5 rounded-full bg-[var(--border)]">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[var(--primary)] border border-[var(--bg)]"
          style={{ left: `calc(${pos * 100}% - 5px)` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-[var(--ink-muted)] tabular-nums">
        <span>{low.toFixed(0)}</span>
        <span>{high.toFixed(0)}</span>
      </div>
    </div>
  );
}

function SignalPills({
  extreme,
  hasDividendSoon,
}: {
  extreme: NearExtremeItem | null;
  hasDividendSoon: boolean;
}) {
  const pills: { label: string; tone: "up" | "dn" | "info" }[] = [];
  if (extreme && extreme.gap_pct != null) {
    // gap_pct is distance to high or low — endpoint splits near_high/near_low
    // We don't know which list this came from here; use sign as heuristic via ltp vs midpoint
    if (extreme.w52_high != null && extreme.ltp != null && extreme.w52_low != null) {
      const mid = (extreme.w52_high + extreme.w52_low) / 2;
      if (extreme.ltp >= mid) {
        pills.push({ label: "Near 52w high", tone: "up" });
      } else {
        pills.push({ label: "Near 52w low", tone: "dn" });
      }
    }
  }
  if (hasDividendSoon) pills.push({ label: "Dividend soon", tone: "info" });

  if (pills.length === 0) return <span className="text-[var(--ink-muted)] text-xs">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {pills.map((p) => {
        const cls =
          p.tone === "up"
            ? "bg-green-500/15 text-green-700 dark:text-green-300"
            : p.tone === "dn"
              ? "bg-red-500/15 text-red-700 dark:text-red-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
        return (
          <span
            key={p.label}
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${cls}`}
          >
            {p.label}
          </span>
        );
      })}
    </div>
  );
}

function EpsPill({ value }: { value: number | null | undefined }) {
  if (value == null || Number.isNaN(value)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--ink-muted)] whitespace-nowrap">
        <span className="opacity-60">EPS</span>
        <span>—</span>
      </span>
    );
  }
  const tone =
    value > 10
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
      : value < -10
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
        : "bg-[var(--border)]/40 text-[var(--ink-muted)] border-[var(--border)]";
  const sign = value > 0 ? "+" : "";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums whitespace-nowrap border ${tone}`}
      title={`EPS year-on-year change: ${sign}${value.toFixed(1)}%`}
    >
      <span className="opacity-70 font-bold tracking-wider">EPS</span>
      <span>{sign}{value.toFixed(0)}%</span>
    </span>
  );
}

function EnrichedRow({ item, extreme, hasDividendSoon, note, onOpenNote }: RowProps) {
  const chg = item.change_pct;
  const chgCls = chg == null ? "" : chg > 0 ? "up" : chg < 0 ? "dn" : "flat";
  const tier = getTier(item.score);
  return (
    <tr>
      <td>
        <button
          type="button"
          onClick={() => removeFromWatchlist(item.trading_code)}
          aria-label={`Remove ${item.trading_code}`}
          title="Remove from watchlist"
          className="star-btn star-btn--on"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </td>
      <td>
        <Link href={`/stock/${item.trading_code}`} className="watchlist-ticker">
          {item.trading_code}
        </Link>
      </td>
      <td>
        <TierBadge tier={tier} />
      </td>
      <td className="num">{item.ltp != null ? taka(item.ltp, 1) : "—"}</td>
      <td className={`num watchlist-chg ${chgCls}`}>
        {chg == null ? "—" : `${chg > 0 ? "+" : ""}${chg.toFixed(1)}%`}
      </td>
      <td>
        <EpsPill value={item.eps_yoy_pct} />
      </td>
      <td>
        <RangeBar
          ltp={extreme?.ltp ?? item.ltp}
          high={extreme?.w52_high ?? null}
          low={extreme?.w52_low ?? null}
        />
      </td>
      <td>
        <SignalPills extreme={extreme} hasDividendSoon={hasDividendSoon} />
      </td>
      <td>
        <button
          type="button"
          onClick={onOpenNote}
          aria-label={note ? "Edit note" : "Add note"}
          title={note || "Add a private note"}
          className={`text-base leading-none ${
            note
              ? "text-[var(--primary)]"
              : "text-[var(--ink-muted)] hover:text-[var(--primary)]"
          }`}
        >
          {note ? "✎" : "+"}
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

function extremesToMap(data: NearExtremesData): Map<string, NearExtremeItem> {
  const map = new Map<string, NearExtremeItem>();
  for (const it of data.near_high) map.set(it.trading_code.toUpperCase(), it);
  for (const it of data.near_low) map.set(it.trading_code.toUpperCase(), it);
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const sharedCodes = useMemo(() => parseCodesParam(searchParams.get("codes")), [searchParams]);

  // Hydrate from localStorage SWR cache on mount for an instant first paint.
  const [scores, setScores] = useState<ScoresResponse | null>(
    () => readCache<ScoresResponse>(cacheKeys.scores),
  );
  const [extremes, setExtremes] = useState<Map<string, NearExtremeItem>>(() => {
    const cached = readCache<NearExtremesData>(cacheKeys.extremes);
    return cached ? extremesToMap(cached) : new Map();
  });
  const [dividends, setDividends] = useState<Set<string>>(() => {
    const cached = readCache<DividendsUpcoming>(cacheKeys.dividends);
    return cached ? dividendsToSet(cached) : new Set();
  });
  const [codes, setCodes] = useState<string[]>([]);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(
    () => readCache<ScoresResponse>(cacheKeys.scores) === null,
  );
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [importPrompt, setImportPrompt] = useState(false);

  // News fetched in parallel with public data — keyed on the sorted code list.
  const [news, setNews] = useState<WatchlistNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Load watchlist + notes when logged in.
  // loadWatchlist/loadNotes synchronously hydrate their module-level caches
  // from localStorage if available, so the snapshot right after the call gives
  // us instant codes/notes even before the network round-trip resolves.
  useEffect(() => {
    if (!isLoggedIn) return;
    const wPromise = loadWatchlist();
    const nPromise = loadNotes();
    setCodes(getCachedWatchlist());
    setNotesMap(getCachedNotes());
    wPromise.then(() => setCodes(getCachedWatchlist()));
    nPromise.then(() => setNotesMap(getCachedNotes()));
    const offW = subscribeWatchlist(() => setCodes(getCachedWatchlist()));
    const offN = subscribeNotes(() => setNotesMap(getCachedNotes()));
    return () => {
      offW();
      offN();
    };
  }, [isLoggedIn]);

  // Public data — SWR refresh in background. State already hydrated from cache.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getScores(), getNearExtremes(), getDividendsUpcoming()])
      .then(([s, e, d]) => {
        if (cancelled) return;
        if (s.status === "fulfilled") {
          setScores(s.value);
          writeCache(cacheKeys.scores, s.value);
        }
        if (e.status === "fulfilled") {
          setExtremes(extremesToMap(e.value));
          writeCache(cacheKeys.extremes, e.value);
        }
        if (d.status === "fulfilled") {
          setDividends(dividendsToSet(d.value));
          writeCache(cacheKeys.dividends, d.value);
        }
        // Only surface an error when no cache served the first paint.
        if (
          s.status === "rejected" &&
          e.status === "rejected" &&
          d.status === "rejected"
        ) {
          setError(String(s.reason));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    return codes
      .map((c) => map.get(c.toUpperCase()))
      .filter((it): it is ScoreItem => Boolean(it))
      .sort((a, b) => a.trading_code.localeCompare(b.trading_code));
  }, [scores, codes]);

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
    return <div className="watchlist-loading">Loading…</div>;
  }

  if (!isLoggedIn) {
    return <SignInCTA pendingCodes={sharedCodes} />;
  }

  return (
    <>
      {importPrompt && sharedCodes.length > 0 && (
        <div className="mb-4 rounded-xl border border-[var(--primary)] bg-[var(--primary)]/10 p-4">
          <p className="text-sm text-[var(--ink)] mb-3">
            Someone shared a watchlist with you. Import{" "}
            <span className="font-bold">{sharedCodes.length}</span>{" "}
            {sharedCodes.length === 1 ? "stock" : "stocks"}?
            <span className="block mt-1 text-xs text-[var(--ink-muted)]">
              {sharedCodes.join(" · ")}
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleImportShared}
              className="navbar-rank-btn text-xs px-3 py-1.5"
            >
              Import
            </button>
            <button
              type="button"
              onClick={handleDismissImport}
              className="navbar-intel-btn text-xs px-3 py-1.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {codes.length > 0 && (
        <SinceLastVisit codes={codes} rows={rows} />
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex-1">
          <AddBar scores={scores} />
        </div>
        {codes.length > 0 && <ShareWatchlistButton codes={codes} />}
      </div>

      {codes.length === 0 ? (
        <div className="watchlist-empty">
          <h2>Your watchlist is empty</h2>
          <p>Pick a starter pack or search above to add a stock.</p>
          <EmptyStateActions />
        </div>
      ) : loading ? (
        <div className="watchlist-loading">Loading watchlist…</div>
      ) : error ? (
        <div className="watchlist-error">Failed to load: {error}</div>
      ) : (
        <div className="watchlist-wrap">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th></th>
                <th>Code</th>
                <th>Tier</th>
                <th className="num">LTP</th>
                <th className="num">Chg %</th>
                <th>EPS YoY</th>
                <th>52w range</th>
                <th>Signals</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => {
                const code = it.trading_code.toUpperCase();
                return (
                  <Fragment key={code}>
                    <EnrichedRow
                      item={it}
                      extreme={extremes.get(code) ?? null}
                      hasDividendSoon={dividends.has(code)}
                      note={notesMap[code] ?? ""}
                      onOpenNote={() => setEditingNote(editingNote === code ? null : code)}
                    />
                    {editingNote === code && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <NoteEditor
                            code={code}
                            initial={getNote(code)}
                            onClose={() => setEditingNote(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {codes.length - rows.length > 0 && (
            <p className="watchlist-missing">
              {codes.length - rows.length} ticker{codes.length - rows.length > 1 ? "s" : ""} not
              found in current scores (may be delisted or unscored).
            </p>
          )}
        </div>
      )}

      {codes.length > 0 && !loading && !error && <WatchlistAnalysis codes={codes} />}
      {codes.length > 0 && !error && (
        <WatchlistNews codes={codes} news={news} loading={newsLoading} />
      )}
    </>
  );
}

export default function WatchlistTable() {
  return (
    <Suspense fallback={<div className="watchlist-loading">Loading…</div>}>
      <WatchlistTableInner />
    </Suspense>
  );
}
