import Link from "next/link";
import type { MarketIndexData } from "@/lib/api";

/** Convert million BDT → crore string  e.g. 7934.264 mn → "793 Cr" */
function fmtCr(mn: number | null): string {
  if (mn == null) return "—";
  const cr = mn / 10;
  if (cr >= 10000) return `${(cr / 1000).toFixed(1)}K Cr`;
  if (cr >= 1000)  return `${Math.round(cr).toLocaleString()} Cr`;
  if (cr >= 100)   return `${Math.round(cr)} Cr`;
  return `${cr.toFixed(1)} Cr`;
}

/** Convert raw share volume → crore string  e.g. 279_933_066 → "28.0 Cr" */
function fmtVolCr(vol: number | null): string {
  if (vol == null) return "—";
  const cr = vol / 1e7;
  if (cr >= 100) return `${Math.round(cr)} Cr`;
  if (cr >= 10)  return `${cr.toFixed(1)} Cr`;
  return `${cr.toFixed(2)} Cr`;
}

interface IndexBlockProps {
  label: string;
  accent: string;
  value: number | null;
  change: number | null;
  changePct?: number | null;
}

function IndexBlock({ label, accent, value, change, changePct }: IndexBlockProps) {
  const isUp   = (change ?? 0) >= 0;
  const isNull = change == null;
  const chgColor = isNull ? "#94A3B8" : isUp ? "#059669" : "#B91C1C";
  const chgBg    = isNull ? "#F1F5F9" : isUp ? "#ECFDF5" : "#FEF2F2";
  const arrow    = isNull ? null : isUp ? "▲" : "▼";

  return (
    <div className="mib-block">
      <span className="mib-block-label" style={{ color: accent, borderColor: accent }}>
        {label}
      </span>
      <span className="mib-block-value">
        {value != null
          ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "—"}
      </span>
      {change != null && (
        <span className="mib-block-badge" style={{ color: chgColor, background: chgBg }}>
          {arrow} {Math.abs(change).toFixed(2)}
          {changePct != null && ` (${Math.abs(changePct).toFixed(2)}%)`}
        </span>
      )}
    </div>
  );
}

interface StatChipProps {
  label: string;
  value: string;
  icon: string;
  accent: string;
  changePct?: number | null;
}

function StatChip({ label, value, icon, accent, changePct }: StatChipProps) {
  const hasChange = changePct != null;
  const isUp = (changePct ?? 0) >= 0;
  const chgColor = isUp ? "#059669" : "#F87171";
  const arrow = isUp ? "▲" : "▼";

  return (
    <div className="mib-chip">
      <span className="mib-chip-icon" style={{ background: accent + "1A", color: accent }}>{icon}</span>
      <div className="mib-chip-body">
        <span className="mib-chip-label">{label}</span>
        <span className="mib-chip-value">{value}</span>
        {hasChange && (
          <span className="mib-chip-change" style={{ color: chgColor }}>
            {arrow} {Math.abs(changePct!).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface BreadcrumbProps {
  up: number | null;
  down: number | null;
  neutral: number | null;
}

function BreadthStrip({ up, down, neutral }: BreadcrumbProps) {
  const total = (up ?? 0) + (down ?? 0) + (neutral ?? 0);
  if (total === 0) return null;

  return (
    <div className="mib-breadth">
      <div className="mib-breadth-item">
        <span className="mib-breadth-dot" style={{ background: "#059669" }} />
        <span className="mib-breadth-count" style={{ color: "#34D399" }}>{up ?? 0}</span>
        <span className="mib-breadth-lbl">Up</span>
      </div>
      <div className="mib-breadth-item">
        <span className="mib-breadth-dot" style={{ background: "#DC2626" }} />
        <span className="mib-breadth-count" style={{ color: "#F87171" }}>{down ?? 0}</span>
        <span className="mib-breadth-lbl">Down</span>
      </div>
      <div className="mib-breadth-item">
        <span className="mib-breadth-dot" style={{ background: "#94A3B8" }} />
        <span className="mib-breadth-count" style={{ color: "#94A3B8" }}>{neutral ?? 0}</span>
        <span className="mib-breadth-lbl">No Change</span>
      </div>
    </div>
  );
}

function CalIcon({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  return (
    <div className="mib-cal-icon">
      <div className="mib-cal-month">{month}</div>
      <div className="mib-cal-day">{day}</div>
    </div>
  );
}

interface Props {
  data: MarketIndexData;
}

export default function MarketIndexBanner({ data }: Props) {
  if (!data.dsex && !data.dses && !data.ds30) return null;

  const overallDown =
    (data.dsex_change ?? 0) < 0 &&
    (data.dses_change ?? 0) < 0 &&
    (data.ds30_change ?? 0) < 0;
  const overallUp =
    (data.dsex_change ?? 0) > 0 &&
    (data.dses_change ?? 0) > 0 &&
    (data.ds30_change ?? 0) > 0;
  const accentBar = overallDown
    ? "linear-gradient(90deg,#DC2626,#F97316,#EF4444)"
    : overallUp
    ? "linear-gradient(90deg,#059669,#10B981,#34D399)"
    : "linear-gradient(90deg,#4F46E5,#7C3AED,#EC4899)";

  return (
    <div className="market-index-banner" role="region" aria-label="DSE Market Indices">
      <div className="mib-accent-bar" style={{ background: accentBar }} />

      <div className="mib-title-row">
        <Link href="/dse-today" className="mib-dse-today-btn">
          DSE Today
        </Link>
      </div>

      <div className="mib-inner">
        {/* Left — index blocks */}
        <div className="mib-indices">
          <IndexBlock
            label="DSEX"
            accent="#818CF8"
            value={data.dsex}
            change={data.dsex_change}
            changePct={data.dsex_change_pct}
          />
          <div className="mib-vsep" />
          <IndexBlock label="DSES" accent="#A78BFA" value={data.dses} change={data.dses_change} />
          <div className="mib-vsep" />
          <IndexBlock label="DS30" accent="#0EA5E9" value={data.ds30}  change={data.ds30_change} />
        </div>

        {/* Middle — breadth */}
        <BreadthStrip
          up={data.up_count}
          down={data.down_count}
          neutral={data.neutral_count}
        />

        {/* Right — stat chips + date */}
        <div className="mib-right">
          <div className="mib-chips">
            <StatChip
              label="Turnover"
              value={`৳ ${fmtCr(data.total_value_mn)}`}
              icon="💰"
              accent="#059669"
              changePct={data.turnover_change_pct}
            />
            <StatChip
              label="Volume"
              value={fmtVolCr(data.total_volume)}
              icon="📊"
              accent="#0EA5E9"
              changePct={data.volume_change_pct}
            />
          </div>
          {data.date && <CalIcon dateStr={data.date} />}
        </div>
      </div>
    </div>
  );
}
