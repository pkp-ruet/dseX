import Link from "next/link";
import type { RelatedStock } from "@/lib/api";
import { getTier, TIER_COLORS, TIER_LABELS } from "@/lib/constants";
import { signed } from "@/lib/formatters";

interface Props {
  stocks: RelatedStock[];
  currentSector: string | null | undefined;
}

export default function RelatedStocks({ stocks, currentSector }: Props) {
  if (!stocks || stocks.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Related Stocks
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        {currentSector
          ? `Other top-ranked stocks in the ${currentSector} sector.`
          : "Other top-ranked stocks you might want to compare."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stocks.map((s) => (
          <RelatedCard key={s.trading_code} stock={s} />
        ))}
      </div>
    </section>
  );
}

function RelatedCard({ stock }: { stock: RelatedStock }) {
  const tier = getTier(stock.score);
  const tierColor = TIER_COLORS[tier];
  const tierLabel = TIER_LABELS[tier];

  const chg = stock.change_pct;
  const isPositive = chg != null && chg > 0;
  const isNegative = chg != null && chg < 0;
  const changeColor = chg == null ? "var(--text-muted)" : isPositive ? "var(--positive)" : isNegative ? "var(--negative)" : "var(--text-muted)";

  return (
    <Link
      href={`/stock/${stock.trading_code}`}
      className="block rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tabular-nums leading-none mb-1" style={{ color: "var(--primary)" }}>
            {stock.trading_code}
          </p>
          {stock.company_name && (
            <p
              className="text-xs leading-snug truncate"
              style={{ color: "var(--text-muted)" }}
              title={stock.company_name}
            >
              {stock.company_name}
            </p>
          )}
        </div>
        {stock.score != null && (
          <span
            className="shrink-0 inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap tabular-nums"
            style={{
              color: tierColor,
              background: `${tierColor}1A`,
              border: `1px solid ${tierColor}40`,
            }}
            title={tierLabel}
          >
            {Math.round(stock.score)}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 mt-3">
        <span className="text-lg font-bold tabular-nums" style={{ color: "var(--text)" }}>
          {stock.ltp != null ? `৳${stock.ltp.toFixed(stock.ltp >= 100 ? 0 : 1)}` : "--"}
        </span>
        {chg != null && (
          <span className="text-xs font-bold tabular-nums" style={{ color: changeColor }}>
            {isPositive ? "▲" : isNegative ? "▼" : "—"} {signed(chg)}%
          </span>
        )}
      </div>
    </Link>
  );
}
