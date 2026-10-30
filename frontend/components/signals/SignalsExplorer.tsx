"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ScoreItem, SignalsToday } from "@/lib/api";
import StarButton from "@/components/ui/StarButton";
import StockRow from "@/components/ui/StockRow";
import TierPill from "@/components/ui/TierPill";
import PriceWord from "@/components/ui/PriceWord";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { IconCrown } from "@/components/ui/icons";
import { trackEvent } from "@/lib/track";
import { PersonalMark, usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { formatDate, money } from "@/lib/formatters";
import { PRICE_WORDS, priceWordKey, type PriceWordKey } from "@/lib/constants";
import { useLang } from "@/context/LangContext";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import { bnDate, sectorBn } from "@/lib/bn";

type BuyInfo = SignalsToday["buys"][string];
type Filter = "all" | PriceWordKey | "mine";
type SortKey = "best" | "gainers" | "losers" | "dividend";

interface Props {
  /** Every Buy today, in the page's order (very low price first, then by score). */
  buy: ScoreItem[];
  sectors: string[];
  /** Each Buy's price word, range and Premium part (`/api/signals/today`). */
  info?: Record<string, BuyInfo>;
  /** The one row whose Premium part is open for everyone, tagged "Free sample". */
  sampleCode?: string | null;
  /** The page's one Premium card (`PageQuestions`), placed inside the list
   *  after row `SPLIT` for a free reader, after the list for a Premium one. */
  premiumCard?: ReactNode;
}

/** `<option>` holds plain text only, so the menu reads the language through `useLang()`. */
const SORT_LABELS: Record<SortKey, { en: string; bn: string }> = {
  best: { en: "Lowest price first", bn: "সবচেয়ে কম দাম আগে" },
  gainers: { en: "Rose most today", bn: "আজ সবচেয়ে বেশি বেড়েছে" },
  losers: { en: "Fell most today", bn: "আজ সবচেয়ে বেশি কমেছে" },
  dividend: { en: "Dividend yield", bn: "ডিভিডেন্ড ইল্ড" },
};

const WORD_ORDER: PriceWordKey[] = ["very_low", "low", "fair"];
/** Rows shown before "Show all" (2026-10-31: the list was long and everything
 *  under it — the Premium card, almost on the list — went unseen). */
const INITIAL = 10;
/** A free reader meets the Premium card after this many rows. */
const SPLIT = 5;

const num = (v: number | null | undefined, fallback: number) => (v == null ? fallback : v);

function wordOf(item: ScoreItem, info?: BuyInfo): PriceWordKey {
  return info?.price_word ?? priceWordKey(item.signal) ?? "low";
}

function sortItems(list: ScoreItem[], sort: SortKey, info: Record<string, BuyInfo>): ScoreItem[] {
  const arr = [...list];
  switch (sort) {
    case "gainers":
      return arr.sort((a, b) => num(b.change_pct, -Infinity) - num(a.change_pct, -Infinity));
    case "losers":
      return arr.sort((a, b) => num(a.change_pct, Infinity) - num(b.change_pct, Infinity));
    case "dividend":
      return arr.sort((a, b) => num(b.div_yield_pct, -1) - num(a.div_yield_pct, -1));
    default:
      // Very low price first, then low, then fair; inside each, by grade score.
      return arr.sort(
        (a, b) =>
          WORD_ORDER.indexOf(wordOf(a, info[a.trading_code])) - WORD_ORDER.indexOf(wordOf(b, info[b.trading_code])) ||
          num(b.score, -1) - num(a.score, -1),
      );
  }
}

/**
 * The list (2026-10-31 redesign): price-word chips (All · Very low · Low ·
 * Fair · Your shares), one quiet search + sector + order bar, and ONE card of
 * calm rows. Every row is free: name, ticker, grade, price word, price, where
 * the price sits this year and the cash yield. Premium's part sits under each
 * row (`Locked`): three plain facts on why it is here, our buy price, the price
 * where it stops being a Buy, and since when.
 */
export default function SignalsExplorer({ buy, sectors, info = {}, sampleCode = null, premiumCard }: Props) {
  const params = useUrlParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState<SortKey>("best");
  const [showAll, setShowAll] = useState(false);
  const open = usePremiumOpen();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const { lang } = useLang();
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);

  // Read the view from the URL once (a shared link opens the same view).
  useEffect(() => {
    if (!params) return;
    const p = params.get("price");
    if (p === "very_low" || p === "low" || p === "fair" || p === "mine") setFilter(p);
    const s = params.get("sort");
    if (s === "gainers" || s === "losers" || s === "dividend") setSort(s);
    const sec = params.get("sector");
    if (sec && sectors.includes(sec)) setSector(sec);
  }, [params, sectors]);
  useUrlSync(
    { price: filter === "all" ? null : filter, sort: sort === "best" ? null : sort, sector: sector === "all" ? null : sector },
    params != null,
  );

  useEffect(() => {
    setShowAll(false);
  }, [filter, query, sector, sort]);

  const isMine = (c: string) => portfolio.has(c.toUpperCase()) || watchlist.has(c.toUpperCase());
  const counts = useMemo(() => {
    const c: Record<PriceWordKey, number> = { very_low: 0, low: 0, fair: 0 };
    for (const i of buy) c[wordOf(i, info[i.trading_code])] += 1;
    return c;
  }, [buy, info]);
  const mineCount = buy.filter((i) => isMine(i.trading_code)).length;

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    const list = buy.filter((item) => {
      if (filter === "mine" && !isMine(item.trading_code)) return false;
      if (filter !== "all" && filter !== "mine" && wordOf(item, info[item.trading_code]) !== filter) return false;
      if (sector !== "all" && item.sector !== sector) return false;
      if (q) {
        const code = item.trading_code.toUpperCase();
        const name = (item.company_name ?? "").toUpperCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
    return sortItems(list, sort, info);
  }, [buy, info, filter, query, sector, sort, portfolio, watchlist]);

  const shown = showAll ? filtered : filtered.slice(0, INITIAL);
  // Free readers: rows 1–5, the Premium card, then the rest. Premium: one card.
  const head = open ? shown : shown.slice(0, SPLIT);
  const tail = open ? [] : shown.slice(SPLIT);
  const more =
    filtered.length > shown.length ? (
      <div className="flex justify-center pb-3 pt-2">
        <Button variant="quiet" onClick={() => setShowAll(true)}>
          <T en={`Show all ${filtered.length}`} bn={`সব ${filtered.length}টি দেখুন`} />
        </Button>
      </div>
    ) : null;
  const row = (item: ScoreItem) => (
    <SignalRow
      key={item.trading_code}
      item={item}
      info={info[item.trading_code]}
      sample={item.trading_code === sampleCode}
      locked={!open}
    />
  );
  const isFiltered = query.trim() !== "" || sector !== "all";

  return (
    <div>
      <div className="sg-chips" role="group" aria-label={L("Filter by price", "দাম অনুযায়ী বাছুন")}>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          <T en={`All ${buy.length}`} bn={`সব ${buy.length}`} />
        </Chip>
        {WORD_ORDER.filter((k) => counts[k] > 0).map((k) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
            <T en={`${PRICE_WORDS[k].en} ${counts[k]}`} bn={`${PRICE_WORDS[k].bn} ${counts[k]}`} />
          </Chip>
        ))}
        {mineCount > 0 && (
          <Chip active={filter === "mine"} onClick={() => setFilter("mine")}>
            <T en={`Your shares ${mineCount}`} bn={`আপনার শেয়ার ${mineCount}`} />
          </Chip>
        )}
      </div>

      <div className="sg-filters">
        <div className="sg-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="sg-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("Search company or code", "কোম্পানি বা কোড খুঁজুন")}
            aria-label={L("Search companies", "কোম্পানি খুঁজুন")}
            className="sg-input"
          />
        </div>
        <select
          id="sg-sector"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label={L("Filter by sector", "সেক্টর অনুযায়ী বাছুন")}
          className="sg-input sg-select"
        >
          <option value="all">{L("All sectors", "সব সেক্টর")}</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {bn ? sectorBn(s) : s}
            </option>
          ))}
        </select>
        <select
          id="sg-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label={L("Order", "সাজানো")}
          className="sg-input sg-select"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k][bn ? "bn" : "en"]}
            </option>
          ))}
        </select>
      </div>

      <div className="sg-count">
        <span>
          <T
            en={
              <>
                <strong>{filtered.length}</strong> {filtered.length === 1 ? "share" : "shares"}
                {isFiltered || filter !== "all" ? (filtered.length === 1 ? " matches" : " match") : ""}
              </>
            }
            bn={
              <>
                <strong>{filtered.length}</strong>টি শেয়ার{isFiltered || filter !== "all" ? " মিলেছে" : ""}
              </>
            }
          />
        </span>
        {(isFiltered || filter !== "all") && (
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setQuery("");
              setSector("all");
              setFilter("all");
            }}
          >
            <T en="Show all" bn="সব দেখুন" />
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="soft-card sg-card">
          <p className="sg-empty-title">
            <T en="No shares match" bn="কোনো শেয়ার মেলেনি" />
          </p>
          <p className="sg-empty">
            <T en="Try another search, sector or price." bn="অন্য কিছু খুঁজে দেখুন, বা অন্য সেক্টর বা দাম বেছে নিন।" />
          </p>
        </div>
      ) : (
        <div className="soft-card sg-card">
          <ul className="sg-rows">{head.map(row)}</ul>
          {tail.length === 0 && more}
        </div>
      )}
      {premiumCard && <div className="sg-pq-slot">{premiumCard}</div>}
      {tail.length > 0 && (
        <div className="soft-card sg-card">
          <ul className="sg-rows">{tail.map(row)}</ul>
          {more}
        </div>
      )}
    </div>
  );
}

/** Where today's price sits in its yearly range, as a word. */
function rangeWord(pct: number): { en: string; bn: string } {
  if (pct < 34) return { en: "Low in its yearly range", bn: "বছরের দামের সীমায় নিচের দিকে" };
  if (pct < 67) return { en: "Middle of its yearly range", bn: "বছরের দামের সীমার মাঝামাঝি" };
  return { en: "High in its yearly range", bn: "বছরের দামের সীমায় ওপরের দিকে" };
}

/** One Buy: name · ticker · grade · price word; price + change; a fact line;
 *  Premium's part under it. No Buy chip (every row here is one), no score ring.
 *
 *  The sample row shows its Premium part open ("Free sample") so a free reader
 *  sees what Premium is before any pitch. Every other row, while locked, ends
 *  with one small gold signpost to the page's Premium card (outside the row's
 *  link — a link can't hold a link). */
function SignalRow({
  item,
  info,
  sample,
  locked,
}: {
  item: ScoreItem;
  info?: BuyInfo;
  sample: boolean;
  locked: boolean;
}) {
  const range = info?.range_pct;
  const y = item.div_yield_pct;
  const hasPremium = !!info && (info.why.length > 0 || info.buy_below != null || info.stop_above != null);
  return (
    <li className="sg-li">
      <StockRow
        as="div"
        code={item.trading_code}
        name={item.company_name}
        inset="bleed"
        className="sg-row"
        mark={<PersonalMark code={item.trading_code} />}
        tags={
          <>
            <TierPill score={item.score} />
            <PriceWord word={wordOf(item, info)} />
          </>
        }
        sub={
          <span className="sg-facts">
            {range != null && (
              <span className="sg-range-wrap">
                <span className="sg-range" aria-hidden="true">
                  <i style={{ left: `${Math.max(0, Math.min(100, range))}%` }} />
                </span>
                <T en={rangeWord(range).en} bn={rangeWord(range).bn} />
              </span>
            )}
            {y != null && y > 0 && (
              <span>
                <T en={`Pays ${y.toFixed(1)}% a year`} bn={`বছরে ${y.toFixed(1)}% দেয়`} />
              </span>
            )}
            {item.sector && (
              <span>
                <T en={item.sector} bn={sectorBn(item.sector)} />
              </span>
            )}
          </span>
        }
        detail={info ? <SignalWhy info={info} sample={sample} locked={locked} /> : undefined}
        price={item.ltp}
        change={item.change_pct}
        action={<StarButton code={item.trading_code} size="md" />}
      />
      {locked && !sample && hasPremium && (
        <a
          href="#sg-premium"
          className="sg-sign"
          onClick={() => trackEvent("premium_lock_tap", { area: "signals", lock: "signals-row" })}
        >
          <IconCrown size={14} />
          <T en="Why it's here, and up to what price · Premium" bn="কেন এখানে, আর কোন দাম পর্যন্ত · প্রিমিয়াম" />
        </a>
      )}
    </li>
  );
}

function SignalWhy({ info, sample, locked }: { info: BuyInfo; sample: boolean; locked: boolean }) {
  const { why, buy_below, stop_above, since, since_floor } = info;
  if (!why.length && buy_below == null && stop_above == null && !since) return null;
  const body = <SignalWhyBody info={info} />;
  if (sample) {
    return (
      <span className="sg-prem sg-prem--sample">
        {locked && (
          <span className="sg-sample-tag">
            <IconCrown size={12} />
            <T en="Free sample of Premium" bn="প্রিমিয়ামের ফ্রি নমুনা" />
          </span>
        )}
        {body}
      </span>
    );
  }
  return (
    <Locked as="span" className="sg-prem">
      {body}
    </Locked>
  );
}

function SignalWhyBody({ info }: { info: BuyInfo }) {
  const { why, buy_below, stop_above, since, since_floor } = info;
  return (
    <>
      {why.length > 0 && (
        <span className="sg-prem-why">
          {why.map((f, i) => (
            <span key={i} className="sg-prem-fact">
              <T en={f.en} bn={f.bn} />
            </span>
          ))}
        </span>
      )}
      {(buy_below != null || stop_above != null || since) && (
        <span className="sg-prem-nums">
          {buy_below != null && (
            <span>
              <T en={`Our buy price: under ${money(buy_below)}`} bn={`আমাদের কেনার দাম: ${money(buy_below)}-এর নিচে`} />
            </span>
          )}
          {stop_above != null && (
            <span>
              <T en={`Stops being a Buy past ${money(stop_above)}`} bn={`${money(stop_above)} পার হলে আর কেনার সংকেত থাকবে না`} />
            </span>
          )}
          {since && (
            <span>
              {since_floor ? (
                <T en="A Buy for over 4 months" bn="4 মাসের বেশি সময় ধরে কেনার সংকেত" />
              ) : (
                <T en={`A Buy since ${formatDate(since)}`} bn={`${bnDate(since)} থেকে কেনার সংকেত`} />
              )}
            </span>
          )}
        </span>
      )}
    </>
  );
}
