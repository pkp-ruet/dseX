import type { ComputedRow, PortfolioAnalysis } from "@/lib/portfolio-analysis";
import { taka } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import { T } from "@/components/i18n/T";
import type { ReactNode } from "react";

interface Props {
  rows: ComputedRow[];
  analysis: PortfolioAnalysis;
}

export default function SamplePortfolioStats({ rows, analysis }: Props) {
  let totalCost = 0;
  let totalValue = 0;
  let hasPrice = false;
  for (const r of rows) {
    totalCost += r.cost_basis;
    if (r.current_value != null) {
      totalValue += r.current_value;
      hasPrice = true;
    }
  }
  const pnl = hasPrice ? totalValue - totalCost : null;
  const pnlPct = pnl != null && totalCost > 0 ? (pnl / totalCost) * 100 : null;
  const distinctSectors = analysis.sectorSpread.length;

  const pnlColor =
    pnl == null
      ? "text-text-main"
      : pnl > 0
        ? "text-positive"
        : pnl < 0
          ? "text-negative"
          : "text-text-main";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat label={<T en="Shares" bn="শেয়ার" />} value={String(rows.length)} />
      <Stat label={<T en="Sectors" bn="সেক্টর" />} value={String(distinctSectors)} />
      <Stat label={<T en="Money put in" bn="বিনিয়োগ" />} value={taka(totalCost, 0)} />
      <Stat
        label={<T en="Profit or loss now" bn="এখন লাভ বা লোকসান" />}
        value={
          pnl == null
            ? "—"
            : `${pnl > 0 ? "+" : ""}${taka(pnl, 0)}${
                pnlPct != null ? ` (${pnlPct > 0 ? "+" : ""}${pnlPct.toFixed(1)}%)` : ""
              }`
        }
        valueClass={pnlColor}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: ReactNode;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card padding="none" className="p-4">
      <p className="text-xs text-text-muted   mb-1">{label}</p>
      <p className={`text-base sm:text-lg font-bold nums ${valueClass ?? "text-text-main"}`}>
        {value}
      </p>
    </Card>
  );
}
