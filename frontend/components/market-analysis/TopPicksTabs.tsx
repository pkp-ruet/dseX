"use client";

import { useState } from "react";
import Link from "next/link";
import type { StockListItem } from "@/lib/stock-lists";
import { taka, pct } from "@/lib/formatters";

interface Props {
  epsGrowth: StockListItem[];
  returnW52: StockListItem[];
  dividend: StockListItem[];
}

const TABS = [
  {
    key: "eps",
    label: "EPS Growth",
    color: "#059669",
    metricLabel: "EPS Grw%",
    format: (v: number | null) => v != null ? `+${pct(v)}` : "—",
  },
  {
    key: "w52",
    label: "52W Return",
    color: "#2563EB",
    metricLabel: "52W Ret%",
    format: (v: number | null) => v != null ? `+${pct(v)}` : "—",
  },
  {
    key: "div",
    label: "Dividend Yield",
    color: "#D97706",
    metricLabel: "Yield%",
    format: (v: number | null) => v != null ? pct(v) : "—",
  },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function TopPicksTabs({ epsGrowth, returnW52, dividend }: Props) {
  const [active, setActive] = useState<TabKey>("eps");

  const tab = TABS.find((t) => t.key === active)!;
  const items =
    active === "eps" ? epsGrowth : active === "w52" ? returnW52 : dividend;

  return (
    <div className="intel-signal-card intel-signal-card--full mb-4">
      <div className="intel-signal-title" style={{ color: "var(--primary)" }}>Top Raw Picks</div>
      <div className="intel-signal-desc">
        Ranked by fundamental and price metrics — no composite scoring.
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2 mt-3 mb-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
            style={
              active === t.key
                ? { background: t.color, color: "#fff", border: "none" }
                : {
                    background: "transparent",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="intel-row intel-row-header">
        <span>Code</span>
        <span>Company</span>
        <span>LTP</span>
        <span style={{ textAlign: "right" }}>{tab.metricLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className="intel-empty">No data available</div>
      ) : (
        items.slice(0, 10).map((item) => (
          <Link
            key={item.trading_code}
            prefetch={false} href={`/stock/${item.trading_code}`}
            className="intel-row"
            style={{ gridTemplateColumns: "2fr 4fr 2fr 2fr" }}
          >
            <span className="intel-code">{item.trading_code}</span>
            <span className="intel-ltp text-[var(--text-muted)] text-xs truncate">
              {item.company_name ? item.company_name.split(" ").slice(0, 2).join(" ") : "—"}
            </span>
            <span className="intel-ltp">{taka(item.ltp)}</span>
            <span
              className="intel-metric"
              style={{ color: tab.color, textAlign: "right" }}
            >
              {tab.format(item.metric_value)}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
