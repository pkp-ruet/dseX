import Link from "next/link";
import SectionLabel from "@/components/ui/SectionLabel";
import { formatDate, pct } from "@/lib/formatters";
import type { DividendsUpcoming } from "@/lib/api";

interface Props {
  data: DividendsUpcoming;
}

function DivRow({ code, date, divPct }: { code: string; date: string | null; divPct: number | null }) {
  return (
    <Link
      href={`/stock/${code}`}
      className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-gray-50 transition-colors px-1 rounded"
    >
      <span className="text-xs font-bold text-[var(--primary)]">{code}</span>
      <span className="text-xs text-[var(--text-muted)]">{formatDate(date)}</span>
      {divPct != null && (
        <span className="text-xs font-medium">{pct(divPct, 0)}</span>
      )}
    </Link>
  );
}

export default function MarketIntelStrip({ data }: Props) {
  const hasDecls = data.upcoming_declarations.length > 0;
  const hasRecords = data.upcoming_record_dates.length > 0;

  if (!hasDecls && !hasRecords) return null;

  return (
    <div className="mt-8">
      <SectionLabel>Market Intelligence</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-6 mt-3">
        {hasDecls && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Upcoming Declarations</p>
            {data.upcoming_declarations.map((d) => (
              <DivRow
                key={d.trading_code}
                code={d.trading_code}
                date={d.projected_date}
                divPct={d.dividend_pct}
              />
            ))}
          </div>
        )}
        {hasRecords && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Upcoming Record Dates</p>
            {data.upcoming_record_dates.map((d) => (
              <DivRow
                key={d.trading_code}
                code={d.trading_code}
                date={d.record_date}
                divPct={d.dividend_pct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
