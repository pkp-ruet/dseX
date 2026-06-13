import Link from "next/link";
import { type PortfolioHolding, type ScoreItem } from "@/lib/api";
import { analyzePortfolio, portfolioTodayMove, type ComputedRow, type Grade } from "@/lib/portfolio-analysis";
import Card from "@/components/ui/Card";

function compute(holding: PortfolioHolding, priceMap: Map<string, ScoreItem>): ComputedRow {
  const item = priceMap.get(holding.trading_code.toUpperCase());
  const ltp = item?.ltp ?? null;
  const cost_basis = holding.qty * holding.buy_price;
  const current_value = ltp != null ? holding.qty * ltp : null;
  const pnl = current_value != null ? current_value - cost_basis : null;
  const pnl_pct = pnl != null && cost_basis > 0 ? (pnl / cost_basis) * 100 : null;
  return { holding, ltp, company_name: item?.company_name ?? null, cost_basis, current_value, pnl, pnl_pct };
}

const GRADE_COLOR: Record<Grade, string> = {
  A: "var(--positive)",
  B: "var(--positive)",
  C: "var(--watch)",
  D: "var(--watch)",
  F: "var(--negative)",
};

export default function PortfolioSummaryCard({
  holdings,
  priceMap,
}: {
  holdings: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
}) {
  const rows = holdings.map((h) => compute(h, priceMap));
  let invested = 0;
  let value = 0;
  let hasPrice = false;
  for (const r of rows) {
    invested += r.cost_basis;
    if (r.current_value != null) {
      value += r.current_value;
      hasPrice = true;
    }
  }
  const pnl = hasPrice ? value - invested : null;
  const pnlPct = pnl != null && invested > 0 ? (pnl / invested) * 100 : null;
  const up = (pnl ?? 0) >= 0;

  const today = portfolioTodayMove(holdings, priceMap);
  const todayUp = (today?.delta ?? 0) >= 0;

  const analysis = analyzePortfolio(rows, priceMap);
  const gradeColor = GRADE_COLOR[analysis.grade];

  return (
    <Card as="section" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border)]">
        <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Your Portfolio</h2>
        <Link href="/portfolio" className="text-xs font-semibold text-[var(--primary)] hover:underline">Manage →</Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4">
        {/* Grade */}
        <div className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 shrink-0" style={{ color: gradeColor, borderColor: gradeColor, background: "var(--surface-2)" }}>
          <span className="text-2xl sm:text-3xl font-black leading-none">{analysis.grade}</span>
          <span className="text-[0.5rem] font-bold uppercase tracking-wide">{analysis.gradeLabel}</span>
        </div>
        {/* Value + P/L */}
        <div className="min-w-0 flex-1">
          <div className="text-[0.58rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">Current value</div>
          <div className="text-[clamp(1.25rem,6vw,1.6rem)] font-extrabold tabular-nums nums text-[var(--text)] leading-tight">
            {hasPrice ? `৳${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
          </div>
          {today && (
            <div
              className="mt-0.5 text-[0.8rem] sm:text-sm font-bold tabular-nums nums leading-tight"
              style={{ color: todayUp ? "var(--positive)" : "var(--negative)" }}
            >
              {todayUp ? "▲" : "▼"} {todayUp ? "+" : "−"}৳
              {Math.abs(today.delta).toLocaleString("en-US", { maximumFractionDigits: 0 })} ({todayUp ? "+" : ""}
              {today.pct.toFixed(2)}%) today
            </div>
          )}
          <div className="mt-0.5 text-[0.72rem] sm:text-[0.8rem] font-semibold tabular-nums nums leading-tight break-words text-[var(--text-muted)]">
            {pnl == null
              ? "Total P/L —"
              : `Total ${up ? "+" : "-"}৳${Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 0 })} (${up ? "+" : ""}${pnlPct!.toFixed(1)}%)`}
          </div>
        </div>
      </div>

      {/* Verdict headline */}
      <p className="px-4 sm:px-5 pb-3 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
        {analysis.headline}
      </p>

      <Link
        href="/portfolio#portfolio-analysis"
        className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        See full portfolio analysis →
      </Link>
    </Card>
  );
}
