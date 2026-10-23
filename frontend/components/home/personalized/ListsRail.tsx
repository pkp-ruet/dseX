import type { MarketStateData, MarketChanceStock } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_LABELS_BN, type TierKey } from "@/lib/constants";
import { t, type CopyKey } from "@/lib/home-copy";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import RailCard, { Rail, RailHeader } from "@/components/home/personalized/RailCard";
import StockRow, { StockPill } from "@/components/ui/StockRow";

type LensKey = "on_sale" | "income" | "rising" | "fallen";

const LENSES: { key: LensKey; title: CopyKey; sub: CopyKey }[] = [
  { key: "on_sale", title: "lensOnSale", sub: "lensOnSaleSub" },
  { key: "income", title: "lensIncome", sub: "lensIncomeSub" },
  { key: "rising", title: "lensRising", sub: "lensRisingSub" },
  { key: "fallen", title: "lensFallen", sub: "lensFallenSub" },
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
      <RailHeader title={t(lang, "listsTitle")} href="/stock-insights" linkLabel={t(lang, "allLists")} />
      <Rail>
        {cards.map((c) => (
          <RailCard
            key={c.key}
            title={t(lang, c.title)}
            tag={chances.best === c.key ? <StockPill tone="positive">{t(lang, "bestToday")}</StockPill> : undefined}
            sub={t(lang, c.sub)}
            href="/market-analysis"
            linkLabel={t(lang, "seeList")}
          >
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
          </RailCard>
        ))}
      </Rail>
    </div>
  );
}
