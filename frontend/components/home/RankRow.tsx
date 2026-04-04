import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";
import type { TierKey } from "@/lib/constants";

interface Props {
  item: ScoreItem;
  rank: number;
  tier: TierKey;
}

const SCORE_CLASS: Record<TierKey, string> = {
  strong_buy:    "rr-score-top",
  good_buy:      "rr-score-good",
  safe_buy:      "rr-score-mid",
  cautious_buy:  "rr-score-cautious",
  keep_watching: "rr-score-watch",
  avoid:         "rr-score-danger",
};

function epsMarkup(eps_yoy: number | null | undefined) {
  if (eps_yoy == null) return null;
  const capped = Math.min(Math.abs(eps_yoy), 999);
  if (eps_yoy > 0) {
    return (
      <span className="rr-eps rr-chg-up">
        EPS ▲{capped.toFixed(0)}%
      </span>
    );
  }
  if (eps_yoy < 0) {
    return (
      <span className="rr-eps rr-chg-dn">
        EPS ▼{capped.toFixed(0)}%
      </span>
    );
  }
  return <span className="rr-eps rr-chg-flat">EPS 0%</span>;
}

function changeMarkup(change_pct: number | null | undefined) {
  if (change_pct == null) return null;
  if (change_pct > 0) {
    return <span className="rr-chg rr-chg-up">▲{change_pct.toFixed(1)}%</span>;
  }
  if (change_pct < 0) {
    return <span className="rr-chg rr-chg-dn">▼{Math.abs(change_pct).toFixed(1)}%</span>;
  }
  return <span className="rr-chg rr-chg-flat">0.0%</span>;
}

export default function RankRow({ item, rank, tier }: Props) {
  const scoreCls = SCORE_CLASS[tier];
  const ltp = item.ltp;
  const priceInner =
    ltp != null ? (
      <>
        <span className="rr-ltp">{taka(ltp, 1)}</span>
        {changeMarkup(item.change_pct)}
      </>
    ) : null;

  const epsInner = epsMarkup(item.eps_yoy_pct);
  const divInner =
    item.div_yield_pct != null ? (
      <span className="rr-div">Div {pct(item.div_yield_pct, 1)}</span>
    ) : null;

  const sep = <span className="rr-sep" aria-hidden="true">·</span>;

  return (
    <Link href={`/stock/${item.trading_code}`} className="rank-row">
      <span className="rr-rank">{rank}</span>
      <span className="rr-code">
        <span className="rr-ticker-pill">{item.trading_code}</span>
      </span>
      <div className="rr-company">
        <div className="rr-indicators">
          <div className="rr-slot rr-slot-price">{priceInner}</div>
          {sep}
          <div className="rr-slot rr-slot-eps">{epsInner}</div>
          {sep}
          <div className="rr-slot rr-slot-div">{divInner}</div>
        </div>
      </div>
      <span className={`rr-score ${scoreCls}`}>
        {item.score != null ? item.score.toFixed(1) : "—"}
      </span>
    </Link>
  );
}
