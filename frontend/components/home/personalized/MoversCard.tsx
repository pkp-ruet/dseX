"use client";

import { useState } from "react";
import Link from "next/link";
import type { MarketMoversData, MarketMoverItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { money, crore, formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import { ACC, accVars } from "@/components/home/personalized/accents";
import { IconTrendUp } from "@/components/home/personalized/DashIcons";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";

type Tab = "gainers" | "losers" | "most_traded";

const ROWS = 5;

function ChangePill({ chg }: { chg: number | null }) {
  if (chg == null) return null;
  const up = chg >= 0;
  const color = up ? "var(--positive)" : "var(--negative)";
  return (
    <span
      className="inline-block rounded-md px-1.5 py-0.5 text-[0.75rem] font-bold tabular-nums nums"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {up ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
    </span>
  );
}

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
  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: "gainers", label: t(lang, "gainers"), color: "var(--positive)" },
    { key: "losers", label: t(lang, "losers"), color: "var(--negative)" },
    { key: "most_traded", label: t(lang, "mostTraded"), color: "var(--primary)" },
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

      <div role="tablist" aria-label={t(lang, "moversTitle")} className="mx-4 mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-2)] p-1 sm:mx-5">
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
              className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2 text-[0.78rem] font-bold transition-colors ${
                on ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)] active:bg-[var(--surface)]"
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tb.color, opacity: on ? 1 : 0.45 }} aria-hidden />
              <span className="truncate">{tb.label}</span>
            </button>
          );
        })}
      </div>

      <ol className="mt-2 divide-y divide-[var(--cell-rule)]">
        {rows.map((m, i) => {
          const chg = m.change_pct;
          return (
            <li key={m.trading_code}>
              <Link
                prefetch={false}
                href={`/stock/${m.trading_code}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
              >
                <span className="dash-rank grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[0.75rem] font-black tabular-nums"
                  style={accVars(ACC.steel)}
                  aria-hidden>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9rem] font-bold leading-tight text-[var(--text)]">
                      {m.company_name ?? m.trading_code}
                    </span>
                    <OwnerMark code={m.trading_code} held={held} watched={watched} lang={lang} />
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.68rem] font-bold tracking-wide text-[var(--text-muted)]">
                    <span className="font-mono">{m.trading_code}</span>
                    {tab === "most_traded" && m.value_mn != null && (
                      <span className="tabular-nums nums">
                        {crore(m.value_mn)} {t(lang, "traded")}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[0.86rem] font-bold tabular-nums nums text-[var(--text)]">{money(m.ltp)}</span>
                  <ChangePill chg={chg} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
