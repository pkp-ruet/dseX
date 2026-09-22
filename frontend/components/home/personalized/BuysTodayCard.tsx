"use client";

import { useState } from "react";
import type { ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconCheck } from "@/components/home/personalized/DashIcons";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import SignalChip from "@/components/ui/SignalChip";
import StarButton from "@/components/ui/StarButton";
import StockRow from "@/components/ui/StockRow";

const INITIAL = 6;

/** Followed first, then Strong, then by fundamental score. */
function order(list: ScoreItem[], followed: Set<string>): ScoreItem[] {
  return [...list].sort(
    (a, b) =>
      Number(followed.has(b.trading_code.toUpperCase())) - Number(followed.has(a.trading_code.toUpperCase())) ||
      Number(b.signal?.strength === "strong") - Number(a.signal?.strength === "strong") ||
      (b.score ?? -1) - (a.score ?? -1),
  );
}

/**
 * Every whole-market Buy signal of the day as a plain list: company name, the
 * Buy / Strong Buy chip (the canonical `SignalChip`), the one-sentence reason
 * in the reader's language, today's price, a star to follow. Six rows show;
 * "Show all N" opens the rest. The count sentence at the top is the headline.
 */
export default function BuysTodayCard({
  buys,
  held,
  watched,
  lang = "en",
}: {
  buys: ScoreItem[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const [open, setOpen] = useState(false);
  const bn = lang === "bn";
  const followed = new Set([...held, ...watched]);
  const rows = order(buys, followed);
  const shown = open ? rows : rows.slice(0, INITIAL);
  const count = rows.length;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.green} icon={<IconCheck size={15} />}
        title={t(lang, "buysTitle")}
        chips={count > 0 ? <HeaderChip tone="accent">{count}</HeaderChip> : undefined}
        href="/buy-sell-signals"
        linkLabel={t(lang, "allBuys")}
      />
      <div className="px-4 pt-3 sm:px-5">
        <p className="text-base font-bold leading-snug text-text-main">
          {count === 0 ? t(lang, "buysNone") : count === 1 ? t(lang, "buysOne") : t(lang, "buysCount", { n: count })}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-text-muted">{t(lang, "buysNote")}</p>
      </div>

      {shown.length > 0 && (
        <ul className="mt-2 divide-y divide-cell-rule">
          {shown.map((s) => {
            const strong = s.signal?.strength === "strong";
            const reason = (bn ? s.signal?.reason_bn : s.signal?.reason_en) || s.signal?.reason_en || "";
            return (
              <StockRow
                key={s.trading_code}
                code={s.trading_code}
                name={s.company_name}
                lang={lang}
                mark={<OwnerMark code={s.trading_code} held={held} watched={watched} lang={lang} />}
                tags={<SignalChip signal="buy" strength={strong ? "strong" : "normal"} lang={lang} />}
                sub={reason || undefined}
                subClamp
                price={s.ltp}
                change={s.change_pct}
                action={<StarButton code={s.trading_code} size="sm" />}
              />
            );
          })}
        </ul>
      )}

      {rows.length > INITIAL && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-surface-2 active:bg-surface-2"
        >
          {open ? t(lang, "showFewer") : t(lang, "showAll", { n: rows.length })}
        </button>
      )}
    </section>
  );
}
