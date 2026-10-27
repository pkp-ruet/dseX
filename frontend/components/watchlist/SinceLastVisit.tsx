"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiVisitWatchlist, type ScoreItem, type WatchlistNewsItem } from "@/lib/api";
import { changePct, changeTone } from "@/lib/formatters";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";

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

const BN_WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

function sinceLabel(prevMs: number): { en: string; bn: string } {
  const d = new Date(prevMs);
  const today = new Date();
  const dayMs = 24 * 3600 * 1000;
  const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / dayMs);
  if (diffDays <= 0) return { en: "earlier today", bn: "আজই" };
  if (diffDays === 1) return { en: "yesterday", bn: "গতকাল" };
  if (diffDays < 7) return { en: d.toLocaleDateString("en-GB", { weekday: "long" }), bn: BN_WEEKDAYS[d.getDay()] };
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { en: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), bn: bnDate(iso) };
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
    en.push(`${n} ${n === 1 ? "share" : "shares"} moved more than ${BIG_MOVE_PCT}% today`);
    bn.push(`${n}টি শেয়ারের দাম আজ ${BIG_MOVE_PCT}%-এর বেশি ওঠানামা করেছে`);
  }
  if (divs.length > 0) {
    const n = divs.length;
    en.push(`${n} dividend ${n === 1 ? "date" : "dates"} coming up`);
    bn.push(`সামনে ${n}টি ডিভিডেন্ডের তারিখ`);
  }

  const lead = movers[0];
  const since = sinceLabel(prevMs);
  const leadLink = lead && (
    <>
      <Link
        prefetch={false}
        href={`/stock/${lead.trading_code}`}
        className="font-semibold text-primary-ink hover:underline"
      >
        {lead.trading_code}
      </Link>{" "}
      <span className={`font-semibold nums ${changeTone(lead.change_pct)}`}>{changePct(lead.change_pct, 1)}</span>
    </>
  );

  return (
    <div className="soft-card wl-note" role="status">
      <svg className="wl-note-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <div className="wl-note-body">
        <p className="wl-note-text">
          <T
            en={
              <>
                <span className="font-semibold">Since {since.en}:</span> {joinEn(en)}.
                {leadLink && <> The biggest move was {leadLink}.</>}
              </>
            }
            bn={
              <>
                <span className="font-semibold">শেষবার {since.bn} দেখার পর:</span> {bn.join(", ")}।
                {leadLink && <> সবচেয়ে বেশি ওঠানামা {leadLink}।</>}
              </>
            }
          />
        </p>
      </div>
    </div>
  );
}
