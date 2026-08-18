import Link from "next/link";
import { TIER_VAR, type TierKey } from "@/lib/constants";
import { crore, pct } from "@/lib/formatters";
import type { SectorSummary } from "@/lib/api";

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

/** Tier mix as one thin bar — how many strong vs weak companies the sector holds. */
export function TierBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (!total) return null;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-[0.86rem] font-extrabold leading-none tabular-nums text-[var(--text)]">
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
      className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-extrabold leading-tight tracking-tight text-[var(--text)]">
            {s.sector}
          </h3>
          <p className="mt-1 text-[0.74rem] font-semibold text-[var(--text-muted)]">
            {s.company_count} companies · {crore(s.total_mcap_mn)}
          </p>
        </div>
        <span className="text-[0.86rem] font-extrabold tabular-nums" style={{ color: chgColor }}>
          {chg != null ? `${chg > 0 ? "+" : ""}${pct(chg, 2)}` : "—"}
        </span>
      </div>

      <TierBar counts={s.tier_counts} total={s.company_count} />

      <div className="grid grid-cols-4 gap-2">
        <Metric label="Score" value={s.median_score != null ? s.median_score.toFixed(0) : "—"} />
        <Metric label="P/E" value={s.median_pe != null ? s.median_pe.toFixed(1) : "—"} />
        <Metric
          label="Yield"
          value={s.median_yield_pct != null ? pct(s.median_yield_pct, 1) : "—"}
        />
        <Metric label="Buy" value={String(s.buy_signals)} />
      </div>

      {s.top_ranked && (
        <p className="truncate text-[0.74rem] font-semibold text-[var(--text-muted)]">
          Top ranked:{" "}
          <span className="font-extrabold text-[var(--text)]">{s.top_ranked.trading_code}</span>
          {s.top_ranked.score != null && ` · ${s.top_ranked.score.toFixed(0)}/100`}
        </p>
      )}
    </Link>
  );
}
