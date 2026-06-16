import { abbrev, crore, croreShares, formatDate, pct, signed } from "@/lib/formatters";
import type { MarketIndexData } from "@/lib/api";

type Condition = "falling" | "rising" | "sideways" | "unknown";

interface Props {
  header: MarketIndexData;
  condition: Condition;
}

const CONDITION_META: Record<Condition, { label: string; color: string }> = {
  rising:   { label: "Market Rising",   color: "var(--positive)" },
  falling:  { label: "Market Falling",  color: "var(--negative)" },
  sideways: { label: "Market Sideways", color: "var(--warm)" },
  unknown:  { label: "No Data",         color: "var(--text-muted)" },
};

/** A single index quote (DSEX / DSES / DS30). DSEX is emphasised as the lead. */
function IndexTile({ name, value, change, changePct, lead = false }: {
  name: string;
  value: number | null;
  change: number | null;
  changePct?: number | null;
  lead?: boolean;
}) {
  const hasChange = change != null;
  const up = (change ?? 0) >= 0;
  const color = hasChange ? (up ? "var(--positive)" : "var(--negative)") : "var(--text-muted)";

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-2.5 sm:p-3"
      style={{
        background: lead
          ? "color-mix(in srgb, var(--primary) 6%, var(--surface-2))"
          : "var(--surface-2)",
        borderColor: lead
          ? "color-mix(in srgb, var(--primary) 24%, var(--border))"
          : "var(--border)",
      }}
    >
      <span
        className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
        style={{ color: lead ? "var(--primary-ink)" : "var(--text-muted)" }}
      >
        {name}
      </span>
      <span className="text-base sm:text-xl font-extrabold leading-none tabular-nums text-[var(--text)]">
        {value != null ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
      </span>
      <span className="flex items-baseline gap-1 text-[11px] sm:text-xs font-bold tabular-nums" style={{ color }}>
        {hasChange ? (
          <>
            <span className="text-[9px]">{up ? "▲" : "▼"}</span>
            {signed(change)}
            {changePct != null && <span className="opacity-75">({signed(changePct, 2)}%)</span>}
          </>
        ) : (
          "—"
        )}
      </span>
    </div>
  );
}

/** A market-total stat (volume / turnover / trades) with optional day-over-day sub. */
function StatTile({ label, value, sub, subColor }: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 sm:p-3">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-sm sm:text-lg font-extrabold leading-none tabular-nums text-[var(--text)]">
        {value}
      </span>
      <span className="text-[11px] font-bold tabular-nums" style={{ color: subColor || "var(--text-muted)" }}>
        {sub || " "}
      </span>
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
  const flatColor = "color-mix(in srgb, var(--text-muted) 45%, var(--surface-2))";

  const volSubColor =
    header.volume_change_pct == null
      ? undefined
      : header.volume_change_pct >= 0 ? "var(--positive)" : "var(--negative)";
  const turnSubColor =
    header.turnover_change_pct == null
      ? undefined
      : header.turnover_change_pct >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <section className="soft-card overflow-hidden mb-6">
      {/* Condition accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${cond.color}, color-mix(in srgb, ${cond.color} 30%, transparent))` }}
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Top — date + condition */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Trading Day
            </span>
            <span className="text-sm font-bold text-[var(--text)]">{dateLabel}</span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider"
            style={{
              color: cond.color,
              background: `color-mix(in srgb, ${cond.color} 12%, var(--surface))`,
              border: `1px solid color-mix(in srgb, ${cond.color} 30%, var(--border))`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cond.color }} />
            {cond.label}
          </span>
        </div>

        {/* Indices */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <IndexTile name="DSEX" value={header.dsex} change={header.dsex_change} changePct={header.dsex_change_pct} lead />
          <IndexTile name="DSES" value={header.dses} change={header.dses_change} />
          <IndexTile name="DS30" value={header.ds30} change={header.ds30_change} />
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile
            label="Volume"
            value={header.total_volume != null ? croreShares(header.total_volume) : "—"}
            sub={header.volume_change_pct != null ? `${signed(header.volume_change_pct, 1)}% DoD` : undefined}
            subColor={volSubColor}
          />
          <StatTile
            label="Turnover"
            value={header.total_value_mn != null ? crore(header.total_value_mn) : "—"}
            sub={header.turnover_change_pct != null ? `${signed(header.turnover_change_pct, 1)}% DoD` : undefined}
            subColor={turnSubColor}
          />
          <StatTile
            label="Trades"
            value={header.total_trades != null ? abbrev(header.total_trades) : "—"}
          />
        </div>

        {/* Breadth */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Market Breadth
            </span>
            <span className="text-[11px] font-bold tabular-nums">
              <span style={{ color: "var(--positive)" }}>{up} up</span>
              <span className="text-[var(--text-muted)]"> · </span>
              <span style={{ color: "var(--negative)" }}>{down} down</span>
              <span className="text-[var(--text-muted)]"> · {flat} flat</span>
            </span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--bg)]">
            <div style={{ width: `${upWidth}%`, background: "var(--positive)" }} />
            <div style={{ width: `${flatWidth}%`, background: flatColor }} />
            <div style={{ width: `${downWidth}%`, background: "var(--negative)" }} />
          </div>
          {breadthTotal > 0 && (
            <div className="mt-1.5 text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">
              {pct((up / breadthTotal) * 100)} advancing · {pct((down / breadthTotal) * 100)} declining
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
