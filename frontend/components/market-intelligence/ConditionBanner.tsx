import type { MarketSummary } from "@/lib/api";
import { formatDate, pct } from "@/lib/formatters";

interface Props {
  condition: "falling" | "rising" | "sideways" | "unknown";
  summary: MarketSummary;
}

const CONFIG = {
  falling: {
    icon: "↓",
    label: "Market is Falling",
    desc: "Broad selling pressure detected. Signals highlight stocks showing unusual resilience or accumulation.",
    mod: "intel-condition-banner--falling",
    iconMod: "intel-condition-icon--falling",
  },
  rising: {
    icon: "↑",
    label: "Market is Rising",
    desc: "Broad buying interest detected. Signals highlight conviction breakouts and discounted quality stocks.",
    mod: "intel-condition-banner--rising",
    iconMod: "intel-condition-icon--rising",
  },
  sideways: {
    icon: "→",
    label: "Market is Sideways",
    desc: "Low directional conviction. Signals highlight hidden divergences, coiling setups, and upcoming catalysts.",
    mod: "intel-condition-banner--sideways",
    iconMod: "intel-condition-icon--sideways",
  },
  unknown: {
    icon: "–",
    label: "No Signal Data",
    desc: "Price data exists for this date but change values are unavailable — possibly a non-trading day or incomplete scrape. Run scrape-prices to refresh.",
    mod: "intel-condition-banner--sideways",
    iconMod: "intel-condition-icon--sideways",
  },
};

export default function ConditionBanner({ condition, summary }: Props) {
  const cfg = CONFIG[condition] ?? CONFIG.unknown;
  const dateLabel = summary.date ? formatDate(summary.date) : null;
  const avgChg = summary.avg_change_pct;

  return (
    <div className={`intel-condition-banner ${cfg.mod}`}>
      <div className={`intel-condition-icon ${cfg.iconMod}`}>{cfg.icon}</div>
      <div className="intel-condition-text">
        <div className="intel-condition-label">{cfg.label}</div>
        <div className="intel-condition-meta">
          {dateLabel && <span>{dateLabel} · </span>}
          {avgChg != null && (
            <span>Avg move {avgChg >= 0 ? "+" : ""}{pct(avgChg)} · </span>
          )}
          {summary.total > 0 && <span>{summary.total} stocks tracked</span>}
        </div>
        <div className="intel-condition-desc">{cfg.desc}</div>
      </div>
      {summary.total > 0 && (
        <div className="intel-breadth-stats">
          <div className="intel-breadth-stat">
            <div className="intel-breadth-val intel-breadth-val--up">{summary.gainers}</div>
            <div className="intel-breadth-key">Up</div>
          </div>
          <div className="intel-breadth-stat">
            <div className="intel-breadth-val intel-breadth-val--down">{summary.losers}</div>
            <div className="intel-breadth-key">Down</div>
          </div>
          <div className="intel-breadth-stat">
            <div className="intel-breadth-val intel-breadth-val--flat">{summary.flat}</div>
            <div className="intel-breadth-key">Flat</div>
          </div>
        </div>
      )}
    </div>
  );
}
