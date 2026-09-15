"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { RecommendedStock, DailyTip, ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { taka } from "@/lib/formatters";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";
import { buildIdeas, IDEA_ROWS, type IdeaRow } from "@/lib/home-ideas";
import { t, type CopyKey } from "@/lib/home-copy";
import StarButton from "@/components/ui/StarButton";
import DashHeader from "@/components/home/personalized/DashHeader";

const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };

/** Colour per plain "kind" word. Market semantics stay locked: green = a good
 *  price / growth, amber = cash, primary = personal / structural. */
const KIND_COLOR: Partial<Record<CopyKey, string>> = {
  kindYouFollow: "var(--primary)",
  kindMatched: "var(--primary)",
  kindGoodPrice: "var(--positive)",
  kindStrongBuy: "var(--positive)",
  kindGrowing: "var(--positive)",
  kindPaysCash: "var(--watch)",
  kindSteady: "var(--primary)",
  kindCheap: "var(--primary)",
  kindNearLow: "var(--accent)",
  kindStrong: "var(--tier-excellent)",
  kindTip: "var(--text-muted)",
};

/** Right-aligned price + today's move. */
function PriceCell({ ltp, chg }: { ltp: number | null; chg: number | null }) {
  const color = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
  return (
    <div className="shrink-0 text-right tabular-nums nums">
      <div className="text-[0.86rem] font-bold text-[var(--text)]">
        {ltp != null ? taka(ltp, ltp >= 100 ? 0 : 1) : "—"}
      </div>
      {chg != null && (
        <div className="text-[0.75rem] font-semibold" style={{ color }}>
          {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

/**
 * "3 stocks worth a look today" — ONE plain list, no tabs.
 *
 * The previous card (Picks / Buys / Tips tabs with "% match", tier pills and
 * Buy chips) said a lot to us and little to a first-time Bangladeshi user. This
 * one says, per row: the company's name, one everyday sentence on why it is
 * here, a plain kind word ("Pays cash", "Good price now", "You follow this"),
 * and today's price. Everything reads in the chosen language.
 *
 * Source merging and ordering live in `lib/home-ideas.ts`.
 */
export default function TodaysIdeas({
  picks,
  buys,
  tips,
  followed,
  tuned,
  newPickCodes,
  summariesBn,
  lang,
  chips,
}: {
  picks: RecommendedStock[];
  /** Every whole-market buy signal (strong + normal), any order. */
  buys: ScoreItem[];
  tips: DailyTip[];
  /** Holdings ∪ watchlist codes. */
  followed: string[];
  /** True only when the user took the quiz. */
  tuned: boolean;
  newPickCodes: string[];
  summariesBn: Record<string, string>;
  lang: Lang;
  /** Header chips — the date + "N new" pills proving the daily refresh. */
  chips?: ReactNode;
}) {
  const bn = lang === "bn";

  // "Flipped to buy since your last visit" — diff the whole buy set (stable
  // order) so the tags don't churn as the lists refresh.
  const [buyDelta, setBuyDelta] = useState<ListDelta>(EMPTY_DELTA);
  const buyKey = useMemo(
    () =>
      [...buys]
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
        .map((b) => b.trading_code.toUpperCase())
        .join(","),
    [buys],
  );
  useEffect(() => {
    if (buyKey) setBuyDelta(getListDelta("home.buysignals", buyKey.split(",")));
  }, [buyKey]);

  const rows: IdeaRow[] = useMemo(
    () =>
      buildIdeas({
        picks,
        buys,
        tips,
        followed,
        tuned,
        newPickCodes,
        newBuyCodes: buyDelta.newCodes,
        summariesBn,
        lang,
        max: IDEA_ROWS,
      }),
    [picks, buys, tips, followed, tuned, newPickCodes, buyDelta, summariesBn, lang],
  );

  if (rows.length === 0) return null;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        title={t(lang, tuned ? "ideasTitleTuned" : "ideasTitle")}
        chips={chips}
        href="/stock-recommendation"
        linkLabel={t(lang, "ideasSeeAll")}
      />

      <p className="px-4 pt-3 text-[0.8rem] leading-snug text-[var(--text-muted)] sm:px-5">
        {t(lang, "ideasExplainer")}
      </p>

      <ol className="mt-2 divide-y divide-[var(--cell-rule)]">
        {rows.map((r, i) => {
          const color = KIND_COLOR[r.kind] ?? "var(--primary)";
          return (
            <li key={r.code} className="flex items-stretch gap-1 px-4 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5">
              <Link
                prefetch={false}
                href={r.href}
                className="flex min-w-0 flex-1 items-start gap-3 py-3"
              >
                <span
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[0.9rem] font-black tabular-nums"
                  style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span className="truncate text-[0.95rem] font-bold leading-tight text-[var(--text)]">
                      {r.name ?? r.code}
                    </span>
                    {r.name && (
                      <span className="shrink-0 font-mono text-[0.68rem] font-bold tracking-wide text-[var(--text-muted)]">
                        {r.code}
                      </span>
                    )}
                    {r.isNew && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.06em]"
                        style={{ color: "var(--positive)", background: "color-mix(in srgb, var(--positive) 14%, transparent)" }}
                      >
                        {t(lang, "newTag")}
                      </span>
                    )}
                  </span>
                  <span
                    className="mt-0.5 block text-[0.68rem] font-extrabold uppercase tracking-[0.06em]"
                    style={{ color }}
                  >
                    {t(lang, r.kind)}
                  </span>
                  {r.why && (
                    <span className="mt-0.5 block text-[0.8rem] leading-snug text-[var(--text-muted)] line-clamp-2">
                      {r.why}
                    </span>
                  )}
                </span>
                <PriceCell ltp={r.ltp} chg={r.chg} />
              </Link>
              <span className="flex items-center">
                <StarButton code={r.code} size="sm" className="shrink-0" />
              </span>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-[var(--border)] px-4 py-2.5 text-center text-[0.75rem] font-medium text-[var(--text-muted)] sm:px-5">
        {t(lang, "ideasFooter")}
      </p>
    </section>
  );
}
