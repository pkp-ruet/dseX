import type { Top20Item } from "@/lib/api";
import { changePct, changeTone } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";
import StockRow, { StockPill, StockRank } from "@/components/ui/StockRow";

interface Props {
  item: Top20Item;
}

/**
 * One trending stock as the app-wide `StockRow`: rank chip (solid for the
 * podium), company name + code, the "Sweet spot" / "Extended" position tag,
 * the rationale, then price + the 7-day move on the right and a star to
 * follow. The relative-strength, turnover and up-day facts sit on the detail
 * line so nothing the old card said is lost.
 */
export default function Top20Card({ item }: Props) {
  const days = item.days_counted || 7;
  const sweetSpot =
    item.pct_in_52w_range != null && item.pct_in_52w_range >= 60 && item.pct_in_52w_range <= 90;
  const extended = item.pct_in_52w_range != null && item.pct_in_52w_range >= 95;
  const volPct = item.volume_ratio != null ? Math.round((item.volume_ratio - 1) * 100) : null;

  const facts: React.ReactNode[] = [];
  if (item.rs_vs_dsex_pct != null) {
    facts.push(
      <span key="rs">
        vs DSEX <span className={`font-semibold ${changeTone(item.rs_vs_dsex_pct)}`}>{changePct(item.rs_vs_dsex_pct, 1)}</span>
      </span>,
    );
  }
  if (volPct != null) {
    facts.push(
      <span key="vol">
        turnover <span className="font-semibold text-text-main">{changePct(volPct, 0)}</span> vs 30d
      </span>,
    );
  }
  facts.push(
    <span key="up">
      {item.up_days_7d}/{days} up days
    </span>,
  );

  return (
    <StockRow
      code={item.trading_code}
      name={item.company_name}
      leading={<StockRank n={item.rank} solid={item.rank <= 3} />}
      tags={
        <>
          {item.sector && <span className="shrink-0 text-xs text-text-muted">{item.sector}</span>}
          {sweetSpot && (
            <StockPill tone="positive" className="cursor-help">
              <span title="Trading in the 60–90% range of its 52-week high — momentum sweet spot">Sweet spot</span>
            </StockPill>
          )}
          {extended && (
            <StockPill tone="watch" className="cursor-help">
              <span title="Within 5% of 52-week high — extension risk">Extended</span>
            </StockPill>
          )}
        </>
      }
      sub={item.rationale || undefined}
      subClamp
      detail={
        <span className="flex flex-wrap gap-x-2 gap-y-0.5 tabular-nums nums">
          {facts.map((f, i) => (
            <span key={i} className="flex items-center gap-x-2">
              {i > 0 && <span aria-hidden>·</span>}
              {f}
            </span>
          ))}
        </span>
      }
      price={item.ltp}
      change={item.return_7d_pct}
      action={<StarButton code={item.trading_code} size="sm" />}
    />
  );
}
