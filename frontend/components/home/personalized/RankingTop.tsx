import Link from "next/link";
import type { RankingsToday, ScoreItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone, companyShort, money } from "@/lib/formatters";
import FindCard from "@/components/home/personalized/FindCard";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { Move } from "@/components/ranking/RankList";
import { T } from "@/components/i18n/T";
import { IconChevron, IconTrophy } from "@/components/ui/icons";

const ROWS = 5;

/**
 * "Company ranking" on the dashboard (2026-11-06, user: "show top 5 then
 * link"; the trending list beside it was removed): the ranking page's own
 * rows — rank chip (gold / silver / bronze for the top three), this week's
 * move, company, latest price — for the first five, then one link to
 * `/dsestockranking`. Order = the page's: score high to low, ties by code.
 * Replaced `DiscoverRail` (a swipe rail of ranked + trending).
 */
export default function RankingTop({
  stocks,
  moves = null,
  held,
  watched,
  lang = "en",
}: {
  /** Every scored company from `/api/scores`. */
  stocks: ScoreItem[];
  /** This week's rank change (`/api/user/home` `rank_moves`); no pills without it. */
  moves?: RankingsToday["moves"];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const scored = stocks.filter((s) => s.score != null);
  if (!scored.length) return null;
  const top = [...scored]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.trading_code.localeCompare(b.trading_code))
    .slice(0, ROWS);
  const newCodes = new Set(moves?.new ?? []);
  const moveOf = (code: string) =>
    !moves ? null : newCodes.has(code) ? ("new" as const) : moves.places[code] ?? 0;
  const total = scored.length;

  return (
    <FindCard
      id="fc-ranking"
      icon={<IconTrophy size={14} />}
      eyebrow={<T en="Company ranking" bn="কোম্পানির র‍্যাঙ্কিং" />}
      title={<T en="Strongest companies on the DSE" bn="ডিএসইর সবচেয়ে শক্তিশালী কোম্পানি" />}
      lead={
        <T
          en={`All ${total} companies, ranked by our in-depth fundamental analysis. The arrows show this week's move.`}
          bn={`${total}টি কোম্পানি, আমাদের গভীর ফান্ডামেন্টাল বিশ্লেষণ দেখে সাজানো। তীর দেখায় এ সপ্তাহে কে কত ধাপ সরেছে।`}
        />
      }
      href="/dsestockranking"
      allLabel={<T en="Full ranking" bn="পুরো র‍্যাঙ্কিং" />}
      footLabel={<T en={`See all ${total} companies`} bn={`সব ${total}টি কোম্পানি দেখুন`} />}
    >
      <ol className="rk-list fcr-list">
        {top.map((s, i) => {
          const rank = i + 1;
          const code = s.trading_code;
          return (
            <li key={code}>
              <Link prefetch={false} href={`/stock/${code}`} className="rk-line">
                <span className={`rk-pos${rank <= 3 ? ` rk-pos--${rank}` : ""}`}>
                  <span className="sr-only">
                    <T en="Rank" bn="র‍্যাঙ্ক" />{" "}
                  </span>
                  {rank}
                </span>
                <Move move={moveOf(code)} />
                <span className="rk-co">
                  <span className="rk-co-name">{companyShort(s.company_name) || s.company_name || code}</span>
                  <span className="rk-co-code">
                    {code}
                    <OwnerMark code={code} held={held} watched={watched} lang={lang} />
                  </span>
                </span>
                <span className="rk-price">
                  <span className="rk-price-now">{money(s.ltp)}</span>
                  {s.change_pct != null && (
                    <span className={`rk-price-chg ${changeTone(s.change_pct)}`}>{changePct(s.change_pct)}</span>
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
    </FindCard>
  );
}
