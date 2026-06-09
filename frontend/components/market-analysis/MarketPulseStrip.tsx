import type { MarketIndexData } from "@/lib/api";
import { taka, pct, crore, croreShares, signed } from "@/lib/formatters";

interface Props {
  data: MarketIndexData;
}

function ChangeChip({ value }: { value: number | null }) {
  if (value == null) return <span className="text-[var(--text-muted)] text-xs">—</span>;
  const pos = value >= 0;
  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded"
      style={{
        color: pos ? "var(--positive)" : "var(--negative)",
        background: pos ? "rgba(5,150,105,0.12)" : "rgba(220,38,38,0.12)",
      }}
    >
      {value >= 0 ? "+" : ""}{pct(value)}
    </span>
  );
}

export default function MarketPulseStrip({ data }: Props) {
  const up = data.up_count ?? 0;
  const down = data.down_count ?? 0;
  const neutral = data.neutral_count ?? 0;
  const total = up + down + neutral || 1;

  const upPct = (up / total) * 100;
  const neutralPct = (neutral / total) * 100;
  const downPct = (down / total) * 100;

  return (
    <div className="intel-signal-card intel-signal-card--full mb-4">
      <div className="intel-signal-title" style={{ color: "var(--primary)" }}>Market Pulse</div>
      <div className="intel-signal-desc">Live breadth, index performance, and volume activity.</div>

      <div className="grid grid-cols-1 gap-4 mt-3 sm:grid-cols-3">
        {/* Breadth */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Market Breadth</div>
          <div className="flex rounded-full overflow-hidden h-3 w-full mb-2">
            <div style={{ width: `${upPct}%`, background: "var(--positive)" }} />
            <div style={{ width: `${neutralPct}%`, background: "var(--border)" }} />
            <div style={{ width: `${downPct}%`, background: "var(--negative)" }} />
          </div>
          <div className="flex gap-3 text-xs text-[var(--text-muted)]">
            <span style={{ color: "var(--positive)" }}>▲ {up} up</span>
            <span>— {neutral}</span>
            <span style={{ color: "var(--negative)" }}>▼ {down} down</span>
          </div>
        </div>

        {/* Indices */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Indices</div>
          <div className="flex flex-col gap-1">
            {(() => {
              const computePct = (val: number | null, chg: number | null) =>
                val != null && chg != null && val - chg !== 0
                  ? (chg / (val - chg)) * 100
                  : null;
              return [
                { label: "DSEX", val: data.dsex, chg: data.dsex_change_pct ?? computePct(data.dsex, data.dsex_change) },
                { label: "DS30", val: data.ds30, chg: computePct(data.ds30, data.ds30_change) },
                { label: "DSES", val: data.dses, chg: computePct(data.dses, data.dses_change) },
              ];
            })().map(({ label, val, chg }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text)]">
                    {val != null ? val.toLocaleString("en-BD", { maximumFractionDigits: 1 }) : "—"}
                  </span>
                  <ChangeChip value={chg ?? null} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div>
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Volume & Turnover</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Volume</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text)]">
                  {data.total_volume != null ? croreShares(data.total_volume) : "—"}
                </span>
                <ChangeChip value={data.volume_change_pct ?? null} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Turnover</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text)]">
                  {data.total_value_mn != null ? crore(data.total_value_mn) : "—"}
                </span>
                <ChangeChip value={data.turnover_change_pct ?? null} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Trades</span>
              <span className="text-xs font-semibold text-[var(--text)]">
                {data.total_trades != null ? data.total_trades.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
