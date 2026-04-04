import Link from "next/link";
import { formatDate, pct } from "@/lib/formatters";
import type { DividendsUpcoming } from "@/lib/api";

interface Props {
  data: DividendsUpcoming;
}

export default function UpcomingEvents({ data }: Props) {
  const hasDecls = data.upcoming_declarations.length > 0;
  const hasRecords = data.upcoming_record_dates.length > 0;

  if (!hasDecls && !hasRecords) return null;

  return (
    <div className="sidebar-widget">
      <div className="sidebar-widget-title">Upcoming Dividends</div>

      {hasDecls && (
        <>
          <div className="sidebar-sub-header">Declarations</div>
          {data.upcoming_declarations.map((d) => (
            <Link
              key={d.trading_code}
              href={`/stock/${d.trading_code}`}
              className="sidebar-row"
            >
              <span className="sidebar-row-key">{d.trading_code}</span>
              <span style={{ fontSize: "0.66rem", color: "var(--ink-muted)", flex: 1, textAlign: "center", padding: "0 4px" }}>
                {formatDate(d.projected_date)}
              </span>
              <span className="sidebar-row-val">
                {d.dividend_pct != null ? pct(d.dividend_pct, 0) : "—"}
              </span>
            </Link>
          ))}
        </>
      )}

      {hasRecords && (
        <>
          <div className="sidebar-sub-header" style={hasDecls ? { marginTop: "10px" } : {}}>
            Record Dates
          </div>
          {data.upcoming_record_dates.map((d) => (
            <Link
              key={`${d.trading_code}-${d.record_date ?? ""}`}
              href={`/stock/${d.trading_code}`}
              className="sidebar-row"
            >
              <span className="sidebar-row-key">{d.trading_code}</span>
              <span style={{ fontSize: "0.66rem", color: "var(--ink-muted)", flex: 1, textAlign: "center", padding: "0 4px" }}>
                {formatDate(d.record_date)}
              </span>
              <span className="sidebar-row-val">
                {d.dividend_pct != null ? pct(d.dividend_pct, 0) : "—"}
              </span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
