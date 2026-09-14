"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiGetPortfolio, type PortfolioHolding, type WatchlistMeta } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import { loadWatchlist, getCachedWatchlist, getCachedWatchlistMeta, subscribeWatchlist } from "@/lib/watchlist";
import { money, formatDate } from "@/lib/formatters";
import { SIGNAL_LABELS, SIGNAL_LABELS_BN, SIGNAL_VAR } from "@/lib/constants";
import { useStockLang } from "@/context/StockLangContext";
import { IconWallet, IconStar } from "@/components/stock/StockIcons";

interface Props {
  code: string;
  ltp: number | null;
}

const T = {
  position: { en: "Your position", bn: "আপনার অবস্থান" },
  shares: { en: "Shares", bn: "শেয়ার" },
  avgCost: { en: "Avg. cost", bn: "গড় দাম" },
  value: { en: "Value now", bn: "এখনকার মূল্য" },
  pl: { en: "Profit / loss", bn: "লাভ / ক্ষতি" },
  portfolio: { en: "Open portfolio", bn: "পোর্টফোলিও দেখুন" },
  watching: { en: "On your watchlist", bn: "আপনার ওয়াচলিস্টে" },
  since: { en: "since", bn: "থেকে" },
  sinceAdded: { en: "since you added it", bn: "যোগ করার পর থেকে" },
  watchlist: { en: "Open watchlist", bn: "ওয়াচলিস্ট দেখুন" },
} as const;

/**
 * The reader's own stake in this stock, folded into the hero: shares held,
 * average cost, value now, P/L and the server's Buy-more / Sell overlay. For a
 * watcher: how long the stock has been followed and the move since. Everything
 * comes from endpoints that already compute it (portfolio GET, watchlist meta);
 * the frontend derives no advice of its own.
 */
export default function YourPosition({ code, ltp }: Props) {
  const { isLoggedIn } = useAuth();
  const { lang } = useStockLang();
  const isBn = lang === "bn";
  const CODE = code.toUpperCase();

  const [holdings, setHoldings] = useState<PortfolioHolding[] | null>(null);
  const [watched, setWatched] = useState(false);
  const [meta, setMeta] = useState<WatchlistMeta>({});

  useEffect(() => {
    if (!isLoggedIn) {
      setHoldings(null);
      setWatched(false);
      return;
    }
    let alive = true;

    const uid = getStoredUser()?.user_id ?? null;
    if (uid) {
      const cached = readCache<PortfolioHolding[]>(cacheKeys.portfolio(uid));
      if (cached) setHoldings(cached);
    }
    apiGetPortfolio()
      .then((r) => {
        if (!alive) return;
        setHoldings(r.holdings);
        if (uid) writeCache(cacheKeys.portfolio(uid), r.holdings);
      })
      .catch(() => {});

    const syncWatch = () => {
      if (!alive) return;
      setWatched(getCachedWatchlist().map((c) => c.toUpperCase()).includes(CODE));
      setMeta(getCachedWatchlistMeta());
    };
    syncWatch();
    loadWatchlist().then(syncWatch).catch(() => {});
    const unsub = subscribeWatchlist(syncWatch);

    return () => {
      alive = false;
      unsub();
    };
  }, [isLoggedIn, CODE]);

  const mine = useMemo(
    () => (holdings ?? []).filter((h) => h.trading_code.toUpperCase() === CODE),
    [holdings, CODE],
  );

  if (!isLoggedIn) return null;

  // --- Holder view -----------------------------------------------------------
  if (mine.length > 0) {
    const qty = mine.reduce((s, h) => s + (Number(h.qty) || 0), 0);
    const cost = mine.reduce((s, h) => s + (Number(h.qty) || 0) * (Number(h.buy_price) || 0), 0);
    const avg = qty > 0 ? cost / qty : null;
    const valueNow = ltp != null ? qty * ltp : null;
    const pl = valueNow != null ? valueNow - cost : null;
    const plPct = pl != null && cost > 0 ? (pl / cost) * 100 : null;
    const plColor = pl == null ? "var(--text-muted)" : pl >= 0 ? "var(--positive)" : "var(--negative)";
    const rawSig = mine.find((h) => h.signal && h.signal.signal !== "none")?.signal ?? null;
    const sig = rawSig && rawSig.signal !== "none" ? { ...rawSig, signal: rawSig.signal } : null;
    const sigKind = sig?.signal as "buy_more" | "sell" | undefined;

    return (
      <div
        className={`rounded-2xl p-4 ${isBn ? "font-bn" : ""}`}
        lang={isBn ? "bn" : undefined}
        style={{
          background: "color-mix(in srgb, var(--primary) 6%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "var(--primary)" }}
          >
            <IconWallet size={14} />
            {T.position[lang]}
          </span>
          <Link href="/portfolio" className="text-xs font-semibold hover:underline" style={{ color: "var(--primary)" }}>
            {T.portfolio[lang]} →
          </Link>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <dt className="text-[11px]" style={{ color: "var(--text-muted)" }}>{T.shares[lang]}</dt>
            <dd className="text-base font-bold tabular-nums nums" style={{ color: "var(--text)" }}>
              {qty.toLocaleString("en-US")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px]" style={{ color: "var(--text-muted)" }}>{T.avgCost[lang]}</dt>
            <dd className="text-base font-bold tabular-nums nums" style={{ color: "var(--text)" }}>{money(avg)}</dd>
          </div>
          <div>
            <dt className="text-[11px]" style={{ color: "var(--text-muted)" }}>{T.value[lang]}</dt>
            <dd className="text-base font-bold tabular-nums nums" style={{ color: "var(--text)" }}>{money(valueNow)}</dd>
          </div>
          <div>
            <dt className="text-[11px]" style={{ color: "var(--text-muted)" }}>{T.pl[lang]}</dt>
            {/* flex-wrap gives "+৳1,234,567" and "(+12.3%)" a break between them —
                as one unbreakable run they overflowed the 2-col grid cell */}
            <dd className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-base font-bold tabular-nums nums" style={{ color: plColor }}>
              <span>{pl == null ? "--" : `${pl >= 0 ? "+" : "-"}${money(Math.abs(pl))}`}</span>
              {plPct != null && (
                <span className="text-xs font-semibold">
                  ({plPct >= 0 ? "+" : ""}{plPct.toFixed(1)}%)
                </span>
              )}
            </dd>
          </div>
        </dl>
        {sig && sigKind && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-snug" style={{ color: "var(--text)" }}>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${isBn ? "" : "uppercase tracking-wide"}`}
              style={{
                color: SIGNAL_VAR[sigKind],
                background: `color-mix(in srgb, ${SIGNAL_VAR[sigKind]} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${SIGNAL_VAR[sigKind]} 28%, transparent)`,
              }}
            >
              {isBn ? SIGNAL_LABELS_BN[sigKind] : SIGNAL_LABELS[sigKind]}
            </span>
            <span>{isBn ? sig.reason_bn : sig.reason_en}</span>
          </p>
        )}
      </div>
    );
  }

  // --- Watcher view ----------------------------------------------------------
  if (watched) {
    const m = meta[CODE];
    const addedAt = m?.added_at ? formatDate(m.added_at) : null;
    const base = m?.price_at_add ?? null;
    const movePct = base != null && base > 0 && ltp != null ? ((ltp - base) / base) * 100 : null;
    const moveColor = movePct == null ? "var(--text-muted)" : movePct >= 0 ? "var(--positive)" : "var(--negative)";

    return (
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 text-sm ${isBn ? "font-bn" : ""}`}
        lang={isBn ? "bn" : undefined}
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--primary)" }}>
          <IconStar size={14} />
          {T.watching[lang]}
        </span>
        {addedAt && (
          <span style={{ color: "var(--text-muted)" }}>
            {T.since[lang]} {addedAt}
          </span>
        )}
        {movePct != null && (
          <span className="font-bold tabular-nums nums" style={{ color: moveColor }}>
            {movePct >= 0 ? "+" : ""}{movePct.toFixed(1)}%{" "}
            <span className="font-medium" style={{ color: "var(--text-muted)" }}>{T.sinceAdded[lang]}</span>
          </span>
        )}
        <Link href="/watchlist" className="ml-auto text-xs font-semibold hover:underline" style={{ color: "var(--primary)" }}>
          {T.watchlist[lang]} →
        </Link>
      </div>
    );
  }

  return null;
}
