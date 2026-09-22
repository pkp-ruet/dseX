import type { ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR, type TierKey } from "@/lib/constants";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconTrophy } from "@/components/home/personalized/DashIcons";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StockRow, { StockRank } from "@/components/ui/StockRow";

const ROWS = 8;

const TIER_TEXT: Record<TierKey, string> = {
  excellent: "text-tier-excellent",
  good: "text-tier-good",
  average: "text-tier-average",
  weak: "text-tier-weak",
};

/**
 * The top of the leaderboard, inline: rank, company name, the grade word in
 * the reader's language, the score out of 100, today's price. The first three
 * ranks wear a solid tier-coloured chip. "Full ranking" opens the whole board.
 */
export default function TopRankedCard({
  stocks,
  held,
  watched,
  lang = "en",
}: {
  /** Every scored stock (the /api/scores payload flattened). */
  stocks: ScoreItem[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const scored = stocks.filter((s) => s.score != null);
  const rows = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, ROWS);
  if (rows.length === 0) return null;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.gold} icon={<IconTrophy size={15} />}
        title={t(lang, "rankedTitle")}
        chips={<HeaderChip className="hidden sm:inline">{t(lang, "ofN", { n: scored.length })}</HeaderChip>}
        href="/dsestockranking"
        linkLabel={t(lang, "fullRanking")}
      />
      <ol className="divide-y divide-cell-rule">
        {rows.map((s, i) => {
          const tier = getTier(s.score);
          return (
            <StockRow
              key={s.trading_code}
              code={s.trading_code}
              name={s.company_name}
              lang={lang}
              leading={<StockRank n={i + 1} accent={i < 3 ? TIER_VAR[tier] : ACC.gold} solid={i < 3} />}
              mark={<OwnerMark code={s.trading_code} held={held} watched={watched} lang={lang} />}
              sub={
                <>
                  <span className={`font-bold ${TIER_TEXT[tier]}`}>{bn ? TIER_LABELS_BN[tier] : TIER_LABELS[tier]}</span>
                  <span className="tabular-nums nums">
                    {" · "}
                    {Math.round(s.score ?? 0)}
                    {t(lang, "outOf100")}
                  </span>
                </>
              }
              price={s.ltp}
              change={s.change_pct}
            />
          );
        })}
      </ol>
    </section>
  );
}
