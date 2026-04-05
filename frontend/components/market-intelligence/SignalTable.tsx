import Link from "next/link";
import type { MarketSignalItem } from "@/lib/api";
import { taka, pct } from "@/lib/formatters";

type MetricCol = "volume_ratio" | "score" | "change_pct";

interface Props {
  title: string;
  description: string;
  items: MarketSignalItem[];
  metricCol: MetricCol;
  metricLabel: string;
  fullWidth?: boolean;
  titleColor?: string;
}

function metricValue(item: MarketSignalItem, col: MetricCol): string {
  if (col === "volume_ratio") {
    return item.volume_ratio != null ? `${item.volume_ratio.toFixed(1)}×` : "—";
  }
  if (col === "score") {
    return item.score != null ? item.score.toFixed(0) : "—";
  }
  if (col === "change_pct") {
    if (item.change_pct == null) return "—";
    return `${item.change_pct >= 0 ? "+" : ""}${pct(item.change_pct)}`;
  }
  return "—";
}

function metricColor(item: MarketSignalItem, col: MetricCol): string | undefined {
  if (col === "change_pct" && item.change_pct != null) {
    return item.change_pct >= 0 ? "var(--positive)" : "var(--negative)";
  }
  if (col === "score" && item.score != null) {
    if (item.score >= 75) return "var(--np-strong)";
    if (item.score >= 55) return "var(--np-safe)";
    if (item.score >= 35) return "var(--np-watch)";
    return "var(--np-danger)";
  }
  return undefined;
}

export default function SignalTable({
  title,
  description,
  items,
  metricCol,
  metricLabel,
  fullWidth,
  titleColor,
}: Props) {
  return (
    <div className={`intel-signal-card${fullWidth ? " intel-signal-card--full" : ""}`}>
      <div className="intel-signal-title" style={titleColor ? { color: titleColor } : undefined}>{title}</div>
      <div className="intel-signal-desc">{description}</div>

      {items.length === 0 ? (
        <div className="intel-empty">No stocks match this signal today</div>
      ) : (
        <>
          {/* Header row */}
          <div className="intel-row intel-row-header">
            <span>Code</span>
            <span>LTP</span>
            <span>Chg%</span>
            <span style={{ textAlign: "right" }}>{metricLabel}</span>
          </div>
          {items.map((item) => {
            const chgPos = (item.change_pct ?? 0) >= 0;
            return (
              <Link
                key={item.trading_code}
                href={`/stock/${item.trading_code}`}
                className="intel-row"
              >
                <span className="intel-code">{item.trading_code}</span>
                <span className="intel-ltp">{item.ltp != null ? taka(item.ltp) : "—"}</span>
                <span
                  className="intel-change"
                  style={{ color: chgPos ? "var(--positive)" : "var(--negative)" }}
                >
                  {item.change_pct != null
                    ? `${item.change_pct >= 0 ? "+" : ""}${pct(item.change_pct)}`
                    : "—"}
                </span>
                <span
                  className="intel-metric"
                  style={{ color: metricColor(item, metricCol), textAlign: "right" }}
                >
                  {metricValue(item, metricCol)}
                </span>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}
