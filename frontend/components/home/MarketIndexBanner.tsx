import { formatDate } from "@/lib/formatters";
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

/** Raw trade count → compact string  e.g. 222205 → "2.2L" */
function fmtTrades(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

interface IndexBlockProps {
  label: string;
  accent: string;          // CSS color for accent
  value: number | null;
  change: number | null;
  changePct?: number | null;
}

function IndexBlock({ label, accent, value, change, changePct }: IndexBlockProps) {
  const isUp   = (change ?? 0) >= 0;
  const isNull = change == null;
  const chgColor = isNull ? "#94A3B8" : isUp ? "#059669" : "#DC2626";
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
}

function StatChip({ label, value, icon, accent }: StatChipProps) {
  return (
    <div className="mib-chip">
      <span className="mib-chip-icon" style={{ background: accent + "1A", color: accent }}>{icon}</span>
      <div className="mib-chip-body">
        <span className="mib-chip-label">{label}</span>
        <span className="mib-chip-value">{value}</span>
      </div>
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
      {/* Top accent bar */}
      <div className="mib-accent-bar" style={{ background: accentBar }} />

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
          <IndexBlock label="DSES" accent="#7C3AED" value={data.dses} change={data.dses_change} />
          <div className="mib-vsep" />
          <IndexBlock label="DS30" accent="#0EA5E9" value={data.ds30}  change={data.ds30_change} />
        </div>

        {/* Right — stat chips + date */}
        <div className="mib-right">
          <div className="mib-chips">
            <StatChip
              label="Turnover"
              value={`৳ ${fmtCr(data.total_value_mn)}`}
              icon="💰"
              accent="#059669"
            />
            <StatChip
              label="Volume"
              value={fmtVolCr(data.total_volume)}
              icon="📊"
              accent="#0EA5E9"
            />
            <StatChip
              label="Trades"
              value={fmtTrades(data.total_trades)}
              icon="🔄"
              accent="#7C3AED"
            />
          </div>
          {data.date && (
            <div className="mib-date-badge">
              <span className="mib-date-dot" />
              {formatDate(data.date)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
