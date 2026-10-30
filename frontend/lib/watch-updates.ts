/**
 * The watchlist's updates (2026-10-30, user: "a single needed page to get all
 * update about followed stocks … same to free and premium, the catch will be
 * the cap"). Pure: every update on the followed shares, built from data the
 * page already has — the scores (today's move), `GET /api/watchlist/updates`
 * (results, results meetings, dividends, grade changes), price alerts, the
 * near-yearly-high / low list and the news. Free facts only: no fair value,
 * no Buy / Sell reasons, no "what it means".
 *
 * Two lists: what happened (newest first) and what's coming (soonest first).
 * `top` picks one update per share for the table's "What's new" column.
 */

import type {
  NearExtremesData,
  PriceAlert,
  ScoreItem,
  WatchCalendarRow,
  WatchlistNewsItem,
  WatchlistUpdates,
} from "@/lib/api";
import { TIER_LABELS, TIER_LABELS_BN, type TierKey } from "@/lib/constants";
import { companyShort, money } from "@/lib/formatters";
import { classifyNews } from "@/lib/news-kind";
import { RESULT_LEVEL, resultMove } from "@/lib/results";
import { daysBetween, isoLocal, recordDateInfo, toDate, todayDhaka } from "@/lib/dividend-dates";
import { dayShort, type Pair } from "@/components/dividend-calendar/dates";

export type UpdateTone = "positive" | "negative" | "watch" | "primary" | "muted";

export type UpdateKind =
  | "alert_hit" | "results" | "grade" | "move" | "declared" | "high" | "low" | "news"
  | "board" | "record" | "agm" | "alert_near";

export interface WatchUpdate {
  id: string;
  code: string;
  name: string;
  kind: UpdateKind;
  side: "past" | "ahead";
  /** ISO day the update is about (past: when it happened; ahead: when it comes). */
  date: string;
  tone: UpdateTone;
  /** The small kind word ("Results", "Record date"). */
  label: Pair;
  /** One plain sentence. */
  title: Pair;
  /** An optional second line with the figures. */
  line?: Pair;
  /** Two or three words for the table's "What's new" cell. */
  short: Pair;
  href: string;
  /** Lower = matters more (the table cell shows the lowest). */
  rank: number;
}

export interface WatchUpdatesView {
  happened: WatchUpdate[];
  coming: WatchUpdate[];
  /** Every update per code, most important first. */
  byCode: Map<string, WatchUpdate[]>;
}

/** A move this big today is an update. */
export const BIG_MOVE_PCT = 3;
/** An armed alert this close to the price is an update. */
export const ALERT_NEAR_PCT = 3;
const ALERT_HIT_DAYS = 3;
const NEWS_DAYS = 3;
/** Inside this many days an update counts as "this week" for the table. */
const FRESH_DAYS = 7;

const pair = (en: string, bn: string): Pair => ({ en, bn });

function pctWord(v: number): string {
  return `${Math.abs(v).toFixed(1)}%`;
}

function perShare(v: number): string {
  return v >= 100 ? `৳${Math.round(v).toLocaleString("en-US")}` : `৳${v.toFixed(2)}`;
}

/** "৳13.00 a share in cash and 10% bonus shares" — what a dividend pays. */
function payWords(r: WatchCalendarRow): Pair | null {
  const cash = r.cash_per_share && r.cash_per_share > 0 ? r.cash_per_share : null;
  const bonus = r.stock_pct && r.stock_pct > 0 ? r.stock_pct : null;
  if (!cash && !bonus) return null;
  const en = [cash ? `${perShare(cash)} a share in cash` : "", bonus ? `${bonus}% bonus shares` : ""].filter(Boolean).join(" and ");
  const bn = [cash ? `শেয়ারপ্রতি ${perShare(cash)} নগদ` : "", bonus ? `${bonus}% বোনাস শেয়ার` : ""].filter(Boolean).join(" ও ");
  return pair(en, bn);
}

function dayWord(iso: string): Pair {
  return dayShort(iso);
}

/** Build every update. `today` is the Dhaka date (tests pass their own). */
export function buildWatchUpdates({
  rows,
  updates,
  alerts,
  news,
  extremes,
  today = todayDhaka(),
}: {
  rows: ScoreItem[];
  updates: WatchlistUpdates | null;
  alerts: PriceAlert[];
  news: WatchlistNewsItem[];
  extremes: NearExtremesData | null;
  today?: Date;
}): WatchUpdatesView {
  const todayIso = isoLocal(today);
  const byRow = new Map(rows.map((r) => [r.trading_code.toUpperCase(), r]));
  const codes = new Set(byRow.keys());
  const nameOf = (code: string, fallback?: string | null) =>
    companyShort(byRow.get(code)?.company_name ?? fallback) || code;
  const ago = (iso: string | null | undefined) => {
    const d = toDate(iso);
    return d ? daysBetween(d, today) : null;
  };
  const out: WatchUpdate[] = [];
  const add = (u: Omit<WatchUpdate, "id" | "name"> & { name?: string | null }) =>
    out.push({ ...u, id: `${u.kind}-${u.code}-${u.date}`, name: nameOf(u.code, u.name) });

  // ---- Price alerts: reached in the last few days, or close now ----
  for (const a of alerts) {
    const code = a.trading_code.toUpperCase();
    if (!codes.has(code)) continue;
    const row = byRow.get(code);
    if (!a.is_active && a.triggered_at) {
      const days = ago(a.triggered_at);
      if (days == null || days > ALERT_HIT_DAYS) continue;
      add({
        code, kind: "alert_hit", side: "past", date: a.triggered_at.slice(0, 10), tone: "primary", rank: 1,
        label: pair("Price alert", "দামের অ্যালার্ট"),
        title: pair(`It reached your price of ${money(a.target_price)}`, `আপনার ঠিক করা দাম ${money(a.target_price)}-এ পৌঁছেছে`),
        line: a.triggered_price != null
          ? pair(`It traded at ${money(a.triggered_price)}.`, `দাম ছিল ${money(a.triggered_price)}।`)
          : undefined,
        short: pair("Alert reached", "অ্যালার্টের দামে"),
        href: `/stock/${code}`,
      });
    } else if (a.is_active && row?.ltp != null && a.target_price > 0) {
      const gap = ((a.target_price - row.ltp) / a.target_price) * 100;
      if (Math.abs(gap) > ALERT_NEAR_PCT) continue;
      add({
        code, kind: "alert_near", side: "ahead", date: todayIso, tone: "primary", rank: 8,
        label: pair("Price alert", "দামের অ্যালার্ট"),
        title: pair(
          `${pctWord(gap)} away from your price of ${money(a.target_price)}`,
          `আপনার ঠিক করা দাম ${money(a.target_price)} থেকে ${pctWord(gap)} দূরে`,
        ),
        line: pair(`Now ${money(row.ltp)}. We tell you on the day it gets there.`, `এখন ${money(row.ltp)}। দামে পৌঁছালে সেদিনই জানাব।`),
        short: pair("Near your alert", "অ্যালার্টের কাছে"),
        href: `/stock/${code}`,
      });
    }
  }

  // ---- Today's price ----
  // The last trading day: on a Friday "today's" move is Thursday's.
  const priceDay = updates?.price_date ?? updates?.as_of ?? todayIso;
  for (const [code, r] of byRow) {
    const c = r.change_pct;
    if (c == null || Math.abs(c) < BIG_MOVE_PCT) continue;
    const up = c > 0;
    add({
      code, kind: "move", side: "past", date: priceDay, tone: up ? "positive" : "negative", rank: 4,
      label: pair("Price", "দাম"),
      title: up ? pair(`The price rose ${pctWord(c)} in a day`, `এক দিনে দাম ${pctWord(c)} বেড়েছে`) : pair(`The price fell ${pctWord(c)} in a day`, `এক দিনে দাম ${pctWord(c)} কমেছে`),
      line: r.ltp != null ? pair(`Now ${money(r.ltp)}.`, `এখন ${money(r.ltp)}।`) : undefined,
      short: up ? pair(`Up ${pctWord(c)}`, `বেড়েছে ${pctWord(c)}`) : pair(`Down ${pctWord(c)}`, `কমেছে ${pctWord(c)}`),
      href: `/stock/${code}`,
    });
  }
  const sides: ["near_high" | "near_low", "high" | "low"][] = [["near_high", "high"], ["near_low", "low"]];
  for (const [key, kind] of sides) {
    for (const it of extremes?.[key] ?? []) {
      const code = it.trading_code.toUpperCase();
      if (!codes.has(code)) continue;
      const high = kind === "high";
      const edge = high ? it.w52_high : it.w52_low;
      add({
        code, kind, side: "past", date: priceDay, tone: high ? "muted" : "watch", rank: 9,
        label: pair("Price this year", "এ বছরের দাম"),
        title: high
          ? pair("Close to its highest price of the past year", "গত এক বছরের সর্বোচ্চ দামের কাছে")
          : pair("Close to its lowest price of the past year", "গত এক বছরের সর্বনিম্ন দামের কাছে"),
        line: edge != null && it.ltp != null
          ? high
            ? pair(`Now ${money(it.ltp)}; the high is ${money(edge)}.`, `এখন ${money(it.ltp)}, সর্বোচ্চ ${money(edge)}।`)
            : pair(`Now ${money(it.ltp)}; the low is ${money(edge)}.`, `এখন ${money(it.ltp)}, সর্বনিম্ন ${money(edge)}।`)
          : undefined,
        short: high ? pair("Near yearly high", "বছরের সর্বোচ্চের কাছে") : pair("Near yearly low", "বছরের সর্বনিম্নের কাছে"),
        href: `/stock/${code}`,
      });
    }
  }

  // ---- Results posted, and results due ----
  for (const r of updates?.results ?? []) {
    const code = r.code.toUpperCase();
    if (!codes.has(code)) continue;
    const lv = RESULT_LEVEL[r.level];
    const mv = resultMove(r);
    const days = ago(r.post_date);
    add({
      code, name: r.name, kind: "results", side: "past", date: r.post_date.slice(0, 10),
      tone: lv.tone === "muted" ? "muted" : lv.tone === "positive" ? "positive" : lv.tone === "negative" ? "negative" : "watch",
      rank: days != null && days <= FRESH_DAYS ? 2 : 11,
      label: pair("Results", "আর্থিক ফল"),
      title: pair(r.headline_en, r.headline_bn),
      line: r.profit_en ? pair(r.profit_en, r.profit_bn || r.profit_en) : undefined,
      short: pair(`Results · ${mv.en}`, `ফল · ${mv.bn}`),
      href: `/stock/${code}#results`,
    });
  }
  for (const m of updates?.coming_results ?? []) {
    const code = m.code.toUpperCase();
    if (!codes.has(code)) continue;
    const d = toDate(m.date);
    const days = d ? daysBetween(today, d) : m.days;
    if (days < 0) continue;
    const when = dayWord(m.date);
    add({
      code, name: m.name, kind: "board", side: "ahead", date: m.date, tone: "primary",
      rank: days <= FRESH_DAYS ? 6 : 15,
      label: pair("Results due", "ফল আসছে"),
      title: pair(`${m.label_en} are due`, `${m.label_bn} আসছে`),
      line: pair(`The board meets on ${when.en} to approve them.`, `${when.bn} বোর্ড সভায় তা অনুমোদন হবে।`),
      short: pair(`Results ${dayShort(m.date).en.slice(4)}`, `ফল ${when.bn.split(", ")[1] ?? when.bn}`),
      href: `/stock/${code}`,
    });
  }

  // ---- Grade changes ----
  for (const [rawCode, changes] of Object.entries(updates?.grades ?? {})) {
    const code = rawCode.toUpperCase();
    if (!codes.has(code)) continue;
    const ch = changes[0];
    if (!ch) continue;
    const order: TierKey[] = ["weak", "average", "good", "excellent"];
    const rose = order.indexOf(ch.to_tier) > order.indexOf(ch.from_tier);
    const fromEn = TIER_LABELS[ch.from_tier] ?? ch.from_tier;
    const toEn = TIER_LABELS[ch.to_tier] ?? ch.to_tier;
    const fromBn = TIER_LABELS_BN[ch.from_tier] ?? ch.from_tier;
    const toBn = TIER_LABELS_BN[ch.to_tier] ?? ch.to_tier;
    const scores = ch.from_score != null && ch.to_score != null
      ? pair(`Its score went from ${Math.round(ch.from_score)} to ${Math.round(ch.to_score)} out of 100.`,
             `স্কোর ${Math.round(ch.from_score)} থেকে ${Math.round(ch.to_score)} হয়েছে (100-এর মধ্যে)।`)
      : undefined;
    add({
      code, kind: "grade", side: "past", date: ch.date, tone: rose ? "positive" : "negative", rank: 3,
      label: pair("Grade", "গ্রেড"),
      title: rose
        ? pair(`Its grade rose from ${fromEn} to ${toEn}`, `গ্রেড ${fromBn} থেকে বেড়ে ${toBn} হয়েছে`)
        : pair(`Its grade fell from ${fromEn} to ${toEn}`, `গ্রেড ${fromBn} থেকে কমে ${toBn} হয়েছে`),
      line: scores,
      short: pair(`Now ${toEn}`, `এখন ${toBn}`),
      href: `/stock/${code}#ch-company`,
    });
  }

  // ---- Dividends: declared, record dates, AGMs ----
  for (const r of updates?.declared ?? []) {
    const code = r.trading_code.toUpperCase();
    if (!codes.has(code) || !r.declaration_date) continue;
    const pay = payWords(r);
    const type = r.dividend_type ? r.dividend_type.toLowerCase() : "";
    const typeBn = type === "interim" ? "অন্তর্বর্তী" : type === "final" ? "চূড়ান্ত" : "";
    const days = ago(r.declaration_date);
    const rd = r.record_date ? dayWord(r.record_date) : null;
    add({
      code, name: r.company_name, kind: "declared", side: "past", date: r.declaration_date.slice(0, 10),
      tone: pay ? "positive" : "watch", rank: days != null && days <= FRESH_DAYS ? 5 : 12,
      label: pair("Dividend", "ডিভিডেন্ড"),
      title: pay
        ? pair(`Declared a${type === "interim" ? "n" : ""} ${type ? `${type} ` : ""}dividend: ${pay.en}`,
               `${typeBn ? `${typeBn} ` : ""}ডিভিডেন্ড ঘোষণা: ${pay.bn}`)
        : pair("Declared no dividend this time", "এবার কোনো ডিভিডেন্ড ঘোষণা করেনি"),
      line: rd ? pair(`Record date ${rd.en}.`, `রেকর্ড ডেট ${rd.bn}।`) : undefined,
      short: pay ? pair("Dividend declared", "ডিভিডেন্ড ঘোষণা") : pair("No dividend", "ডিভিডেন্ড নেই"),
      href: `/stock/${code}#dividends`,
    });
  }
  for (const r of updates?.record_dates ?? []) {
    const code = r.trading_code.toUpperCase();
    if (!codes.has(code) || !r.record_date) continue;
    const info = recordDateInfo(r.record_date, today);
    if (!info || info.recordDaysLeft < 0) continue;
    const pay = payWords(r);
    if (!pay) continue;
    const rd = dayWord(r.record_date);
    const buyBy = dayWord(isoLocal(info.buyBy));
    const canBuy = info.buyDaysLeft >= 0;
    add({
      code, name: r.company_name, kind: "record", side: "ahead", date: r.record_date.slice(0, 10),
      tone: "positive", rank: canBuy && info.buyDaysLeft <= FRESH_DAYS ? 7 : 13,
      label: pair("Record date", "রেকর্ড ডেট"),
      title: pair(`Pays ${pay.en}`, `দেবে ${pay.bn}`),
      line: canBuy
        ? pair(`Record date ${rd.en}. To get it, own the shares by buying on or before ${buyBy.en}.`,
               `রেকর্ড ডেট ${rd.bn}। পেতে হলে ${buyBy.bn}-এর মধ্যে কিনে রাখুন।`)
        : pair(`Record date ${rd.en}. It is too late to buy for this one.`, `রেকর্ড ডেট ${rd.bn}। এবার কেনার সময় শেষ।`),
      short: canBuy
        ? pair(`Buy by ${buyBy.en.slice(4)}`, `কেনার শেষ দিন ${buyBy.bn.split(", ")[1] ?? buyBy.bn}`)
        : pair(`Record date ${rd.en.slice(4)}`, `রেকর্ড ডেট ${rd.bn.split(", ")[1] ?? rd.bn}`),
      href: `/stock/${code}#dividends`,
    });
  }
  for (const r of updates?.agms ?? []) {
    const code = r.trading_code.toUpperCase();
    if (!codes.has(code) || !r.agm_date) continue;
    const d = toDate(r.agm_date);
    if (!d || daysBetween(today, d) < 0) continue;
    const when = dayWord(r.agm_date);
    add({
      code, name: r.company_name, kind: "agm", side: "ahead", date: r.agm_date.slice(0, 10), tone: "muted", rank: 14,
      label: pair("AGM", "এজিএম"),
      title: pair(`Annual general meeting on ${when.en}`, `${when.bn} বার্ষিক সাধারণ সভা (এজিএম)`),
      line: pair("Shareholders vote on the dividend there.", "সেখানে শেয়ারহোল্ডাররা ডিভিডেন্ড অনুমোদন করেন।"),
      short: pair(`AGM ${when.en.slice(4)}`, `এজিএম ${when.bn.split(", ")[1] ?? when.bn}`),
      href: `/stock/${code}#dividends`,
    });
  }

  // ---- News: the newest notice per share from the last few days, unless a
  //      results or dividend update above already says it ----
  const said = new Set(out.filter((u) => u.kind === "results" || u.kind === "declared").map((u) => u.code));
  const newsSeen = new Set<string>();
  for (const n of news) {
    const code = n.trading_code.toUpperCase();
    if (!codes.has(code) || newsSeen.has(code)) continue;
    const days = ago(n.post_date);
    if (days == null || days > NEWS_DAYS) continue;
    const k = classifyNews(n.title);
    if (said.has(code) && (k.key === "dividend" || k.key === "earnings")) continue;
    newsSeen.add(code);
    add({
      code, kind: "news", side: "past", date: n.post_date.slice(0, 10), tone: "muted", rank: 10,
      label: pair(k.label, k.labelBn),
      title: pair(n.title, n.title),
      short: days === 0 ? pair("News today", "আজ খবর") : pair("New notice", "নতুন খবর"),
      href: "#wl-news",
    });
  }

  const happened = out.filter((u) => u.side === "past").sort((a, b) => b.date.localeCompare(a.date) || a.rank - b.rank);
  const coming = out.filter((u) => u.side === "ahead").sort((a, b) => a.date.localeCompare(b.date) || a.rank - b.rank);
  const byCode = new Map<string, WatchUpdate[]>();
  for (const u of [...out].sort((a, b) => a.rank - b.rank)) {
    const list = byCode.get(u.code) ?? [];
    list.push(u);
    byCode.set(u.code, list);
  }
  return { happened, coming, byCode };
}

/** "Today" / "Yesterday" / "Thu 30 Oct" for something that happened;
 *  "Today" / "Tomorrow" / "In 5 days" for something ahead. */
export function whenWords(u: Pick<WatchUpdate, "side" | "date">, today = todayDhaka()): Pair {
  const d = toDate(u.date);
  if (!d) return pair("", "");
  const n = daysBetween(today, d);
  if (n === 0) return pair("Today", "আজ");
  if (u.side === "past") {
    if (n === -1) return pair("Yesterday", "গতকাল");
    return dayShort(u.date);
  }
  if (n === 1) return pair("Tomorrow", "আগামীকাল");
  return pair(`In ${n} days`, `${n} দিন পর`);
}
