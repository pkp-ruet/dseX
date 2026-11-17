"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { ScoreItem, WatchlistNewsItem } from "@/lib/api";
import { KIND_WORD, readNotice, shortName, type Bi, type NoticeKind } from "@/lib/market-notices";
import { dayShort } from "@/components/dividend-calendar/dates";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { IconChevronDown, IconChevronRight } from "@/components/ui/icons";

/** Notices shown before "See all". */
const ROWS = 4;
/** At most this many in all (the bundle sends 30 days, newest first). */
const MAX_ROWS = 10;

/** Kinds the home already says elsewhere: results (Today for you's results
 *  row and the stories), board meetings (Your dates this week names the
 *  results meetings) and trading stopping / starting around a record date
 *  (the record date itself is in Your dates). */
const LEFT_OUT = new Set<NoticeKind>(["results", "board", "record"]);

/** Kinds that are a warning: their word reads amber. */
const WARN = new Set<NoticeKind>(["auditor"]);

interface Row {
  key: string;
  code: string;
  name: string;
  kind: NoticeKind;
  text: Bi;
  iso: string;
}

function daysFrom(fromIso: string, iso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** "Today" · "Yesterday" · "Mon 16 Nov". */
function dayWord(todayIso: string, iso: string): Bi {
  const d = daysFrom(todayIso, iso);
  if (d === 0) return { en: "Today", bn: "আজ" };
  if (d === -1) return { en: "Yesterday", bn: "গতকাল" };
  return dayShort(iso);
}

/**
 * "Latest on your shares" (2026-11-18, round 3 of the simple home, mockup
 * https://claude.ai/artifact/Bncp1qkKjyYs6ChfZpqV2e): the newest notices the
 * reader's companies (holdings ∪ watchlist) sent to DSE in the last 30 days,
 * as plain sentences — dividends sent or declared, the auditor's words,
 * director / sponsor trades, ratings, category changes, AGMs, people. Read by
 * the market page's own title reader (`lib/market-notices.ts` `readNotice`);
 * a title it can't read is left out, so nothing reaches the home in DSE's
 * wording. Newest first, one line per company and sentence, four shown, the
 * rest (up to ten) open in place. Each row opens that share's news. Free.
 * Data: the bundle's `news` — no request of its own.
 */
export default function ShareNotices({
  news,
  priceMap,
  held,
  watched,
  todayIso,
  lang,
}: {
  news: WatchlistNewsItem[];
  priceMap: Map<string, ScoreItem>;
  held: Set<string>;
  watched: Set<string>;
  /** Today in Dhaka, YYYY-MM-DD. */
  todayIso: string;
  lang: Lang;
}) {
  const [all, setAll] = useState(false);
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);

  const rows = useMemo(() => {
    const out: Row[] = [];
    const seen = new Set<string>();
    for (const n of news) {
      const code = (n.trading_code || "").trim().toUpperCase();
      const iso = (n.post_date || "").slice(0, 10);
      if (!code || !iso) continue;
      const read = readNotice(n.title, code);
      if (!read || LEFT_OUT.has(read.kind)) continue;
      const key = `${code}|${read.text.en}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, code, name: shortName(priceMap.get(code)?.company_name, code), kind: read.kind, text: read.text, iso });
      if (out.length >= MAX_ROWS) break;
    }
    return out;
  }, [news, priceMap]);

  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, ROWS);

  return (
    <section className={`hm-notes ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="notices">
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "আপনার শেয়ারের সর্বশেষ খবর" : "Latest on your shares"}</h2>
        <span className="hm-head-note">{bn ? "ডিএসইতে দেওয়া বিজ্ঞপ্তি · 30 দিন" : "Notices to DSE · 30 days"}</span>
      </div>
      <div className="hm-tcard">
        <ul className="hm-nlist" id="hm-nlist">
          {shown.map((r) => (
            <li key={r.key}>
              <Link href={`/stock/${encodeURIComponent(r.code)}#news`} className="hm-nrow">
                <span className="hm-nrow-txt">
                  <span className="hm-nrow-top">
                    <span className={`hm-kind${WARN.has(r.kind) ? " hm-kind--warn" : ""}`}>{pick(KIND_WORD[r.kind])}</span>
                    <span className="hm-nrow-co">{r.name}</span>
                    <OwnerMark code={r.code} held={held} watched={watched} lang={lang} />
                    <span className="hm-nrow-day nums">{pick(dayWord(todayIso, r.iso))}</span>
                  </span>
                  <span className="hm-nrow-text">{pick(r.text)}</span>
                </span>
                <span className="hm-chev" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {rows.length > ROWS && (
          <button
            type="button"
            className="hm-dmore"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            aria-controls="hm-nlist"
          >
            {all
              ? bn
                ? "কম দেখুন"
                : "Show fewer"
              : bn
                ? `সব ${rows.length}টি বিজ্ঞপ্তি দেখুন`
                : `See all ${rows.length} notices`}
            <IconChevronDown size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
