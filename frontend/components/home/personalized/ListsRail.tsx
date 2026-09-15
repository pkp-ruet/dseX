import Link from "next/link";
import type { MarketStateData, MarketChanceStock } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR } from "@/lib/constants";
import { t, type CopyKey } from "@/lib/home-copy";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { IconArrowRight, IconCoin, IconTag, IconTrendDown, IconTrendUp } from "@/components/home/personalized/DashIcons";

type LensKey = "on_sale" | "income" | "rising" | "fallen";

const LENSES: { key: LensKey; title: CopyKey; sub: CopyKey; color: string; icon: React.ReactNode }[] = [
  { key: "on_sale", title: "lensOnSale", sub: "lensOnSaleSub", color: "var(--primary)", icon: <IconTag size={16} /> },
  { key: "income", title: "lensIncome", sub: "lensIncomeSub", color: "var(--watch)", icon: <IconCoin size={16} /> },
  { key: "rising", title: "lensRising", sub: "lensRisingSub", color: "var(--positive)", icon: <IconTrendUp size={16} /> },
  { key: "fallen", title: "lensFallen", sub: "lensFallenSub", color: "var(--accent)", icon: <IconTrendDown size={16} /> },
];

const ROWS = 3;

/** The one number that explains why a stock is on this list. */
function metric(key: LensKey, s: MarketChanceStock, lang: Lang): { text: string; color: string } {
  const bn = lang === "bn";
  switch (key) {
    case "income":
      return { text: s.div_yield_pct != null ? `${s.div_yield_pct.toFixed(1)}%` : "—", color: "var(--watch)" };
    case "rising":
      return { text: s.ret_1w != null ? `${s.ret_1w >= 0 ? "+" : ""}${s.ret_1w.toFixed(1)}%` : "—", color: "var(--positive)" };
    case "fallen":
      return { text: s.ret_1m != null ? `${s.ret_1m >= 0 ? "+" : ""}${s.ret_1m.toFixed(1)}%` : "—", color: "var(--negative)" };
    case "on_sale":
    default: {
      const tier = getTier(s.score ?? null);
      return { text: bn ? TIER_LABELS_BN[tier] : TIER_LABELS[tier], color: TIER_VAR[tier] };
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
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h3 className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">{t(lang, "listsTitle")}</h3>
        <Link href="/stock-insights" prefetch={false} className="text-xs font-semibold text-[var(--primary)] hover:underline active:opacity-70">
          {t(lang, "allLists")} →
        </Link>
      </div>
      <div className="dash-rail -mx-4 px-4 sm:mx-0 sm:px-0">
        {cards.map((c) => {
          const best = chances.best === c.key;
          return (
            <article key={c.key} className="soft-card w-[16rem] overflow-hidden sm:w-[17rem]">
              <div className="flex items-start gap-2.5 px-4 pt-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 12%, transparent)` }} aria-hidden>
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9rem] font-extrabold leading-tight text-[var(--text)]">{t(lang, c.title)}</span>
                    {best && (
                      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-[0.06em]" style={{ color: "var(--positive)", background: "color-mix(in srgb, var(--positive) 14%, transparent)" }}>
                        {t(lang, "bestToday")}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[0.72rem] leading-snug text-[var(--text-muted)]">{t(lang, c.sub)}</span>
                </span>
              </div>
              <ul className="mt-2 divide-y divide-[var(--cell-rule)]">
                {c.rows.map((s) => {
                  const m = metric(c.key, s, lang);
                  return (
                    <li key={s.trading_code}>
                      <Link prefetch={false} href={`/stock/${s.trading_code}`} className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[0.84rem] font-bold leading-tight text-[var(--text)]">{s.company_name ?? s.trading_code}</span>
                            <OwnerMark code={s.trading_code} held={held} watched={watched} lang={lang} />
                          </span>
                          <span className="block font-mono text-[0.68rem] font-bold tracking-wide text-[var(--text-muted)]">{s.trading_code}</span>
                        </span>
                        <span className="shrink-0 text-[0.8rem] font-bold tabular-nums nums" style={{ color: m.color }}>{m.text}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/market-analysis"
                prefetch={false}
                className="flex items-center justify-center gap-1 border-t border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]"
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
