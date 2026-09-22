import Link from "next/link";
import type { ReactNode } from "react";
import Bn from "@/components/i18n/Bn";
import TierPill from "@/components/ui/TierPill";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { TierBar } from "@/components/sector/SectorCard";
import { TIER_LABELS, type TierKey } from "@/lib/constants";
import { crore, pct, taka } from "@/lib/formatters";
import type { SectorSummary } from "@/lib/api";

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

const CLASS_CHIP: Record<string, { label: string; color: string }> = {
  BANK: { label: "Bank", color: "var(--info)" },
  NBFI: { label: "Financial institution", color: "var(--info)" },
  INSURANCE: { label: "Insurance", color: "var(--primary)" },
  GENERAL: { label: "General industry", color: "var(--text-muted)" },
};

function Stat({ label, value, sub, accent }: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-2.5 sm:p-3"
      style={{
        background: accent ? `color-mix(in srgb, ${accent} 7%, var(--surface-2))` : "var(--surface-2)",
        borderColor: accent ? `color-mix(in srgb, ${accent} 26%, var(--border))` : "var(--border)",
      }}
    >
      <span
        className="text-xs font-extrabold uppercase tracking-[0.14em]"
        style={{ color: accent ?? "var(--text-muted)" }}
      >
        {label}
      </span>
      <span className="text-base font-extrabold leading-none tabular-nums text-text-main sm:text-xl">
        {value}
      </span>
      <span className="text-xs font-bold tabular-nums text-text-muted">
        {sub || " "}
      </span>
    </div>
  );
}

function MoverLine({ label, brief }: {
  label: string;
  brief: SectorSummary["best_today"];
}) {
  if (!brief) return null;
  const chg = brief.change_pct;
  const color = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm font-semibold">
      <span className="text-text-muted">{label}</span>
      <span className="tabular-nums">
        <Link href={`/stock/${brief.trading_code}`} className="font-extrabold text-text-main hover:text-primary">
          {brief.trading_code}
        </Link>
        <span className="ml-2" style={{ color }}>
          {chg != null ? `${chg > 0 ? "+" : ""}${pct(chg, 2)}` : "—"}
        </span>
      </span>
    </div>
  );
}

/** Sector header card: size, valuation, today's move, and the tier mix. */
export default function SectorHero({ summary: s }: { summary: SectorSummary }) {
  const chip = CLASS_CHIP[s.sector_class] ?? CLASS_CHIP.GENERAL;
  const chg = s.avg_change_pct;
  const chgColor =
    chg == null ? "var(--text-muted)" : chg > 0 ? "var(--positive)" : chg < 0 ? "var(--negative)" : "var(--text-muted)";
  const rs = s.avg_rs_vs_dsex_pct;

  return (
    <section className="soft-card overflow-hidden mb-6">
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${chip.color}, color-mix(in srgb, ${chip.color} 30%, transparent))`,
        }}
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider"
            style={{
              color: chip.color,
              background: `color-mix(in srgb, ${chip.color} 12%, var(--surface))`,
              border: `1px solid color-mix(in srgb, ${chip.color} 30%, var(--border))`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.color }} />
            Scored as {chip.label}
          </span>
          <span className="text-sm font-bold tabular-nums text-text-muted">
            {s.company_count} companies · {crore(s.total_mcap_mn)} market value
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Stat
            label="Median score"
            value={<ScoreBadge score={s.median_score} size="sm" />}
            sub="the middle company"
            accent="var(--primary)"
          />
          <Stat label="Median P/E" value={s.median_pe != null ? s.median_pe.toFixed(1) : "—"} sub={s.median_pb != null ? `P/B ${s.median_pb.toFixed(2)}` : undefined} />
          <Stat
            label="Median yield"
            value={s.median_yield_pct != null ? pct(s.median_yield_pct, 1) : "—"}
            sub={s.median_roe_pct != null ? `ROE ${pct(s.median_roe_pct, 1)}` : undefined}
            accent="var(--positive)"
          />
          <Stat
            label="Today"
            value={chg != null ? `${chg > 0 ? "+" : ""}${pct(chg, 2)}` : "—"}
            sub={
              s.avg_return_7d_pct != null
                ? `${s.avg_return_7d_pct > 0 ? "+" : ""}${pct(s.avg_return_7d_pct, 1)} in 7 days`
                : undefined
            }
            accent={chgColor}
          />
        </div>

        {/* Tier mix */}
        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-text-muted">
              Strength mix
            </span>
            <span className="text-xs font-bold tabular-nums text-text-muted">
              {s.buy_signals} with a buy signal
            </span>
          </div>
          <TierBar counts={s.tier_counts} total={s.company_count} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {TIER_ORDER.filter((t) => s.tier_counts[t]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted">
                <TierPill tier={t} />
                {s.tier_counts[t]}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-2 p-3">
            <MoverLine label="Best today" brief={s.best_today} />
            <MoverLine label="Worst today" brief={s.worst_today} />
            {s.top_ranked && (
              <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="text-text-muted">Top ranked</span>
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <Link
                    href={`/stock/${s.top_ranked.trading_code}`}
                    className="font-extrabold text-text-main hover:text-primary"
                  >
                    {s.top_ranked.trading_code}
                  </Link>
                  {s.top_ranked.ltp != null && (
                    <span className="text-text-muted">{taka(s.top_ranked.ltp)}</span>
                  )}
                  <ScoreBadge score={s.top_ranked.score} size="sm" />
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-sm font-medium leading-relaxed text-text-main">
              {rs != null
                ? `Over the last 7 days this sector ran ${Math.abs(rs).toFixed(1)}% ${rs >= 0 ? "ahead of" : "behind"} DSEX on average. `
                : ""}
              {s.tier_counts.excellent + s.tier_counts.good > 0
                ? `${s.tier_counts.excellent + s.tier_counts.good} of ${s.company_count} companies here score ${TIER_LABELS.good} or better.`
                : `No company here currently scores ${TIER_LABELS.good} or better.`}
            </p>
            <Bn className="mt-2 text-sm font-medium leading-[1.85] text-text-muted">
              এই সেক্টরে {s.company_count}টি কোম্পানির মধ্যে{" "}
              {s.tier_counts.excellent + s.tier_counts.good}টি ভালো বা তার উপরে স্কোর করেছে।
            </Bn>
          </div>
        </div>
      </div>
    </section>
  );
}
