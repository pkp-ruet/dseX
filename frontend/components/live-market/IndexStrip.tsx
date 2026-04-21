"use client";
import type { LiveIndexData } from "@/lib/api";

interface Props {
  index: LiveIndexData | null | undefined;
}

function IndexCard({
  label,
  value,
  change,
  changePct,
}: {
  label: string;
  value: number | null | undefined;
  change: number | null | undefined;
  changePct?: number | null;
}) {
  const up = (change ?? 0) >= 0;
  const color = up ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400";
  const sign = up ? "+" : "";

  return (
    <div className="flex-1 min-w-[140px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3">
      <div className="text-xs text-[var(--text-muted)] font-medium mb-1">{label}</div>
      <div className="text-xl font-bold text-[var(--text)] tabular-nums">
        {value != null ? value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
      </div>
      {change != null && (
        <div className={`text-xs font-medium mt-0.5 ${color}`}>
          {sign}{change.toFixed(2)}
          {changePct != null && <span className="ml-1 opacity-80">({sign}{changePct.toFixed(2)}%)</span>}
        </div>
      )}
    </div>
  );
}

export default function IndexStrip({ index }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <IndexCard
        label="DSEX"
        value={index?.dsex}
        change={index?.dsex_change}
        changePct={index?.dsex_change_pct}
      />
      <IndexCard label="DS30" value={index?.ds30} change={index?.ds30_change} />
      <IndexCard label="DSES" value={index?.dses} change={index?.dses_change} />
    </div>
  );
}
