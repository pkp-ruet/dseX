import Link from "next/link";
import type { MarketStateData, MarketChanceStock } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_LABELS_BN, type TierKey } from "@/lib/constants";
import { t, type CopyKey } from "@/lib/home-copy";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { ACC, accVars } from "@/components/home/personalized/accents";
import { IconArrowRight, IconCoin, IconList, IconTag, IconTrendDown, IconTrendUp } from "@/components/home/personalized/DashIcons";
import StockRow, { StockPill } from "@/components/ui/StockRow";

type LensKey = "on_sale" | "income" | "rising" | "fallen";

const LENSES: { key: LensKey; title: CopyKey; sub: CopyKey; color: string; icon: React.ReactNode }[] = [
  { key: "on_sale", title: "lensOnSale", sub: "lensOnSaleSub", color: ACC.clay, icon: <IconTag size={16} /> },
  { key: "income", title: "lensIncome", sub: "lensIncomeSub", color: ACC.amber, icon: <IconCoin size={16} /> },
  { key: "rising", title: "lensRising", sub: "lensRisingSub", color: ACC.green, icon: <IconTrendUp size={16} /> },
  { key: "fallen", title: "lensFallen", sub: "lensFallenSub", color: ACC.clay, icon: <IconTrendDown size={16} /> },
];

const TIER_TEXT: Record<TierKey, string> = {
  excellent: "text-tier-excellent",
  good: "text-tier-good",
  average: "text-tier-average",
  weak: "text-tier-weak",
};

const ROWS = 3;

/** The one number that explains why a stock is on this list. */
function metric(key: LensKey, s: MarketChanceStock, lang: Lang): { text: string; cls: string } {
  const bn = lang === "bn";
  switch (key) {
    case "income":
      return { text: s.div_yield_pct != null ? `${s.div_yield_pct.toFixed(1)}%` : "—", cls: "text-watch" };
    case "rising":
      return { text: changePct(s.ret_1w, 1), cls: changeTone(s.ret_1w) };
    case "fallen":
      return { text: changePct(s.ret_1m, 1), cls: changeTone(s.ret_1m) };
    case "on_sale":
    default: {
      const tier = getTier(s.score ?? null);
      return { text: bn ? TIER_LABELS_BN[tier] : TIER_LABELS[tier], cls: TIER_TEXT[tier] };
    }
  }
}

/**
 * "Ready-made lists" — the four opportunity lenses from the market bundle as a
 * horizontal swipe rail of cards: On sale · Pays the most cash · Rising ·
 * Fallen, still strong. Each card shows its top three names with the one
 * number that earns the spot; the lens the backend calls the best for today's
 * mood wears a "Best today" tag.
 */
export default function ListsRail({
  chances,
  held,
  watched,
  lang = "en",
}: {
  chances: MarketStateData["chances"] | null | undefined;
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  if (!chances) return null;
  const cards = LENSES.map((l) => ({ ...l, rows: (chances[l.key] ?? []).slice(0, ROWS) })).filter((c) => c.rows.length > 0);
  if (cards.length === 0) return null;

  return (
    <div className={bn ? "font-bn" : undefined} lang={bn ? "bn" : undefined}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <span className="flex min-w-0 items-center gap-2" style={accVars(ACC.navy)}>
          <span className="dash-tile" aria-hidden>
            <IconList size={15} />
          </span>
          <h3 className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.12em] text-text-main">
            {t(lang, "listsTitle")}
          </h3>
        </span>
        <Link href="/stock-insights" prefetch={false} className="shrink-0 text-xs font-semibold text-primary hover:underline active:opacity-70">
          {t(lang, "allLists")} →
        </Link>
      </div>
      <div className="dash-rail -mx-4 px-4 sm:mx-0 sm:px-0">
        {cards.map((c) => {
          const best = chances.best === c.key;
          return (
            <article key={c.key} className="soft-card acc-top w-64 overflow-hidden sm:w-72" style={accVars(c.color)}>
              <div className="flex items-start gap-2.5 px-4 pt-4">
                <span className="dash-tile dash-tile-lg" aria-hidden>
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-extrabold leading-tight text-text-main">{t(lang, c.title)}</span>
                    {best && <StockPill tone="positive">{t(lang, "bestToday")}</StockPill>}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-text-muted">{t(lang, c.sub)}</span>
                </span>
              </div>
              <ul className="mt-2 divide-y divide-cell-rule">
                {c.rows.map((s) => {
                  const m = metric(c.key, s, lang);
                  return (
                    <StockRow
                      key={s.trading_code}
                      size="sm"
                      code={s.trading_code}
                      name={s.company_name}
                      lang={lang}
                      mark={<OwnerMark code={s.trading_code} held={held} watched={watched} lang={lang} />}
                      right={<span className={`block text-sm font-bold tabular-nums nums ${m.cls}`}>{m.text}</span>}
                    />
                  );
                })}
              </ul>
              <Link
                href="/market-analysis"
                prefetch={false}
                className="flex min-h-10 items-center justify-center gap-1 border-t border-border px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface-2 active:bg-surface-2"
              >
                {t(lang, "seeList")}
                <IconArrowRight size={12} />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
