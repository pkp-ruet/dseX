"use client";

import Link from "next/link";
import { taka } from "@/lib/formatters";
import type { Top20Item } from "@/lib/api";

interface Props {
  items: Top20Item[];
}

function chgColor(val: number | null) {
  if (val == null) return "var(--ink-muted)";
  if (val > 0) return "#10B981";
  if (val < 0) return "#F87171";
  return "var(--ink-muted)";
}

function fmtSigned(val: number | null) {
  if (val == null) return "—";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

export default function Top20MomentumTeaser({ items }: Props) {
  if (items.length === 0) return null;
  const top5 = items.slice(0, 5);

  return (
    <section className="t20t-section">
      <div className="t20t-header">
        <div className="t20t-title-block">
          <div className="t20t-eyebrow">
            <span className="t20t-bolt" aria-hidden="true">⚡</span>
            <span>DSE Top 20</span>
          </div>
          <h2 className="t20t-heading">This week&apos;s biggest movers on DSE</h2>
          <p className="t20t-subtitle">
            Ranked by 7-day return, relative strength vs DSEX, and trend quality
          </p>
        </div>
        <Link href="/dse-top-20" className="t20t-cta">
          See full Top 20
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </Link>
      </div>

      <div className="t20t-cards">
        {top5.map((item) => {
          const days = item.days_counted || 7;
          const upBars =
            "▰".repeat(item.up_days_7d) + "▱".repeat(Math.max(0, days - item.up_days_7d));
          return (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className="t20t-card"
            >
              <div className="t20t-rank-row">
                <span className="t20t-rank">#{item.rank}</span>
                <span className="t20t-ticker">{item.trading_code}</span>
              </div>

              <div
                className="t20t-return"
                style={{ color: chgColor(item.return_7d_pct) }}
              >
                {fmtSigned(item.return_7d_pct)}
              </div>

              <div className="t20t-bar-row">
                <span className="t20t-bar" style={{ color: chgColor(item.return_7d_pct) }}>
                  {upBars}
                </span>
                <span className="t20t-bar-label">
                  {item.up_days_7d}/{days}
                </span>
              </div>

              <div className="t20t-ltp-row">
                <span className="t20t-ltp-label">LTP</span>
                <span className="t20t-ltp">{item.ltp != null ? taka(item.ltp, 1) : "—"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
