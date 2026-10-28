"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScoreItem } from "@/lib/api";
import SignalChip from "@/components/ui/SignalChip";
import ScoreBadge from "@/components/ui/ScoreBadge";
import StarButton from "@/components/ui/StarButton";
import StockRow from "@/components/ui/StockRow";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import RowLock from "@/components/premium/RowLock";
import LockPanel, { type LockTile } from "@/components/premium/LockPanel";
import { FREE_SIGNAL_ROWS, splitFree } from "@/lib/free-share";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { sectorBn } from "@/lib/bn";

/** Locked rows a free reader sees with the company hidden (premium/RowLock). */
const SIGNAL_PREVIEW_ROWS = 2;

type Tab = "all" | "strong";
type SortKey = "match" | "gainers" | "losers" | "dividend";

interface Props {
  /** Every buy signal (strong + normal) — this page lists buys only. */
  buy: ScoreItem[];
  sectors: string[];
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

export default function SignalsExplorer({ buy, sectors }: Props) {
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
  // Free readers see the first FREE_SIGNAL_ROWS of the view; the rest sits
  // behind the Premium lock (screen-only — the cards stay in the HTML).
  const [free, locked] = splitFree(shown, FREE_SIGNAL_ROWS);
  const rest = filtered.slice(FREE_SIGNAL_ROWS);
  const restStrong = rest.filter(isStrong).length;
  const restExcellent = rest.filter((i) => (i.score ?? 0) >= 75).length;
  const lockTiles: LockTile[] = [
    restStrong > 0
      ? { value: String(restStrong), label: restStrong === 1 ? { en: "is a Strong buy", bn: "কেনার ভালো সুযোগ" } : { en: "are Strong buys", bn: "কেনার ভালো সুযোগ" } }
      : null,
    restExcellent > 0 ? { value: String(restExcellent), label: { en: "graded Excellent", bn: "গ্রেড চমৎকার" } } : null,
  ].filter((t): t is LockTile => t != null);
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
          // ONE list card: the free rows, then the rest of the same list
          // behind the lock — for free readers the next rows with the company
          // hidden and what Premium shows (premium/RowLock); plain rows for
          // Premium, the seam disappears once it unlocks.
          <div className="soft-card sg-card">
            <ul className="sg-rows">
              {free.map((item) => (
                <SignalRow key={item.trading_code} item={item} />
              ))}
            </ul>
            {locked.length > 0 && (
              <RowLock
                className="sg-locked"
                preview={
                  <ul className="sg-rows">
                    {locked.slice(0, SIGNAL_PREVIEW_ROWS).map((item) => (
                      <SignalRow key={item.trading_code} item={item} masked />
                    ))}
                  </ul>
                }
                panel={
                  <LockPanel
                    variant="full"
                    inset
                    title={{
                      en: `See the companies behind ${rest.length} more buy ${rest.length === 1 ? "signal" : "signals"}`,
                      bn: `আরও ${rest.length}টি কেনার সংকেতের কোম্পানিগুলো দেখুন`,
                    }}
                    sub={{
                      en: "Premium shows every buy signal today: the company, the reason for the signal, its score and its price, with Strong buys and sectors to filter.",
                      bn: "প্রিমিয়ামে আজকের প্রতিটি কেনার সংকেত: কোম্পানি, সংকেতের কারণ, স্কোর আর দাম, সঙ্গে কেনার ভালো সুযোগ আর সেক্টর বাছাই।",
                    }}
                    tiles={lockTiles}
                    codes={rest.map((i) => i.trading_code)}
                    count={rest.length}
                    lock="Buy signals"
                    what={{ en: "Every buy signal", bn: "সব কেনার সংকেত" }}
                  />
                }
              >
                <ul className="sg-rows">
                  {locked.map((item) => (
                    <SignalRow key={item.trading_code} item={item} />
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
              </RowLock>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One buy signal: the shared StockRow, with the reason as its line. Kept to
 * name · chip · reason · price · score ring — the grade pill repeated the
 * ring and the sector line repeated the filter, and both crowded the row.
 */
function SignalRow({ item, masked = false }: { item: ScoreItem; masked?: boolean }) {
  const sig = item.signal;
  // Masked (a free reader's preview of a locked row): the chip, sector and
  // score show; the company and the reason (Premium on the stock page too) don't.
  const sub = masked
    ? item.sector
      ? <T en={item.sector} bn={sectorBn(item.sector)} />
      : undefined
    : sig
      ? <T en={sig.reason_en} bn={sig.reason_bn || sig.reason_en} />
      : undefined;
  return (
    <StockRow
      code={item.trading_code}
      name={item.company_name}
      inset="bleed"
      className="sg-row"
      masked={masked}
      tags={sig ? <SignalChip signal={sig.signal} strength={sig.strength} /> : undefined}
      sub={sub}
      subClamp
      price={item.ltp}
      change={item.change_pct}
      trailing={<ScoreBadge score={item.score} size="sm" />}
      action={<StarButton code={item.trading_code} size="md" />}
    />
  );
}
