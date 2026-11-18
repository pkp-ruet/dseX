"use client";

import { useMemo } from "react";
import Link from "@/components/ui/Link";
import type { RankingsToday, ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { companyShort } from "@/lib/formatters";
import { profitChange } from "@/lib/portfolio-analysis";
import { Move } from "@/components/ranking/RankList";
import { IconChevron, IconChevronRight, IconCoin, IconTrendUp } from "@/components/ui/icons";

const ROWS = 5;

/** One decimal, "6.0" read as "6". */
const pct1 = (v: number) => v.toFixed(1).replace(/\.0$/, "");

type Fact = { kind: "cash" | "profit"; en: string; bn: string };

/**
 * The one free figure that best says why a company ranks high, in the
 * recommendation engine's order (`recommend.keywords`): a cash yield of 4%+,
 * else profit up 15%+, else any profit rise of 3%+ (under that the results
 * page calls it "about the same"), else any cash yield. None → no line.
 */
export function standoutFact(s: ScoreItem): Fact | null {
  const y = s.div_yield_pct;
  const p = profitChange(s);
  const cash = (v: number): Fact => ({
    kind: "cash",
    en: `Pays ${pct1(v)}% a year in cash`,
    bn: `দামের ওপর বছরে ${pct1(v)}% নগদ ডিভিডেন্ড`,
  });
  const profit = (v: number): Fact => ({
    kind: "profit",
    en: `Profit up ${Math.round(v)}% on last year`,
    bn: `মুনাফা গত বছরের চেয়ে ${Math.round(v)}% বেশি`,
  });
  const yieldOk = y != null && y > 0 && y < 30;
  if (yieldOk && y >= 4) return cash(y);
  if (p != null && p >= 15) return profit(p);
  if (p != null && p >= 3) return profit(p);
  if (yieldOk) return cash(y);
  return null;
}

/**
 * "Strongest companies this week" on the signed-in home (round 3, 2026-11-18,
 * mockup https://claude.ai/artifact/Bncp1qkKjyYs6ChfZpqV2e; first built
 * 2026-11-06 as a `FindCard`, off the home 2026-11-17 → 11-18): the ranking
 * page's own rows — rank chip (gold / silver / bronze for the top three),
 * this week's move, company name + code and one standout fact (`standoutFact`:
 * its cash yield or profit rise) — for the first five, then one link to
 * `/dsestockranking`. No H / ★ marks, price or today's change since
 * 2026-11-18 (user decision: the block is about the business, not the
 * price). Order =
 * the page's: score high to low, ties by code. Free. Data: `/api/scores` and
 * the bundle's `rank_moves`; no request of its own. No moves on a rule-change
 * day (every pill reads "–").
 */
export default function RankingTop({
  stocks,
  moves = null,
  lang,
}: {
  /** Every scored company from `/api/scores`. */
  stocks: ScoreItem[];
  /** This week's rank change (`/api/user/home` `rank_moves`); no pills without it. */
  moves?: RankingsToday["moves"] | null;
  lang: Lang;
}) {
  const bn = lang === "bn";
  const { top, total } = useMemo(() => {
    const scored = stocks.filter((s) => s.score != null);
    const sorted = [...scored].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.trading_code.localeCompare(b.trading_code),
    );
    return { top: sorted.slice(0, ROWS), total: scored.length };
  }, [stocks]);
  if (!top.length) return null;

  const newCodes = new Set(moves?.new ?? []);
  const moveOf = (code: string) => (!moves ? null : newCodes.has(code) ? ("new" as const) : moves.places[code] ?? 0);

  return (
    <section className={`hm-rank ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="ranking">
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "এ সপ্তাহের সবচেয়ে শক্তিশালী কোম্পানি" : "Strongest companies this week"}</h2>
      </div>
      <div className="hm-tcard">
        <p className="hm-rank-lead">
          {bn
            ? "ব্যবসা কতটা শক্তিশালী, তা দেখে সাজানো, দাম দেখে নয়।"
            : "Ranked by how strong each business is, not by its price."}
          {moves &&
            (bn ? " তীর দেখায় এ সপ্তাহে কে কত ধাপ সরেছে।" : " The arrows show this week's move.")}
        </p>
        <ol className="rk-list">
          {top.map((s, i) => {
            const rank = i + 1;
            const code = s.trading_code;
            const fact = standoutFact(s);
            const FactIcon = fact?.kind === "cash" ? IconCoin : IconTrendUp;
            return (
              <li key={code}>
                <Link href={`/stock/${encodeURIComponent(code)}`} className="rk-line">
                  <span className={`rk-pos${rank <= 3 ? ` rk-pos--${rank}` : ""}`}>
                    <span className="sr-only">{bn ? "র‍্যাঙ্ক " : "Rank "}</span>
                    {rank}
                  </span>
                  <Move move={moveOf(code)} />
                  <span className="rk-co">
                    <span className="rk-co-name">{companyShort(s.company_name) || s.company_name || code}</span>
                    <span className="rk-co-code">{code}</span>
                    {fact && (
                      <span className="rk-co-fact">
                        <FactIcon size={14} />
                        <span>{bn ? fact.bn : fact.en}</span>
                      </span>
                    )}
                  </span>
                  <span className="rk-go" aria-hidden="true">
                    <IconChevron size={16} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <Link href="/dsestockranking" className="hm-dmore">
          {bn ? `সব ${total}টি কোম্পানি দেখুন` : `See all ${total} companies`}
          <IconChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
