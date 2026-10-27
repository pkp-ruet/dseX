import type { Top20Item } from "@/lib/api";
import { changePct, changeTone } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";
import StockRow, { StockPill, StockRank } from "@/components/ui/StockRow";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";

interface Props {
  item: Top20Item;
}

/** One plain sentence on why the share is on the list, in both languages.
 *  Built here from the same numbers as the backend's English-only
 *  `rationale`, which repeated the figures already on the detail line. */
function reason(item: Top20Item): { en: string; bn: string } {
  const rs = item.rs_vs_dsex_pct;
  const busy = item.volume_ratio != null && item.volume_ratio >= 1.3;
  if (rs != null && rs >= 0.5 && busy)
    return { en: "Beating the market, with more trading than usual.", bn: "বাজারের চেয়ে ভালো করছে, লেনদেনও স্বাভাবিকের চেয়ে বেশি।" };
  if (rs != null && rs >= 0.5) return { en: "Beating the market this week.", bn: "এ সপ্তাহে বাজারের চেয়ে ভালো করছে।" };
  if (busy) return { en: "More trading than usual.", bn: "লেনদেন স্বাভাবিকের চেয়ে বেশি।" };
  if (rs != null && rs <= -0.5) return { en: "Behind the market this week.", bn: "এ সপ্তাহে বাজারের চেয়ে পিছিয়ে।" };
  return { en: "Rising steadily.", bn: "ধীরে ধীরে বাড়ছে।" };
}

/**
 * One trending share as the app-wide `StockRow`: rank chip (solid for the
 * podium), company name + code, the yearly-range tag, one plain reason, then
 * price + the 7-day move on the right and a star to follow. The strength,
 * trading and up-day facts sit on the detail line.
 */
export default function Top20Card({ item }: Props) {
  const days = item.days_counted || 7;
  const sweetSpot =
    item.pct_in_52w_range != null && item.pct_in_52w_range >= 60 && item.pct_in_52w_range <= 90;
  const extended = item.pct_in_52w_range != null && item.pct_in_52w_range >= 95;
  const volPct = item.volume_ratio != null ? Math.round((item.volume_ratio - 1) * 100) : null;
  const why = reason(item);

  const facts: React.ReactNode[] = [];
  if (item.rs_vs_dsex_pct != null) {
    const v = <span className={`font-semibold ${changeTone(item.rs_vs_dsex_pct)}`}>{changePct(item.rs_vs_dsex_pct, 1)}</span>;
    facts.push(
      <span key="rs">
        <T en={<>vs DSEX {v}</>} bn={<>ডিএসইএক্সের তুলনায় {v}</>} />
      </span>,
    );
  }
  if (volPct != null) {
    const v = <span className="font-semibold text-text-main">{changePct(volPct, 0)}</span>;
    facts.push(
      <span key="vol">
        <T en={<>trading {v} vs 30 days</>} bn={<>30 দিনের তুলনায় লেনদেন {v}</>} />
      </span>,
    );
  }
  facts.push(
    <span key="up">
      <T en={`up on ${item.up_days_7d} of ${days} days`} bn={`${days} দিনের ${item.up_days_7d} দিন বেড়েছে`} />
    </span>,
  );

  return (
    <StockRow
      code={item.trading_code}
      name={item.company_name}
      leading={<StockRank n={item.rank} solid={item.rank <= 3} />}
      tags={
        <>
          {item.sector && (
            <span className="shrink-0 text-xs text-text-muted">
              <T en={item.sector} bn={sectorBn(item.sector)} />
            </span>
          )}
          {sweetSpot && (
            <StockPill tone="positive">
              <T en="Room to rise" bn="বাড়ার জায়গা আছে" />
            </StockPill>
          )}
          {extended && (
            <StockPill tone="watch">
              <T en="Near its yearly high" bn="বছরের সর্বোচ্চের কাছে" />
            </StockPill>
          )}
        </>
      }
      sub={<T en={why.en} bn={why.bn} />}
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
