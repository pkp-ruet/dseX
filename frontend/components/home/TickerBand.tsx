import { taka, pct } from "@/lib/formatters";
import type { ScoreItem } from "@/lib/api";

interface Props {
  items: ScoreItem[];
}

function TickerItem({ item }: { item: ScoreItem }) {
  const cp = item.change_pct;
  const chgClass =
    cp == null ? "ticker-flat"
    : cp > 0   ? "ticker-up"
    : cp < 0   ? "ticker-dn"
    : "ticker-flat";

  const chgLabel =
    cp == null ? "—"
    : `${cp > 0 ? "+" : ""}${pct(cp)}`;

  const arrow =
    cp == null ? null
    : cp > 0   ? <span className="ticker-arrow ticker-arrow-up">▲</span>
    : cp < 0   ? <span className="ticker-arrow ticker-arrow-dn">▼</span>
    : null;

  return (
    <span className="ticker-item">
      {arrow}<span className="ticker-code">{item.trading_code}</span>
      <span className="ticker-ltp">{item.ltp != null ? taka(item.ltp) : "—"}</span>
      <span className={`ticker-chg ${chgClass}`}>{chgLabel}</span>
      <span className="ticker-sep" aria-hidden="true">◆</span>
    </span>
  );
}

export default function TickerBand({ items }: Props) {
  if (!items.length) return null;

  return (
    <div className="ticker-band" aria-label="Top company price ticker">
      {/* Render list twice for seamless CSS loop */}
      <div className="ticker-inner" aria-hidden="true">
        {items.map((item) => (
          <TickerItem key={`a-${item.trading_code}`} item={item} />
        ))}
        {items.map((item) => (
          <TickerItem key={`b-${item.trading_code}`} item={item} />
        ))}
      </div>
    </div>
  );
}
