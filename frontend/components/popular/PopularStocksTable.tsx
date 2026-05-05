"use client";

import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import StarButton from "@/components/ui/StarButton";
import type { PopularStockItem } from "@/lib/api";

interface Props {
  items: PopularStockItem[];
}

function chgColor(val: number | null) {
  if (val == null) return "var(--ink-muted)";
  return val > 0 ? "#34D399" : val < 0 ? "#F87171" : "var(--ink-muted)";
}

function fmtChg(val: number | null) {
  if (val == null) return "—";
  return `${val > 0 ? "+" : ""}${pct(val)}`;
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 999,
          background: "rgba(74, 222, 128, 0.15)",
          color: "#4ADE80",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: 0.5,
        }}
      >
        NEW
      </span>
    );
  }
  if (delta === 0) {
    return <span style={{ color: "var(--ink-muted)" }}>—</span>;
  }
  if (delta > 0) {
    return (
      <span style={{ color: "#34D399", fontWeight: 600 }}>
        ▲ +{delta}
      </span>
    );
  }
  return (
    <span style={{ color: "#F87171", fontWeight: 600 }}>
      ▼ {delta}
    </span>
  );
}

export default function PopularStocksTable({ items }: Props) {
  return (
    <div className="full-rank-wrap">
      <table className="full-rank-table">
        <thead className="fr-thead">
          <tr>
            <th className="fr-th fr-th-rank">#</th>
            <th className="fr-th fr-th-rank">Δ</th>
            <th className="fr-th fr-th-star" aria-label="Watchlist"></th>
            <th className="fr-th fr-th-code">Code</th>
            <th className="fr-th fr-th-sector fr-th-hide-sm">Sector</th>
            <th className="fr-th fr-th-num">Visits 7d</th>
            <th className="fr-th fr-th-num fr-th-hide-sm">LTP</th>
            <th className="fr-th fr-th-num">Chg%</th>
            <th className="fr-th fr-th-num fr-th-hide-sm">Score</th>
            <th className="fr-th fr-th-tier fr-th-hide-sm">Tier</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const tier = getTier(item.score);
            const tierColor = TIER_COLORS[tier];
            return (
              <tr key={item.trading_code} className="fr-row">
                <td className="fr-td fr-td-rank">{item.rank}</td>

                <td className="fr-td fr-td-rank">
                  <DeltaCell delta={item.delta} />
                </td>

                <td className="fr-td fr-td-star">
                  <StarButton code={item.trading_code} />
                </td>

                <td className="fr-td fr-td-code">
                  <Link
                    href={`/stock/${item.trading_code}`}
                    className="fr-code-link"
                    style={{ color: tierColor }}
                  >
                    {item.trading_code}
                  </Link>
                  <span className="fr-code-sub">{item.company_name ?? ""}</span>
                </td>

                <td className="fr-td fr-td-sector fr-td-hide-sm">
                  {item.sector ?? "—"}
                </td>

                <td className="fr-td fr-td-num">
                  {item.visits_7d.toLocaleString()}
                </td>

                <td className="fr-td fr-td-num fr-td-hide-sm">
                  {item.ltp != null ? taka(item.ltp) : "—"}
                </td>

                <td className="fr-td fr-td-num" style={{ color: chgColor(item.change_pct) }}>
                  {fmtChg(item.change_pct)}
                </td>

                <td className="fr-td fr-td-num fr-td-hide-sm">
                  <span style={{ color: tierColor, fontWeight: 600 }}>
                    {item.score != null ? item.score.toFixed(1) : "—"}
                  </span>
                </td>

                <td className="fr-td fr-td-tier fr-td-hide-sm" style={{ color: tierColor }}>
                  {TIER_LABELS[tier]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 && (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--ink-muted)" }}>
          No visit data yet — check back soon.
        </div>
      )}
    </div>
  );
}
