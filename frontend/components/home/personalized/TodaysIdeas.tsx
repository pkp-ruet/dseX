"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { RecommendedStock, DailyTip, ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { getListDelta, type ListDelta } from "@/lib/daily-delta";
import { buildIdeas, IDEA_ROWS, type IdeaRow } from "@/lib/home-ideas";
import { t } from "@/lib/home-copy";
import StarButton from "@/components/ui/StarButton";
import StockRow, { StockPill, StockRank, type StockRowTone } from "@/components/ui/StockRow";
import { ACC } from "@/components/home/personalized/accents";
import { IconSparkle } from "@/components/home/personalized/DashIcons";
import DashHeader from "@/components/home/personalized/DashHeader";
import { KIND_TONE } from "@/components/home/personalized/TipsCard";

const EMPTY_DELTA: ListDelta = { newCodes: new Set(), movedUp: new Map() };

const TONE_VAR: Record<StockRowTone, string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  watch: "var(--watch)",
  info: "var(--info)",
  primary: "var(--primary)",
  muted: "var(--text-muted)",
};

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
        accent={ACC.clay} icon={<IconSparkle size={15} />}
        title={t(lang, tuned ? "ideasTitleTuned" : "ideasTitle")}
        chips={chips}
        href="/stock-recommendation"
        linkLabel={t(lang, "ideasSeeAll")}
      />

      <p className="px-4 pt-3 text-sm leading-snug text-text-muted sm:px-5">
        {t(lang, "ideasExplainer")}
      </p>

      <ol className="mt-2 divide-y divide-cell-rule">
        {rows.map((r, i) => {
          const tone = KIND_TONE[r.kind] ?? "primary";
          return (
            <StockRow
              key={r.code}
              code={r.code}
              name={r.name}
              href={r.href}
              lang={lang}
              leading={<StockRank n={i + 1} accent={TONE_VAR[tone]} />}
              tags={r.isNew ? <StockPill tone="positive">{t(lang, "newTag")}</StockPill> : undefined}
              sub={<span className="font-extrabold uppercase tracking-[0.06em]">{t(lang, r.kind)}</span>}
              subTone={tone}
              detail={r.why ? <span className="line-clamp-2">{r.why}</span> : undefined}
              price={r.ltp}
              change={r.chg}
              action={<StarButton code={r.code} size="sm" />}
            />
          );
        })}
      </ol>

      <p className="border-t border-border px-4 py-2.5 text-center text-xs font-medium text-text-muted sm:px-5">
        {t(lang, "ideasFooter")}
      </p>
    </section>
  );
}
