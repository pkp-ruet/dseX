"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoreItem, SignalDetail } from "@/lib/api";
import SignalChip from "@/components/ui/SignalChip";
import ScoreBadge from "@/components/ui/ScoreBadge";
import StarButton from "@/components/ui/StarButton";
import StockRow from "@/components/ui/StockRow";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import { Locked } from "@/components/premium/AnswerLock";
import { T } from "@/components/i18n/T";
import { formatDate, money } from "@/lib/formatters";
import { useLang } from "@/context/LangContext";
import { bnDate, sectorBn } from "@/lib/bn";

type Tab = "all" | "strong";
type SortKey = "match" | "gainers" | "losers" | "dividend";

interface Props {
  /** Every buy signal (strong + normal) — this page lists buys only. */
  buy: ScoreItem[];
  sectors: string[];
  /** Premium's part of each row (`/api/signals/detail`); absent = not shown. */
  detail?: Record<string, SignalDetail>;
}

/** `<option>` holds plain text only, so the menu reads the language through `useLang()`. */
const SORT_LABELS: Record<SortKey, { en: string; bn: string }> = {
  match: { en: "Best match", bn: "সবচেয়ে উপযুক্ত" },
  gainers: { en: "Rose most today", bn: "আজ সবচেয়ে বেশি বেড়েছে" },
  losers: { en: "Fell most today", bn: "আজ সবচেয়ে বেশি কমেছে" },
  dividend: { en: "Dividend yield", bn: "ডিভিডেন্ড ইল্ড" },
};

const PAGE = 48;

const num = (v: number | null | undefined, fallback: number) =>
  v == null ? fallback : v;

const isStrong = (i: ScoreItem) => i.signal?.strength === "strong";

function sortItems(list: ScoreItem[], sort: SortKey): ScoreItem[] {
  const arr = [...list];
  switch (sort) {
    case "gainers":
      return arr.sort((a, b) => num(b.change_pct, -Infinity) - num(a.change_pct, -Infinity));
    case "losers":
      return arr.sort((a, b) => num(a.change_pct, Infinity) - num(b.change_pct, Infinity));
    case "dividend":
      return arr.sort((a, b) => num(b.div_yield_pct, -1) - num(a.div_yield_pct, -1));
    default:
      // "Best match": Strong buys first, then by fundamental score.
      return arr.sort(
        (a, b) =>
          Number(isStrong(b)) - Number(isStrong(a)) || num(b.score, -1) - num(a.score, -1),
      );
  }
}

export default function SignalsExplorer({ buy, sectors, detail = {} }: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState<SortKey>("match");
  const [limit, setLimit] = useState(PAGE);
  const { lang } = useLang();
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);

  // Any change to the view resets pagination to the top.
  useEffect(() => {
    setLimit(PAGE);
  }, [tab, query, sector, sort]);

  const strongBuys = useMemo(() => buy.filter(isStrong), [buy]);
  const base = tab === "strong" ? strongBuys : buy;

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    const list = base.filter((item) => {
      if (sector !== "all" && item.sector !== sector) return false;
      if (q) {
        const code = item.trading_code.toUpperCase();
        const name = (item.company_name ?? "").toUpperCase();
        if (!code.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
    return sortItems(list, sort);
  }, [base, query, sector, sort]);

  const shown = filtered.slice(0, limit);
  const isFiltered = query.trim() !== "" || sector !== "all";

  const reset = () => {
    setQuery("");
    setSector("all");
  };

  return (
    <div>
      {/* All buys / Strong buys, then one quiet filter bar */}
      <Tabs
        ariaLabel={L("Which buy signals", "কোন কেনার সংকেত")}
        idBase="sg-tab"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "all", label: <T en={`All buys · ${buy.length}`} bn={`সব কেনার সংকেত · ${buy.length}`} /> },
          {
            key: "strong",
            label: <T en={`Strong buys · ${strongBuys.length}`} bn={`কেনার ভালো সুযোগ · ${strongBuys.length}`} />,
          },
        ]}
      />

      <div role="tabpanel" aria-labelledby={`sg-tab-${tab}`}>
        <div className="sg-filters">
          <div className="sg-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L("Search company or code", "কোম্পানি বা কোড খুঁজুন")}
              aria-label={L("Search companies", "কোম্পানি খুঁজুন")}
              className="sg-input"
            />
          </div>
          <select
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
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={L("Sort signals", "সংকেত সাজান")}
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
                  {isFiltered ? (filtered.length === 1 ? " matches" : " match") : ""}
                </>
              }
              bn={
                <>
                  <strong>{filtered.length}</strong>টি শেয়ার{isFiltered ? " মিলেছে" : ""}
                </>
              }
            />
          </span>
          {isFiltered && (
            <Button variant="link" size="sm" onClick={reset}>
              <T en="Clear filters" bn="ফিল্টার মুছুন" />
            </Button>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="soft-card sg-card">
            <p className="sg-empty-title">
              <T
                en={`No ${tab === "strong" ? "strong buy" : "buy"} signals match`}
                bn={tab === "strong" ? "কোনো কেনার ভালো সুযোগ মেলেনি" : "কোনো কেনার সংকেত মেলেনি"}
              />
            </p>
            <p className="sg-empty">
              <T en="Try another search or sector." bn="অন্য কিছু খুঁজে দেখুন, বা অন্য সেক্টর বেছে নিন।" />
            </p>
          </div>
        ) : (
          // ONE list card, every row free (2026-10-31, the Premium Desk plan:
          // the Buy word is a fact we print on every share page). Premium adds
          // the reason and the prices under each row (`SignalRow` → Locked).
          <div className="soft-card sg-card">
            <ul className="sg-rows">
              {shown.map((item) => (
                <SignalRow key={item.trading_code} item={item} detail={detail[item.trading_code]} />
              ))}
            </ul>
            {filtered.length > limit && (
              <div className="flex justify-center pb-3 pt-2">
                <Button variant="quiet" onClick={() => setLimit((l) => l + PAGE)}>
                  <T
                    en={`Show ${Math.min(PAGE, filtered.length - limit)} more`}
                    bn={`আরও ${Math.min(PAGE, filtered.length - limit)}টি দেখুন`}
                  />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One buy signal: the shared StockRow — name · chip · sector · price · score
 * ring, all free. Premium's part sits under the sector line: why it is a Buy,
 * our buy price, the price past which it stops being one, and since when.
 */
function SignalRow({ item, detail }: { item: ScoreItem; detail?: SignalDetail }) {
  const sig = item.signal;
  return (
    <StockRow
      code={item.trading_code}
      name={item.company_name}
      inset="bleed"
      className="sg-row"
      tags={sig ? <SignalChip signal={sig.signal} strength={sig.strength} /> : undefined}
      sub={item.sector ? <T en={item.sector} bn={sectorBn(item.sector)} /> : undefined}
      detail={sig ? <SignalWhy reasonEn={sig.reason_en} reasonBn={sig.reason_bn} detail={detail} /> : undefined}
      price={item.ltp}
      change={item.change_pct}
      trailing={<ScoreBadge score={item.score} size="sm" />}
      action={<StarButton code={item.trading_code} size="md" />}
    />
  );
}

function SignalWhy({ reasonEn, reasonBn, detail }: { reasonEn: string; reasonBn?: string | null; detail?: SignalDetail }) {
  const since = detail?.since;
  return (
    <Locked as="span" className="sg-prem">
      <span className="sg-prem-why">
        <T en={reasonEn} bn={reasonBn || reasonEn} />
      </span>
      {detail && (detail.buy_below != null || detail.stop_above != null || since) && (
        <span className="sg-prem-nums">
          {detail.buy_below != null && (
            <span>
              <T en={`Our buy price: under ${money(detail.buy_below)}`} bn={`আমাদের কেনার দাম: ${money(detail.buy_below)}-এর নিচে`} />
            </span>
          )}
          {detail.stop_above != null && (
            <span>
              <T en={`Stops being a Buy past ${money(detail.stop_above)}`} bn={`${money(detail.stop_above)} পার হলে আর কেনার সংকেত থাকবে না`} />
            </span>
          )}
          {since && (
            <span>
              {detail.since_floor ? (
                <T en="A Buy for over 4 months" bn="4 মাসের বেশি সময় ধরে কেনার সংকেত" />
              ) : (
                <T en={`A Buy since ${formatDate(since)}`} bn={`${bnDate(since)} থেকে কেনার সংকেত`} />
              )}
            </span>
          )}
        </span>
      )}
    </Locked>
  );
}
