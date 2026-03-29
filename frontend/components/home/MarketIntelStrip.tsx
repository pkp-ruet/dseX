import Link from "next/link";
import { formatDate, pct } from "@/lib/formatters";
import type { DividendsUpcoming } from "@/lib/api";

interface Props {
  data: DividendsUpcoming;
}

function IntelRow({ code, date, divPct }: { code: string; date: string | null; divPct: number | null }) {
  return (
    <Link href={`/stock/${code}`} className="info-col-row--intel">
      <span className="icr-key">{code}</span>
      <span className="icr-sub min-w-0 truncate">{formatDate(date)}</span>
      <span className="icr-val">{divPct != null ? pct(divPct, 0) : "—"}</span>
    </Link>
  );
}

export default function MarketIntelStrip({ data }: Props) {
  const hasDecls = data.upcoming_declarations.length > 0;
  const hasRecords = data.upcoming_record_dates.length > 0;

  if (!hasDecls && !hasRecords) return null;

  const noData = <span className="text-[0.68rem] text-[var(--ink-muted)]">No data yet</span>;

  return (
    <>
      <div className="section-rule-modern">
        <span className="section-rule-text">Market Intelligence</span>
      </div>

      <div className="info-strip-modern">
        <div className="info-col">
          <div className="info-col-header">Upcoming Declarations</div>
          {hasDecls ? (
            data.upcoming_declarations.map((d) => (
              <IntelRow
                key={d.trading_code}
                code={d.trading_code}
                date={d.projected_date}
                divPct={d.dividend_pct}
              />
            ))
          ) : (
            <div className="py-2 px-1">{noData}</div>
          )}
        </div>
        <div className="info-col">
          <div className="info-col-header">Record Dates</div>
          {hasRecords ? (
            data.upcoming_record_dates.map((d) => (
              <IntelRow
                key={`${d.trading_code}-${d.record_date ?? ""}`}
                code={d.trading_code}
                date={d.record_date}
                divPct={d.dividend_pct}
              />
            ))
          ) : (
            <div className="py-2 px-1">{noData}</div>
          )}
        </div>
      </div>
    </>
  );
}
