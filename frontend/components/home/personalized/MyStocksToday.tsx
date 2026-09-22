"use client";

import { useEffect, useRef, useState } from "react";
import {
  type ScoreItem,
  type NearExtremesData,
  type DividendsUpcoming,
  type PortfolioHolding,
  type PriceAlert,
} from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone, money } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import TierPill from "@/components/ui/TierPill";
import StockRow, { StockPill, type StockRowTone } from "@/components/ui/StockRow";
import { ACC } from "@/components/home/personalized/accents";
import { IconWallet } from "@/components/home/personalized/DashIcons";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";

/**
 * Price + today's-change cell that flashes green/red for ~0.9s whenever a
 * background refetch changes the price — the "it's alive" cue of a native app.
 * Remounts via `key` on change so the CSS animation replays each tick. Same
 * two-line shape as StockRow's default price column (money + changePct).
 */
function PriceCell({ ltp, chg }: { ltp: number | null; chg: number | null }) {
  const prev = useRef<number | null>(ltp);
  const idRef = useRef(0);
  const [flash, setFlash] = useState<{ dir: "up" | "down"; id: number } | null>(null);

  useEffect(() => {
    if (ltp == null) return;
    if (prev.current != null && ltp !== prev.current) {
      idRef.current += 1;
      setFlash({ dir: ltp > prev.current ? "up" : "down", id: idRef.current });
    }
    prev.current = ltp;
  }, [ltp]);

  return (
    <span
      key={flash?.id ?? "init"}
      className={`-mx-1.5 block shrink-0 rounded-md px-1.5 text-right ${
        flash ? (flash.dir === "up" ? "price-flash-up" : "price-flash-down") : ""
      }`}
    >
      <span className="block text-sm font-semibold tabular-nums nums text-text-main">{money(ltp)}</span>
      <span className={`block text-xs font-semibold tabular-nums nums ${changeTone(chg)}`}>{changePct(chg)}</span>
    </span>
  );
}

const MAX_ROWS = 6;

interface Chip {
  label: string;
  tone: StockRowTone;
}

function fmtTarget(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** Merged list: holdings and watchlist in one feed, sorted by today's move
 *  size, tagged H (holding) / ★ (watching), company name first with the code
 *  small beside it (a first-time reader knows "Grameenphone", not "GP"), the
 *  grade pill, and chips for 52-week extremes, dividends, an armed price alert
 *  and a full report. The header carries the ▲up/▼down day pulse across
 *  everything followed. */
export default function MyStocksToday({
  holdings,
  codes,
  priceMap,
  extremes,
  dividends,
  alerts = [],
  reportCodes = [],
  lang = "en",
}: {
  holdings: PortfolioHolding[];
  codes: string[];
  priceMap: Map<string, ScoreItem>;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
  /** The user's price alerts — an armed one becomes an "Alert at ৳X" chip. */
  alerts?: PriceAlert[];
  /** Codes with a deep-analysis report — a "Full report" chip. */
  reportCodes?: string[];
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const held = new Set(holdings.map((h) => h.trading_code.toUpperCase()));
  const watched = new Set(codes.map((c) => c.toUpperCase()));
  const universe = Array.from(new Set([...held, ...watched]));

  const nearHigh = new Set((extremes?.near_high ?? []).map((e) => e.trading_code.toUpperCase()));
  const nearLow = new Set((extremes?.near_low ?? []).map((e) => e.trading_code.toUpperCase()));
  const divSoon = new Set(
    [...(dividends?.upcoming_declarations ?? []), ...(dividends?.upcoming_record_dates ?? [])].map((d) =>
      d.trading_code.toUpperCase(),
    ),
  );
  const reports = new Set(reportCodes.map((c) => c.toUpperCase()));
  const armed = new Map<string, PriceAlert>();
  for (const a of alerts) {
    const c = a.trading_code.toUpperCase();
    if (a.is_active && !armed.has(c)) armed.set(c, a);
  }

  const all = universe
    .map((c) => priceMap.get(c))
    .filter((x): x is ScoreItem => !!x);
  const rows = [...all]
    .sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0))
    .slice(0, MAX_ROWS);
  if (rows.length === 0) return null;

  // Pulse counts every followed stock, not just the MAX_ROWS shown.
  const upCount = all.filter((x) => (x.change_pct ?? 0) > 0).length;
  const downCount = all.filter((x) => (x.change_pct ?? 0) < 0).length;

  function chipsFor(code: string): Chip[] {
    const c = code.toUpperCase();
    const out: Chip[] = [];
    if (nearHigh.has(c)) out.push({ label: t(lang, "near52wHigh"), tone: "positive" });
    if (nearLow.has(c)) out.push({ label: t(lang, "near52wLow"), tone: "negative" });
    if (divSoon.has(c)) out.push({ label: t(lang, "dividendSoon"), tone: "watch" });
    const a = armed.get(c);
    if (a) out.push({ label: t(lang, "alertAt", { n: fmtTarget(a.target_price) }), tone: "primary" });
    if (reports.has(c)) out.push({ label: t(lang, "fullReport"), tone: "muted" });
    return out;
  }

  const viewHref = watched.size > 0 ? "/watchlist" : "/portfolio";
  // The H / ★ tags only carry information when a row could be either — with
  // just a watchlist (or just a portfolio) every row would wear the same tag.
  const showOwnerTags = held.size > 0 && watched.size > 0;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.clay} icon={<IconWallet size={15} />}
        title={t(lang, "yourStocksToday")}
        chips={
          upCount + downCount > 0 ? (
            <span
              className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums nums"
              title={`${upCount} up · ${downCount} down today`}
            >
              <span className="text-positive">▲{upCount}</span>{" "}
              <span className="text-negative">▼{downCount}</span>
            </span>
          ) : undefined
        }
        href={viewHref}
        linkLabel={t(lang, "viewAll", { n: universe.length })}
      />

      <ul className="divide-y divide-cell-rule">
        {rows.map((item) => {
          const code = item.trading_code.toUpperCase();
          const chips = chipsFor(code);
          return (
            <StockRow
              key={item.trading_code}
              code={item.trading_code}
              name={item.company_name}
              lang={lang}
              mark={showOwnerTags ? <OwnerMark code={code} held={held} watched={watched} lang={lang} /> : undefined}
              tags={<TierPill score={item.score} variant="solid" size="sm" />}
              detail={
                chips.length > 0 ? (
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {chips.map((a) => (
                      <StockPill key={a.label} tone={a.tone}>
                        {a.label}
                      </StockPill>
                    ))}
                  </span>
                ) : undefined
              }
              right={<PriceCell ltp={item.ltp} chg={item.change_pct} />}
            />
          );
        })}
      </ul>
    </section>
  );
}
