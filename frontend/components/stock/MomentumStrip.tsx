import type { MomentumSnapshot } from "@/lib/api";
import { momentumSummary, type MomentumTone } from "@/lib/plain-language";
import { crore } from "@/lib/formatters";
import Card from "@/components/ui/Card";

interface Props {
  momentum: MomentumSnapshot | null;
}

const TONE_COLOR: Record<MomentumTone, string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  watch: "var(--watch)",
  neutral: "var(--text-muted)",
};

function signedPct(v: number | null, decimals = 1): string {
  if (v == null) return "--";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

export default function MomentumStrip({ momentum }: Props) {
  if (!momentum) return null;
  const summary = momentumSummary(momentum);
  if (!summary) return null;

  const toneColor = TONE_COLOR[summary.tone];
  const r7 = momentum.return_7d_pct;
  const rs = momentum.rs_vs_dsex_pct;
  const vr = momentum.volume_ratio;
  const up = momentum.up_days_7d;
  const days = momentum.days_counted;
  const pos = momentum.pct_in_52w_range;
  const turnover = momentum.avg_turnover_7d_mn;

  const tiles: { label: string; value: string; sub: string; color?: string }[] = [
    {
      label: "Past week",
      value: signedPct(r7),
      sub: "Price move over 7 days",
      color: r7 == null ? undefined : r7 >= 0 ? "var(--positive)" : "var(--negative)",
    },
    {
      label: "Vs market",
      value: signedPct(rs),
      sub: "Ahead/behind the DSEX index",
      color: rs == null ? undefined : rs >= 0 ? "var(--positive)" : "var(--negative)",
    },
    {
      label: "Trading volume",
      value: vr != null ? `${vr.toFixed(1)}×` : "--",
      sub: "vs its normal volume",
      color: vr == null ? undefined : vr >= 1.3 ? "var(--positive)" : vr <= 0.7 ? "var(--watch)" : undefined,
    },
    {
      label: "Up days",
      value: up != null && days != null && days > 0 ? `${up}/${days}` : "--",
      sub: "Green days this week",
    },
    {
      label: "52-week spot",
      value: pos != null ? `${Math.round(pos)}%` : "--",
      sub: "Position in 1-year range",
    },
  ];

  return (
    <section id="momentum" className="mb-8 scroll-mt-[112px]">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Recent Momentum
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        What the share price has been doing over the last week.
      </p>

      <Card padding="none" className="rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center text-sm font-bold px-3 py-1.5 rounded-full"
            style={{
              color: toneColor,
              background: `color-mix(in srgb, ${toneColor} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${toneColor} 35%, transparent)`,
            }}
          >
            {summary.word}
          </span>
        </div>
        <p className="text-sm leading-snug mt-3" style={{ color: "var(--text-muted)" }}>
          {summary.line}
        </p>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} padding="none" className="rounded-2xl p-4">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              {t.label}
            </p>
            <p
              className="text-2xl font-bold tabular-nums nums leading-none"
              style={{ color: t.color ?? "var(--text)" }}
            >
              {t.value}
            </p>
            {/* 52-week range bar under the position tile */}
            {t.label === "52-week spot" && pos != null && (
              <div
                className="mt-2 h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, Math.min(100, pos))}%`,
                    background: "var(--primary)",
                  }}
                />
              </div>
            )}
            <p className="text-xs mt-2 leading-snug" style={{ color: "var(--text-muted)" }}>
              {t.sub}
            </p>
          </Card>
        ))}
      </div>

      {turnover != null && (
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          Trades around {crore(turnover)} a day on average over the past week.
        </p>
      )}
    </section>
  );
}
