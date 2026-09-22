"use client";

import { useState } from "react";
import type { MarketMoversData, MarketMoverItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { crore, formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconTrendUp } from "@/components/home/personalized/DashIcons";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StockRow, { StockRank } from "@/components/ui/StockRow";

type Tab = "gainers" | "losers" | "most_traded";

const ROWS = 5;

/**
 * Today's gainers, losers and most-traded as three tabs of five rows each —
 * the first thing a market-watcher wants and, until 2026-09-16, nowhere on the
 * homepage. Rows lead with the company name; the reader's own stocks wear the
 * H / ★ marks.
 */
export default function MoversCard({
  movers,
  held,
  watched,
  lang = "en",
}: {
  movers: MarketMoversData | null | undefined;
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const [tab, setTab] = useState<Tab>("gainers");
  const bn = lang === "bn";
  if (!movers) return null;
  const lists: Record<Tab, MarketMoverItem[]> = {
    gainers: movers.gainers ?? [],
    losers: movers.losers ?? [],
    most_traded: movers.most_traded ?? [],
  };
  if (!lists.gainers.length && !lists.losers.length && !lists.most_traded.length) return null;
  const rows = lists[tab].slice(0, ROWS);
  const tabs: { key: Tab; label: string; dot: string }[] = [
    { key: "gainers", label: t(lang, "gainers"), dot: "bg-positive" },
    { key: "losers", label: t(lang, "losers"), dot: "bg-negative" },
    { key: "most_traded", label: t(lang, "mostTraded"), dot: "bg-primary" },
  ];
  const dateChip = movers.date ? (bn ? bnDate(movers.date) : formatDate(movers.date)) : null;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.steel} icon={<IconTrendUp size={15} />}
        title={t(lang, "moversTitle")}
        chips={dateChip ? <HeaderChip className="hidden sm:inline">{dateChip}</HeaderChip> : undefined}
        href="/dse-today"
        linkLabel={t(lang, "allMovers")}
      />

      <div role="tablist" aria-label={t(lang, "moversTitle")} className="mx-4 mt-3 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 sm:mx-5">
        {tabs.map((tb) => {
          const on = tb.key === tab;
          // min-w-0 + a truncating label: each tab is only ~90px wide on a
          // 360px phone, so a label that does not fit ellipsises instead of
          // wrapping the whole strip onto two lines.
          return (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(tb.key)}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-bold transition-colors ${
                on ? "bg-surface text-text-main shadow-soft" : "text-text-muted active:bg-surface"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tb.dot} ${on ? "" : "opacity-40"}`} aria-hidden />
              <span className="truncate">{tb.label}</span>
            </button>
          );
        })}
      </div>

      <ol className="mt-2 divide-y divide-cell-rule">
        {rows.map((m, i) => (
          <StockRow
            key={m.trading_code}
            code={m.trading_code}
            name={m.company_name}
            lang={lang}
            leading={<StockRank n={i + 1} accent={ACC.steel} />}
            mark={<OwnerMark code={m.trading_code} held={held} watched={watched} lang={lang} />}
            sub={
              tab === "most_traded" && m.value_mn != null ? (
                <span className="tabular-nums nums">
                  {crore(m.value_mn)} {t(lang, "traded")}
                </span>
              ) : undefined
            }
            price={m.ltp}
            change={m.change_pct}
          />
        ))}
      </ol>
    </section>
  );
}
