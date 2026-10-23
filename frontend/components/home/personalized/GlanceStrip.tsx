import Link from "next/link";
import type { ReactNode } from "react";
import type { CorporateActionEvent, DividendsUpcoming, MarketIndexData, ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct } from "@/lib/formatters";
import { recordDateInfo } from "@/lib/dividend-dates";
import { t } from "@/lib/home-copy";
import Stat from "@/components/ui/Stat";

type Tone = "default" | "positive" | "negative" | "muted";

function tone(v: number | null | undefined): Tone {
  if (v == null || v === 0) return "muted";
  return v > 0 ? "positive" : "negative";
}

const SM_COLS: Record<number, string> = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

function Tile({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex min-h-10 min-w-0 px-4 py-3 transition-colors hover:bg-surface-2 active:bg-surface-2 sm:px-5"
    >
      {children}
    </Link>
  );
}

/**
 * "Today at a glance" — four numbers under the hero that sum up the whole
 * page before the reader scrolls: the index, how many stocks rose vs fell,
 * how many of the reader's own stocks rose, and the next record date (their own stocks
 * first, else the market's). Number first, plain label under it (`ui/Stat`).
 * Each tile is a link to the page that explains it. A tile with no data is
 * left out; with fewer than two the strip renders nothing.
 */
export default function GlanceStrip({
  index,
  followedCodes,
  priceMap,
  dividends,
  calendarRows,
  when,
  lang = "en",
}: {
  index: MarketIndexData | null;
  /** Holdings ∪ watchlist (upper-case). The money hero already shows the
   *  portfolio's taka move, so this tile counts how many of them rose. */
  followedCodes: string[];
  priceMap: Map<string, ScoreItem>;
  /** The reader's own upcoming record dates. */
  dividends: DividendsUpcoming;
  /** Market-wide record dates inside the next two weeks. */
  calendarRows: CorporateActionEvent[];
  /** "last" before the open / on a closed day — the numbers are yesterday's. */
  when: "today" | "last";
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const last = when === "last";
  const tiles: ReactNode[] = [];

  if (index?.dsex != null) {
    tiles.push(
      <Tile key="dsex" href="/market-analysis">
        <Stat
          value={Math.round(index.dsex).toLocaleString("en-US")}
          label={t(lang, "glanceDsex")}
          sub={index.dsex_change_pct != null ? changePct(index.dsex_change_pct) : undefined}
          subTone={tone(index.dsex_change_pct)}
        />
      </Tile>,
    );
  }

  if (index?.up_count != null && index?.down_count != null) {
    tiles.push(
      <Tile key="breadth" href="/dse-today">
        <Stat
          value={
            <>
              <span className="text-positive">{index.up_count}</span>
              <span className="text-text-muted"> · </span>
              <span className="text-negative">{index.down_count}</span>
            </>
          }
          label={t(lang, last ? "glanceBreadthLast" : "glanceBreadth")}
        />
      </Tile>,
    );
  }

  if (followedCodes.length > 0) {
    const priced = followedCodes.map((c) => priceMap.get(c)).filter((s): s is ScoreItem => s?.change_pct != null);
    if (priced.length > 0) {
      const upN = priced.filter((s) => (s.change_pct ?? 0) > 0).length;
      tiles.push(
        <Tile key="mine" href="/watchlist">
          <Stat
            value={`${upN}/${priced.length}`}
            tone={upN * 2 >= priced.length ? "positive" : "negative"}
            label={t(lang, last ? "glanceYourDayLast" : "glanceYourDay")}
          />
        </Tile>,
      );
    }
  }

  // Next record date: the reader's own stocks first, then the market's.
  const own = dividends.upcoming_record_dates
    .map((d) => ({ code: d.trading_code, info: recordDateInfo(d.record_date) }))
    .filter((d) => d.info && d.info.recordDaysLeft >= 0)
    .sort((a, b) => a.info!.recordDaysLeft - b.info!.recordDaysLeft);
  const market = calendarRows
    .filter((r) => r.record_days_left != null && r.record_days_left >= 0)
    .sort((a, b) => (a.record_days_left ?? 0) - (b.record_days_left ?? 0))
    .map((r) => ({ code: r.trading_code, days: r.record_days_left as number }));
  const next = own[0] ? { code: own[0].code, days: own[0].info!.recordDaysLeft } : market[0] ?? null;
  if (next) {
    const inDays =
      next.days === 0
        ? t(lang, "glanceTodayWord")
        : next.days === 1
          ? t(lang, "glanceTomorrow")
          : t(lang, "glanceDaysLeft", { n: next.days });
    tiles.push(
      <Tile key="div" href={`/stock/${next.code}`}>
        <Stat value={next.code} label={t(lang, "glanceNextDividend")} sub={inDays} subTone="primary" />
      </Tile>,
    );
  }

  if (tiles.length < 2) return null;
  const odd = tiles.length % 2 === 1;

  return (
    <section
      aria-label={bn ? "এক নজরে" : "At a glance"}
      lang={bn ? "bn" : undefined}
      className={`soft-card dash-box grid grid-cols-2 divide-border overflow-hidden sm:divide-x ${SM_COLS[tiles.length]} ${bn ? "font-bn" : ""}`}
    >
      {tiles.map((tile, i) => (
        <div
          key={i}
          className={`min-w-0 ${i % 2 === 1 ? "border-l border-border sm:border-l-0" : ""} ${
            i >= 2 ? "border-t border-border sm:border-t-0" : ""
          } ${odd && i === tiles.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
        >
          {tile}
        </div>
      ))}
    </section>
  );
}
