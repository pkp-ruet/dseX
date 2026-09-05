"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiVisitWatchlist, type ScoreItem, type WatchlistNewsItem } from "@/lib/api";

interface Props {
  codes: string[];
  /** Resolved score rows for the watched codes (already fetched by the table). */
  rows: ScoreItem[];
  /** Watchlist news (already fetched by the table). */
  news: WatchlistNewsItem[];
  /** Codes with a dividend event (declaration / record date) in the next 14 days. */
  dividendSoon: Set<string>;
}

const BIG_MOVE_PCT = 3;
/** A visit this recent is the same sitting — don't narrate it back. */
const SAME_SITTING_MS = 30 * 60 * 1000;

function joinEn(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function sinceLabel(prevMs: number): string {
  const d = new Date(prevMs);
  const today = new Date();
  const dayMs = 24 * 3600 * 1000;
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / dayMs);
  if (diffDays <= 0) return "earlier today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * One calm line at the top of the watchlist: what happened on the followed
 * stocks since the user last opened this page. Records the visit server-side
 * (`POST /api/user/watchlist/visit`) — the same timestamp the navbar's
 * "new activity" dot compares news against, so opening the page clears it.
 * Renders nothing on a first visit, on a same-sitting reload, or when there is
 * nothing new to say.
 */
export default function SinceLastVisit({ codes, rows, news, dividendSoon }: Props) {
  const [prevMs, setPrevMs] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const pinged = useRef(false);

  useEffect(() => {
    if (pinged.current || codes.length === 0) return;
    pinged.current = true;
    apiVisitWatchlist()
      .then((res) => {
        const t = res.previous_visit_at ? Date.parse(res.previous_visit_at) : NaN;
        setPrevMs(Number.isFinite(t) ? t : null);
      })
      .catch(() => setPrevMs(null))
      .finally(() => setReady(true));
  }, [codes.length]);

  const delta = useMemo(() => {
    if (prevMs == null) return null;
    const freshNews = news.filter((n) => Date.parse(n.post_date) > prevMs);
    const movers = rows
      .filter((r) => r.change_pct != null && Math.abs(r.change_pct) >= BIG_MOVE_PCT)
      .sort((a, b) => Math.abs(b.change_pct!) - Math.abs(a.change_pct!));
    const divs = codes.filter((c) => dividendSoon.has(c.toUpperCase()));
    return { freshNews, movers, divs };
  }, [prevMs, news, rows, codes, dividendSoon]);

  if (!ready || prevMs == null || !delta) return null;
  if (Date.now() - prevMs < SAME_SITTING_MS) return null;

  const { freshNews, movers, divs } = delta;
  if (freshNews.length === 0 && movers.length === 0 && divs.length === 0) return null;

  const en: string[] = [];
  const bn: string[] = [];
  if (freshNews.length > 0) {
    const n = freshNews.length;
    en.push(`${n} news ${n === 1 ? "item" : "items"}`);
    bn.push(`${n}টি নতুন খবর`);
  }
  if (movers.length > 0) {
    const n = movers.length;
    en.push(`${n} ${n === 1 ? "stock" : "stocks"} moved more than ${BIG_MOVE_PCT}% today`);
    bn.push(`${n}টি স্টক আজ ${BIG_MOVE_PCT}%-এর বেশি নড়েছে`);
  }
  if (divs.length > 0) {
    const n = divs.length;
    en.push(`${n} dividend ${n === 1 ? "date" : "dates"} coming up`);
    bn.push(`${n}টি ডিভিডেন্ডের তারিখ সামনে`);
  }

  const lead = movers[0];

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 25%, var(--border))",
        background: "color-mix(in srgb, var(--primary) 6%, var(--surface))",
      }}
      role="status"
    >
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--primary)]"
        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        aria-hidden
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-[var(--text)]">
          <span className="font-bold">Since {sinceLabel(prevMs)}:</span> {joinEn(en)}.
          {lead && (
            <>
              {" "}
              Biggest move{" "}
              <Link
                prefetch={false}
                href={`/stock/${lead.trading_code}`}
                className="font-bold text-[var(--primary)] hover:underline"
              >
                {lead.trading_code}
              </Link>{" "}
              <span
                className="font-bold nums"
                style={{ color: lead.change_pct! > 0 ? "var(--positive)" : "var(--negative)" }}
              >
                {lead.change_pct! > 0 ? "+" : ""}
                {lead.change_pct!.toFixed(1)}%
              </span>
              .
            </>
          )}
        </p>
        <p lang="bn" className="font-bn mt-0.5 text-[13px] font-medium leading-snug text-[var(--text-muted)]">
          শেষবার দেখার পর: {bn.join(", ")}।
        </p>
      </div>
    </div>
  );
}
