import Link from "next/link";
import type { DividendsUpcoming } from "@/lib/api";

interface Props {
  data: DividendsUpcoming;
}

function shortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export default function CatalystStrip({ data }: Props) {
  type EventCard = {
    trading_code: string;
    company_name: string | null;
    date: string | null;
    dividend_pct: number | null;
    type: "record" | "declaration";
    sortKey: number;
  };

  const now = Date.now();

  const records: EventCard[] = (data.upcoming_record_dates ?? []).map((d) => ({
    trading_code: d.trading_code,
    company_name: d.company_name,
    date: d.record_date,
    dividend_pct: d.dividend_pct,
    type: "record",
    sortKey: d.record_date ? new Date(d.record_date).getTime() : Infinity,
  }));

  const declarations: EventCard[] = (data.upcoming_declarations ?? []).map((d) => ({
    trading_code: d.trading_code,
    company_name: d.company_name,
    date: d.projected_date,
    dividend_pct: d.dividend_pct,
    type: "declaration",
    sortKey: d.projected_date ? new Date(d.projected_date).getTime() : Infinity,
  }));

  const all = [...records, ...declarations]
    .filter((e) => e.sortKey >= now)
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, 12);

  return (
    <div className="intel-signal-card intel-signal-card--full mb-4">
      <div className="intel-signal-title" style={{ color: "#D97706" }}>Upcoming Catalysts</div>
      <div className="intel-signal-desc">
        Dividend record dates and upcoming declarations — potential price re-rating events.
      </div>

      {all.length === 0 ? (
        <div className="intel-empty">No upcoming dividend events found</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 mt-3" style={{ scrollbarWidth: "thin" }}>
          {all.map((ev, i) => (
            <Link
              key={`${ev.trading_code}-${ev.type}-${i}`}
              prefetch={false} href={`/stock/${ev.trading_code}`}
              className="flex-shrink-0 rounded-xl px-3 py-2.5 border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--primary)] transition-colors"
              style={{ minWidth: 130 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--text)]">{ev.trading_code}</span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={
                    ev.type === "record"
                      ? { background: "rgba(37,99,235,0.12)", color: "#2563EB" }
                      : { background: "rgba(217,119,6,0.12)", color: "#D97706" }
                  }
                >
                  {ev.type === "record" ? "Record" : "Declared"}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)] mb-1">{shortDate(ev.date)}</div>
              {ev.dividend_pct != null && (
                <div className="text-xs font-semibold" style={{ color: "var(--positive)" }}>
                  {ev.dividend_pct}% div
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
