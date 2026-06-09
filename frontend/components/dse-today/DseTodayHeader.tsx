import { abbrev, crore, croreShares, formatDate, pct, signed } from "@/lib/formatters";
import type { MarketIndexData } from "@/lib/api";

type Condition = "falling" | "rising" | "sideways" | "unknown";

interface Props {
  header: MarketIndexData;
  condition: Condition;
}

const CONDITION_META: Record<Condition, { label: string; bg: string; fg: string; border: string }> = {
  rising:   { label: "Rising",   bg: "rgba(22,163,74,0.12)",  fg: "#16a34a", border: "rgba(22,163,74,0.35)" },
  falling:  { label: "Falling",  bg: "rgba(220,38,38,0.12)",  fg: "#dc2626", border: "rgba(220,38,38,0.35)" },
  sideways: { label: "Sideways", bg: "rgba(217,119,6,0.12)",  fg: "#d97706", border: "rgba(217,119,6,0.35)" },
  unknown:  { label: "No Data",  bg: "rgba(107,114,128,0.12)",fg: "#6b7280", border: "rgba(107,114,128,0.35)" },
};

function IndexPill({ name, value, change, changePct }: {
  name: string;
  value: number | null;
  change: number | null;
  changePct?: number | null;
}) {
  const up = (change ?? 0) >= 0;
  const color = up ? "var(--positive)" : "var(--negative)";
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] min-w-[120px]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{name}</div>
      <div className="text-base font-semibold text-[var(--text)] tabular-nums">
        {value != null ? value.toFixed(2) : "—"}
      </div>
      <div className="text-xs font-medium tabular-nums" style={{ color: change != null ? color : "var(--text-muted)" }}>
        {change != null ? signed(change) : "—"}
        {changePct != null && <span className="ml-1 opacity-80">({signed(changePct, 2)}%)</span>}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, subColor }: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="text-base font-semibold text-[var(--text)] tabular-nums">{value}</div>
      {sub && (
        <div className="text-xs font-medium tabular-nums" style={{ color: subColor || "var(--text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function DseTodayHeader({ header, condition }: Props) {
  const cond = CONDITION_META[condition];
  const dateLabel = header.date ? formatDate(header.date) : "Latest";

  const up = header.up_count ?? 0;
  const down = header.down_count ?? 0;
  const flat = header.neutral_count ?? 0;
  const breadthTotal = up + down + flat;
  const upWidth = breadthTotal > 0 ? (up / breadthTotal) * 100 : 0;
  const downWidth = breadthTotal > 0 ? (down / breadthTotal) * 100 : 0;
  const flatWidth = breadthTotal > 0 ? (flat / breadthTotal) * 100 : 0;

  const volSubColor =
    header.volume_change_pct == null
      ? undefined
      : header.volume_change_pct >= 0 ? "var(--positive)" : "var(--negative)";
  const turnSubColor =
    header.turnover_change_pct == null
      ? undefined
      : header.turnover_change_pct >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <section className="mb-6">
      {/* Top row — date + condition */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Trading Day</span>
          <span className="text-sm font-semibold text-[var(--text)]">{dateLabel}</span>
        </div>
        <div
          className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
          style={{ background: cond.bg, color: cond.fg, border: `1px solid ${cond.border}` }}
        >
          Market {cond.label}
        </div>
      </div>

      {/* Indices */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <IndexPill name="DSEX"  value={header.dsex}  change={header.dsex_change}  changePct={header.dsex_change_pct} />
        <IndexPill name="DSES"  value={header.dses}  change={header.dses_change} />
        <IndexPill name="DS30"  value={header.ds30}  change={header.ds30_change} />
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <StatTile
          label="Total Volume"
          value={header.total_volume != null ? croreShares(header.total_volume) : "—"}
          sub={header.volume_change_pct != null ? `${signed(header.volume_change_pct, 2)}% DoD` : undefined}
          subColor={volSubColor}
        />
        <StatTile
          label="Turnover"
          value={header.total_value_mn != null ? crore(header.total_value_mn) : "—"}
          sub={header.turnover_change_pct != null ? `${signed(header.turnover_change_pct, 2)}% DoD` : undefined}
          subColor={turnSubColor}
        />
        <StatTile
          label="Trades"
          value={header.total_trades != null ? abbrev(header.total_trades) : "—"}
        />
      </div>

      {/* Breadth bar */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Market Breadth</span>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            <span style={{ color: "var(--positive)" }}>{up} up</span>
            {" · "}
            <span style={{ color: "var(--negative)" }}>{down} down</span>
            {" · "}
            <span>{flat} flat</span>
          </span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-[var(--bg)]">
          <div style={{ width: `${upWidth}%`, background: "var(--positive)" }} />
          <div style={{ width: `${flatWidth}%`, background: "#9ca3af" }} />
          <div style={{ width: `${downWidth}%`, background: "var(--negative)" }} />
        </div>
        {breadthTotal > 0 && (
          <div className="mt-1.5 text-[10px] text-[var(--text-muted)] tabular-nums">
            {pct((up / breadthTotal) * 100)} advancing
            {" · "}
            {pct((down / breadthTotal) * 100)} declining
          </div>
        )}
      </div>
    </section>
  );
}
