"use client";

import { useState } from "react";
import type { DailyTip } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { TIP_KIND } from "@/lib/home-ideas";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { IconBulb } from "@/components/home/personalized/DashIcons";
import StockRow, { StockPill, StockTile, type StockRowTone } from "@/components/ui/StockRow";

const INITIAL = 5;

/** Plain "kind" word → row tone. Market semantics stay locked: green = growth,
 *  amber = cash, primary = personal / structural. */
export const KIND_TONE: Record<string, StockRowTone> = {
  kindYouFollow: "primary",
  kindMatched: "primary",
  kindGoodPrice: "positive",
  kindStrongBuy: "positive",
  kindGrowing: "positive",
  kindPaysCash: "watch",
  kindSteady: "primary",
  kindCheap: "primary",
  kindNearLow: "primary",
  kindStrong: "positive",
  kindTip: "muted",
};

const TONE_VAR: Record<StockRowTone, string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  watch: "var(--watch)",
  info: "var(--info)",
  primary: "var(--primary)",
  muted: "var(--text-muted)",
};

function summary(tip: DailyTip): string {
  const s = tip.text || "";
  const i = s.indexOf(" — ");
  return i >= 0 ? s.slice(i + 3) : s;
}

/**
 * Every tip of the day (the daily-tips feed, ~10 rows) as a plain list:
 * company name, a kind word, one sentence, the one number behind it. Five
 * show; "Show all" opens the rest.
 */
export default function TipsCard({
  tips,
  held,
  watched,
  lang = "en",
}: {
  tips: DailyTip[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const bn = lang === "bn";
  if (tips.length === 0) return null;
  const shown = open ? tips : tips.slice(0, INITIAL);
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "tipsTitle")} chips={<HeaderChip>{tips.length}</HeaderChip>} href="/daily-tips" linkLabel={t(lang, "allTips")} accent={ACC.gold} icon={<IconBulb size={15} />} />
      <ul className="divide-y divide-cell-rule">
        {shown.map((tip) => {
          const kind = TIP_KIND[tip.category] ?? "kindTip";
          const tone = KIND_TONE[kind] ?? "primary";
          const line = bn ? tip.why_bn || summary(tip) : summary(tip);
          const metric = tip.facts?.[0]?.value;
          return (
            <StockRow
              key={`${tip.category}-${tip.trading_code}`}
              code={tip.trading_code}
              name={tip.company_name}
              lang={lang}
              leading={
                <StockTile accent={TONE_VAR[tone]}>
                  <IconBulb size={16} />
                </StockTile>
              }
              mark={<OwnerMark code={tip.trading_code} held={held} watched={watched} lang={lang} />}
              sub={<span className="font-extrabold uppercase tracking-[0.06em]">{t(lang, kind)}</span>}
              subTone={tone}
              detail={line ? <span className="line-clamp-2">{line}</span> : undefined}
              trailing={metric ? <StockPill tone={tone}>{metric}</StockPill> : undefined}
            />
          );
        })}
      </ul>
      {tips.length > INITIAL && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-surface-2 active:bg-surface-2"
        >
          {open ? t(lang, "showFewer") : t(lang, "showAll", { n: tips.length })}
        </button>
      )}
    </section>
  );
}
