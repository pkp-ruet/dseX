import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import DividendRow from "@/components/dividend-calendar/DividendRow";
import CalendarFold from "@/components/dividend-calendar/CalendarFold";
import { dayParts, dayShort, daysWords, type Pair } from "@/components/dividend-calendar/dates";
import type { CorporateActionEvent } from "@/lib/api";

type Kind = "record" | "agm";
type Tone = "positive" | "watch" | "negative";

/** Events that share a date, in the order they came (the backend sorts by date). */
export function groupByDate(
  events: CorporateActionEvent[],
  key: "record_date" | "agm_date",
): { date: string; items: CorporateActionEvent[] }[] {
  const out: { date: string; items: CorporateActionEvent[] }[] = [];
  for (const e of events) {
    const d = e[key];
    if (!d) continue;
    const last = out[out.length - 1];
    if (last && last.date === d) last.items.push(e);
    else out.push({ date: d, items: [e] });
  }
  return out;
}

/** How many events fall on each date — a date card says how many companies
 *  are on it in all. */
export function countByDate(events: CorporateActionEvent[], key: "record_date" | "agm_date"): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) {
    const d = e[key];
    if (d) out.set(d, (out.get(d) ?? 0) + 1);
  }
  return out;
}

/** The eligibility answer for a record date, from the last normal-market buy
 *  day (the same for every company on that date). */
export function buyByLine(e: CorporateActionEvent): { tone: Tone; text: Pair } | null {
  if (e.buy_days_left == null || !e.buy_by) return null;
  const d = dayShort(e.buy_by);
  if (e.buy_days_left > 1) {
    return {
      tone: "positive",
      text: {
        en: `Last day to buy: ${d.en} · ${e.buy_days_left} days left`,
        bn: `কেনার শেষ দিন: ${d.bn} · আর ${e.buy_days_left} দিন`,
      },
    };
  }
  if (e.buy_days_left === 1) {
    return { tone: "watch", text: { en: `Last day to buy: tomorrow, ${d.en}`, bn: `কেনার শেষ দিন: আগামীকাল, ${d.bn}` } };
  }
  if (e.buy_days_left === 0) {
    return { tone: "watch", text: { en: "Last day to buy in the normal market: today", bn: "সাধারণ বাজারে কেনার শেষ দিন: আজ" } };
  }
  return {
    tone: "negative",
    text: { en: "Normal market closed. Spot market only now.", bn: "সাধারণ বাজারে কেনার সময় শেষ। এখন শুধু স্পট মার্কেট।" },
  };
}

/** A page-of-the-calendar tile: short month over the day number. */
export function DateTile({ iso, soon = false, small = false }: { iso: string; soon?: boolean; small?: boolean }) {
  const p = dayParts(iso);
  if (!p) return null;
  return (
    <span className={`dc-tile ${soon ? "dc-tile--soon" : ""} ${small ? "dc-tile--sm" : ""}`.trim()} aria-hidden="true">
      <span className="dc-tile-m">
        <T en={p.month.en} bn={p.month.bn} />
      </span>
      <span className="dc-tile-d">{p.day}</span>
    </span>
  );
}

/**
 * The head of one date: the tile, the weekday with how far away it is, and —
 * for a record date — the last day to buy, toned by how much time is left.
 * `flush` = inside a card that holds several dates (the dashboard card).
 */
export function DateHead({
  iso,
  days,
  kind,
  first,
  count,
  flush = false,
}: {
  iso: string;
  days: number | null | undefined;
  kind: Kind;
  /** Any event on this date — the buy-by day is the same for all of them. */
  first: CorporateActionEvent;
  count: number;
  flush?: boolean;
}) {
  const p = dayParts(iso);
  const when = daysWords(days);
  const buy = kind === "record" ? buyByLine(first) : null;
  const full = dayShort(iso);
  const label: Pair =
    kind === "agm"
      ? { en: `AGM on ${full.en}`, bn: `এজিএম ${full.bn}` }
      : { en: `Record date ${full.en}`, bn: `রেকর্ড ডেট ${full.bn}` };
  return (
    <div className={`dc-day-head ${flush ? "dc-day-head--flush" : ""}`.trim()}>
      <DateTile iso={iso} soon={days != null && days >= 0 && days <= 1} small={flush} />
      <div className="dc-day-text">
        <p className="dc-day-title">
          {/* Screen readers get the whole date; the tile is aria-hidden. */}
          <span className="sr-only">
            <T en={label.en} bn={label.bn} />
          </span>
          <span aria-hidden="true">{p && <T en={p.weekday.en} bn={p.weekday.bn} />}</span>
          {when && (
            <span className="dc-day-when">
              {" · "}
              <T en={when.en} bn={when.bn} />
            </span>
          )}
        </p>
        {buy && (
          <p className={`dc-day-sub dc-tone--${buy.tone}`}>
            <T en={buy.text.en} bn={buy.text.bn} />
          </p>
        )}
      </div>
      {count > 1 && (
        <span className="dc-day-n">
          <T en={`${count} companies`} bn={`${count}টি কোম্পানি`} />
        </span>
      )}
    </div>
  );
}

/** How many dates open before the fold: dates until about `rows` companies
 *  are on screen (at least one date), so this week's dates are always open. */
function foldAt(groups: { items: CorporateActionEvent[] }[], rows = 10): number {
  let n = 0;
  let seen = 0;
  while (n < groups.length && (n === 0 || seen < rows)) seen += groups[n++].items.length;
  return n;
}

/**
 * Every date as one compact card (2026-10-29): the dates follow each other
 * split by hairlines, each head a small date tile with the weekday and — for
 * a record date — the last day to buy, its companies under it. The first
 * ~10 companies' dates are open; the rest wait behind one "Show N more dates"
 * row (still in the HTML). `footer` closes the card (the no-dividend fold).
 */
export default function DateBoard({
  events,
  kind,
  footer,
}: {
  events: CorporateActionEvent[];
  kind: Kind;
  footer?: ReactNode;
}) {
  const key = kind === "agm" ? "agm_date" : "record_date";
  const perDate = countByDate(events, key);
  const groups = groupByDate(events, key);
  const open = foldAt(groups);
  const hiddenDates = groups.length - open;
  const hiddenRows = groups.slice(open).reduce((n, g) => n + g.items.length, 0);

  const items = groups.map((g) => (
    <div key={g.date} className="dc-group">
      <DateHead
        iso={g.date}
        days={kind === "agm" ? g.items[0].agm_days_left : g.items[0].record_days_left}
        kind={kind}
        first={g.items[0]}
        count={perDate.get(g.date) ?? g.items.length}
        flush
      />
      <ul className="dc-list">
        {g.items.map((e) => (
          <li key={`${e.trading_code}-${g.date}`}>
            <DividendRow e={e} mode={kind} />
          </li>
        ))}
      </ul>
    </div>
  ));

  return (
    <div className="soft-card dc-board">
      <CalendarFold
        items={items}
        initial={open}
        more={{
          en: `Show ${hiddenDates} more dates · ${hiddenRows} companies`,
          bn: `আরও ${hiddenDates}টি তারিখ দেখুন · ${hiddenRows}টি কোম্পানি`,
        }}
      />
      {footer}
    </div>
  );
}
