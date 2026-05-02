import Link from "next/link";
import type { NearExtremesData, NearExtremeItem } from "@/lib/api";
import { taka, pct } from "@/lib/formatters";

interface Props {
  data: NearExtremesData;
}

function ExtremeTable({
  title,
  description,
  items,
  type,
}: {
  title: string;
  description: string;
  items: NearExtremeItem[];
  type: "high" | "low";
}) {
  const accent = type === "high" ? "#059669" : "#dc2626";

  return (
    <div className="intel-signal-card">
      <div className="intel-signal-title" style={{ color: accent }}>{title}</div>
      <div className="intel-signal-desc">{description}</div>

      {items.length === 0 ? (
        <div className="intel-empty">No stocks match this criteria today</div>
      ) : (
        <>
          <div
            className="intel-row intel-row-header"
            style={{ gridTemplateColumns: "2fr 2fr 2fr 2fr" }}
          >
            <span>Code</span>
            <span>LTP</span>
            <span>{type === "high" ? "52W High" : "52W Low"}</span>
            <span style={{ textAlign: "right" }}>Gap%</span>
          </div>
          {items.slice(0, 10).map((item) => {
            const extreme = type === "high" ? item.w52_high : item.w52_low;
            return (
              <Link
                key={item.trading_code}
                href={`/stock/${item.trading_code}`}
                className="intel-row"
                style={{ gridTemplateColumns: "2fr 2fr 2fr 2fr" }}
              >
                <span className="intel-code">{item.trading_code}</span>
                <span className="intel-ltp">{item.ltp != null ? taka(item.ltp) : "—"}</span>
                <span className="intel-ltp" style={{ color: accent }}>
                  {extreme != null ? taka(extreme) : "—"}
                </span>
                <span
                  className="intel-metric"
                  style={{ color: "var(--text-muted)", textAlign: "right" }}
                >
                  {item.gap_pct != null ? `${pct(item.gap_pct)}` : "—"}
                </span>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function NearExtremesPanel({ data }: Props) {
  return (
    <div className="intel-grid mb-4">
      <ExtremeTable
        title="Near 52-Week High"
        description="Within 5% of their yearly peak — potential breakout candidates or distribution zones."
        items={data.near_high}
        type="high"
      />
      <ExtremeTable
        title="Near 52-Week Low"
        description="Within 5% of their yearly floor — potential value entry or continued weakness."
        items={data.near_low}
        type="low"
      />
    </div>
  );
}
