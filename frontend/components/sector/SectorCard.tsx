import Link from "next/link";
import type { ReactNode } from "react";
import { TIER_VAR, type TierKey } from "@/lib/constants";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { crore, pct } from "@/lib/formatters";
import type { SectorSummary } from "@/lib/api";

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

/** Tier mix as one thin bar — how many strong vs weak companies the sector holds. */
export function TierBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (!total) return null;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
      {TIER_ORDER.map((t) =>
        counts[t] ? (
          <div
            key={t}
            style={{ width: `${(counts[t] / total) * 100}%`, background: TIER_VAR[t] }}
            title={`${counts[t]} ${t}`}
          />
        ) : null,
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-text-muted">
        {label}
      </span>
      <span className="text-sm font-extrabold leading-none tabular-nums text-text-main">
        {value}
      </span>
    </div>
  );
}

/** One sector as a card — used on the /sectors hub and in the related row. */
export default function SectorCard({ sector: s }: { sector: SectorSummary }) {
  const chg = s.avg_change_pct;
  const chgColor =
    chg == null ? "var(--text-muted)" : chg > 0 ? "var(--positive)" : chg < 0 ? "var(--negative)" : "var(--text-muted)";

  return (
    <Link
      href={`/sector/${s.slug}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 transition hover:border-primary/40 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold leading-tight tracking-tight text-text-main">
            {s.sector}
          </h3>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {s.company_count} companies · {crore(s.total_mcap_mn)}
          </p>
        </div>
        <span className="text-sm font-extrabold tabular-nums" style={{ color: chgColor }}>
          {chg != null ? `${chg > 0 ? "+" : ""}${pct(chg, 2)}` : "—"}
        </span>
      </div>

      <TierBar counts={s.tier_counts} total={s.company_count} />

      <div className="grid grid-cols-4 gap-2">
        <Metric label="Score" value={<ScoreBadge score={s.median_score} size="sm" />} />
        <Metric label="P/E" value={s.median_pe != null ? s.median_pe.toFixed(1) : "—"} />
        <Metric
          label="Yield"
          value={s.median_yield_pct != null ? pct(s.median_yield_pct, 1) : "—"}
        />
        <Metric label="Buy" value={String(s.buy_signals)} />
      </div>

      {s.top_ranked && (
        <p className="flex items-center gap-2 text-xs font-semibold text-text-muted">
          <span className="min-w-0 truncate">
            Top ranked:{" "}
            <span className="font-extrabold text-text-main">{s.top_ranked.trading_code}</span>
          </span>
          <ScoreBadge score={s.top_ranked.score} size="sm" />
        </p>
      )}
    </Link>
  );
}
