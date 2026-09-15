import Link from "next/link";
import type { ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { money } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_LABELS_BN, TIER_VAR } from "@/lib/constants";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconTrophy } from "@/components/home/personalized/DashIcons";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";

const ROWS = 8;

/**
 * The top of the leaderboard, inline: rank, company name, the grade word in
 * the reader's language, the score out of 100, today's price. The first three
 * ranks wear the excellent tint. "Full ranking" opens the whole board.
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
      <ol className="divide-y divide-[var(--cell-rule)]">
        {rows.map((s, i) => {
          const tier = getTier(s.score);
          const tierColor = TIER_VAR[tier];
          const top3 = i < 3;
          const chg = s.change_pct;
          const chgColor = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
          return (
            <li key={s.trading_code}>
              <Link
                prefetch={false}
                href={`/stock/${s.trading_code}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[0.85rem] font-black tabular-nums"
                  style={
                    top3
                      ? { color: "#fff", background: tierColor }
                      : { color: "var(--text-muted)", background: "var(--surface-2)" }
                  }
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9rem] font-bold leading-tight text-[var(--text)]">{s.company_name ?? s.trading_code}</span>
                    <OwnerMark code={s.trading_code} held={held} watched={watched} lang={lang} />
                  </span>
                  {/* wraps rather than pushing the price cell off a 360px row */}
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.72rem] font-bold">
                    <span style={{ color: tierColor }}>{bn ? TIER_LABELS_BN[tier] : TIER_LABELS[tier]}</span>
                    <span className="tabular-nums nums text-[var(--text-muted)]">
                      {Math.round(s.score ?? 0)}
                      {t(lang, "outOf100")}
                    </span>
                    <span className="font-mono text-[0.68rem] tracking-wide text-[var(--text-muted)]">{s.trading_code}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[0.86rem] font-bold tabular-nums nums text-[var(--text)]">{money(s.ltp)}</span>
                  {chg != null && (
                    <span className="block text-[0.75rem] font-semibold tabular-nums nums" style={{ color: chgColor }}>
                      {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
