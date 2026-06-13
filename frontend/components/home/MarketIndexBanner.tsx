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

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = d.toLocaleDateString("en-GB", { day: "numeric" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${day} ${month}`;
}

interface HeroProps {
  value: number | null;
  change: number | null;
  changePct: number | null;
}

function HeroDsex({ value, change, changePct }: HeroProps) {
  const isUp = (change ?? 0) >= 0;
  const isNull = change == null;
  const chgColor = isNull ? "var(--text-muted)" : isUp ? "var(--positive)" : "var(--negative)";
  const arrow = isNull ? null : isUp ? "▲" : "▼";

  return (
    <div className="mib-hero">
      <span className="mib-hero-label">DSEX</span>
      <div className="mib-hero-row">
        <span className="mib-hero-value">
          {value != null
            ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "—"}
        </span>
        {change != null && (
          <span className="mib-hero-badge" style={{ color: chgColor }}>
            {arrow} {Math.abs(change).toFixed(2)}
            {changePct != null && (
              <span className="mib-hero-badge-pct">({Math.abs(changePct).toFixed(2)}%)</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

interface MiniProps {
  label: string;
  value: number | null;
  change: number | null;
}

function MiniIndex({ label, value, change }: MiniProps) {
  const isUp = (change ?? 0) >= 0;
  const isNull = change == null;
  const chgColor = isNull ? "var(--text-muted)" : isUp ? "var(--positive)" : "var(--negative)";
  const arrow = isNull ? "" : isUp ? "▲" : "▼";

  return (
    <div className="mib-mini">
      <span className="mib-mini-label">{label}</span>
      <span className="mib-mini-value">
        {value != null
          ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : "—"}
      </span>
      {change != null && (
        <span className="mib-mini-chg" style={{ color: chgColor }}>
          {arrow}{Math.abs(change).toFixed(2)}
        </span>
      )}
    </div>
  );
}

interface BreadthProps {
  up: number | null;
  down: number | null;
  neutral: number | null;
}

function BreadthBar({ up, down, neutral }: BreadthProps) {
  const u = up ?? 0;
  const d = down ?? 0;
  const n = neutral ?? 0;
  const total = u + d + n;
  if (total === 0) return null;

  const upPct = (u / total) * 100;
  const dnPct = (d / total) * 100;
  const ntPct = (n / total) * 100;

  return (
    <div className="mib-breadth">
      <div
        className="mib-breadth-bar"
        role="img"
        aria-label={`${u} advancing, ${d} declining, ${n} unchanged`}
      >
        <span className="mib-breadth-seg mib-breadth-seg-up"   style={{ width: `${upPct}%` }} />
        <span className="mib-breadth-seg mib-breadth-seg-dn"   style={{ width: `${dnPct}%` }} />
        <span className="mib-breadth-seg mib-breadth-seg-flat" style={{ width: `${ntPct}%` }} />
      </div>
      <div className="mib-breadth-counts">
        <span className="mib-breadth-count mib-breadth-up">▲ {u}</span>
        <span className="mib-breadth-count mib-breadth-dn">▼ {d}</span>
        <span className="mib-breadth-count mib-breadth-flat">– {n}</span>
      </div>
    </div>
  );
}

interface ChipProps {
  icon: string;
  label: string;
  value: string;
  changePct?: number | null;
}

function StatChip({ icon, label, value, changePct }: ChipProps) {
  const hasChange = changePct != null;
  const isUp = (changePct ?? 0) >= 0;
  const chgColor = isUp ? "var(--positive)" : "var(--negative)";
  const arrow = isUp ? "▲" : "▼";

  return (
    <div className="mib-chip">
      <span className="mib-chip-icon">{icon}</span>
      <div className="mib-chip-body">
        <span className="mib-chip-label">{label}</span>
        <div className="mib-chip-row">
          <span className="mib-chip-value">{value}</span>
          {hasChange && (
            <span className="mib-chip-change" style={{ color: chgColor }}>
              {arrow} {Math.abs(changePct!).toFixed(1)}%
            </span>
          )}
        </div>
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
    ? "linear-gradient(90deg,var(--negative),#F97316,#EF4444)"
    : overallUp
    ? "linear-gradient(90deg,var(--positive),var(--accent),var(--np-good))"
    : "linear-gradient(90deg,var(--primary),var(--accent),var(--np-cautious))";

  return (
    <section className="market-index-banner" aria-label="DSE Market Indices">
      <div className="mib-accent-bar" style={{ background: accentBar }} />

      <div className="mib-grid">
        <div className="mib-topstrip">
          <div className="mib-live">
            <span className="mib-live-dot" aria-hidden="true" />
            <span className="mib-live-text">LIVE</span>
            {data.date && <span className="mib-live-date">{fmtDate(data.date)}</span>}
          </div>
          <Link href="/market-analysis" className="mib-cta">
            Market Analysis <span aria-hidden="true">→</span>
          </Link>
        </div>

        <HeroDsex value={data.dsex} change={data.dsex_change} changePct={data.dsex_change_pct} />

        <div className="mib-minis">
          <MiniIndex label="DSES" value={data.dses} change={data.dses_change} />
          <div className="mib-mini-sep" aria-hidden="true" />
          <MiniIndex label="DS30" value={data.ds30} change={data.ds30_change} />
        </div>

        <BreadthBar up={data.up_count} down={data.down_count} neutral={data.neutral_count} />

        <div className="mib-chips">
          <StatChip
            icon="💰"
            label="Turnover"
            value={`৳ ${fmtCr(data.total_value_mn)}`}
            changePct={data.turnover_change_pct}
          />
          <StatChip
            icon="📊"
            label="Volume"
            value={fmtVolCr(data.total_volume)}
            changePct={data.volume_change_pct}
          />
        </div>
      </div>
    </section>
  );
}
