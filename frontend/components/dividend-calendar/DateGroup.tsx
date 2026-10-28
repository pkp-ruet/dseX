import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import DividendRow from "@/components/dividend-calendar/DividendRow";
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

/**
 * The free rows and the locked rows as date groups. When one date runs past
 * the free rows, its free half is marked `split` and its locked half `cont`:
 * for a Premium reader the CSS joins the two into one card and hides the
 * repeated head (`.dc-gate` in app/styles/dividends.css).
 */
export function splitGroups(
  free: CorporateActionEvent[],
  locked: CorporateActionEvent[],
  key: "record_date" | "agm_date",
) {
  const freeGroups = groupByDate(free, key);
  const lockedGroups = groupByDate(locked, key);
  const cont =
    freeGroups.length > 0 && lockedGroups.length > 0 && freeGroups[freeGroups.length - 1].date === lockedGroups[0].date;
  return { freeGroups, lockedGroups, cont };
}

/** One date as one card: its head, then every company on it. */
export default function DateGroup({
  date,
  items,
  kind,
  mark,
  part,
}: {
  date: string;
  items: CorporateActionEvent[];
  kind: Kind;
  mark?: (code: string) => ReactNode;
  /** split = a date whose rest is behind the lock · cont = that rest. */
  part?: "split" | "cont";
}) {
  const days = kind === "agm" ? items[0].agm_days_left : items[0].record_days_left;
  return (
    <article className={`soft-card dc-day ${part ? `dc-day--${part}` : ""}`.trim()}>
      <DateHead iso={date} days={days} kind={kind} first={items[0]} count={items.length} />
      <ul className="dc-list">
        {items.map((e) => (
          <li key={`${e.trading_code}-${date}`}>
            <DividendRow e={e} mode={kind} mark={mark?.(e.trading_code)} />
          </li>
        ))}
      </ul>
    </article>
  );
}
