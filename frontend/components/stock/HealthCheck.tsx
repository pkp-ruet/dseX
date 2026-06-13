"use client";
import { useState } from "react";
import { pillarHealthCheck, HEALTH_PILLAR_ORDER, type HealthCheckRow, type HealthStatus } from "@/lib/plain-language";
import { pillarColor } from "@/lib/insight-utils";
import {
  normalizeExtFinancials, roe3yAvg, debtToEquity, interestCoverage,
  cashFlowQuality, grossMargin, netMargin, toNum,
} from "@/lib/stock-metrics";
import type { CompanyDetail } from "@/lib/api";
import Card from "@/components/ui/Card";

type ScoreRow = Record<string, number | string | boolean | null>;

interface Props {
  scoreRow: ScoreRow;
  detail: CompanyDetail;
}

const STATUS_TONE: Record<HealthStatus, { color: string; bg: string; border: string; icon: string }> = {
  strong: { color: "var(--positive)", bg: "rgba(21,128,61,0.08)",  border: "rgba(21,128,61,0.25)",  icon: "✓" },
  fair:   { color: "var(--watch)",    bg: "rgba(180,83,9,0.07)",   border: "rgba(180,83,9,0.2)",    icon: "•" },
  weak:   { color: "var(--negative)", bg: "rgba(220,38,38,0.07)",  border: "rgba(220,38,38,0.22)",  icon: "⚠" },
};

// Sub-metric keys per pillar + plain-English labels.
const PILLAR_SUBS: Record<string, { key: string; label: string }[]> = {
  p1_biz: [
    { key: "p1_eps_consist", label: "Profitable years" },
    { key: "p1_eps_cagr", label: "Earnings growth" },
    { key: "p1_roe", label: "Return on equity" },
    { key: "p1_npm_trend", label: "Margin trend" },
  ],
  p2_health: [
    { key: "p2_de", label: "Low debt" },
    { key: "p2_ic", label: "Covers interest" },
    { key: "p2_cfo", label: "Cash from profit" },
    { key: "p2_cash", label: "Cash cushion" },
  ],
  p3_moat: [
    { key: "p3_margin", label: "Profit margin" },
    { key: "p3_rev_vol", label: "Steady sales" },
    { key: "p3_sector_rank", label: "Sector standing" },
    { key: "p3_capex", label: "Capital spending" },
  ],
  p4_val: [
    { key: "p4_pe", label: "P/E value" },
    { key: "p4_pb", label: "P/B value" },
  ],
  p5_div: [
    { key: "p5_dps_cagr", label: "Dividend growth" },
    { key: "p5_consist", label: "Pays consistently" },
    { key: "p5_yield", label: "Dividend yield" },
  ],
};

/** Real computed figures shown alongside the sub-score bars. */
function pillarNumbers(pillarKey: string, detail: CompanyDetail): { label: string; value: string }[] {
  const rows = normalizeExtFinancials(detail.extended_financials);
  const last = rows[rows.length - 1];
  const sr = detail.score_row ?? {};
  const out: { label: string; value: string }[] = [];
  const pct = (v: number | null) => (v == null ? null : `${v.toFixed(1)}%`);
  const x = (v: number | null) => (v == null ? null : `${v.toFixed(1)}×`);

  const push = (label: string, val: string | null) => { if (val != null) out.push({ label, value: val }); };

  switch (pillarKey) {
    case "p1_biz":
      push("Return on equity (3y avg)", pct(roe3yAvg(rows)));
      push("Net margin", last ? pct(netMargin(last.net_profit, last.revenue ?? last.net_interest_income)) : null);
      break;
    case "p2_health":
      push("Debt to equity", last ? x(debtToEquity(last.total_debt, last.total_equity)) : null);
      push("Interest coverage", last ? x(interestCoverage(last.ebit, last.interest_expense)) : null);
      push("Cash flow vs profit", last ? x(cashFlowQuality(last.operating_cf, last.net_profit)) : null);
      break;
    case "p3_moat":
      push("Gross margin", last ? pct(grossMargin(last.gross_profit, last.revenue ?? last.net_interest_income)) : null);
      break;
    case "p4_val": {
      const pe = toNum(sr.current_pe as number | null);
      const pb = toNum(sr.current_pb as number | null);
      const avgPe = toNum(sr.own_avg_pe as number | null);
      push("Current P/E", pe != null ? pe.toFixed(1) : null);
      push("5-year average P/E", avgPe != null ? avgPe.toFixed(1) : null);
      push("Current P/B", pb != null ? pb.toFixed(1) : null);
      break;
    }
    case "p5_div":
      push("Dividend yield", pct(toNum(sr.div_yield_pct as number | null)));
      break;
  }
  return out;
}

export default function HealthCheck({ scoreRow, detail }: Props) {
  const rows = HEALTH_PILLAR_ORDER
    .map((key) => pillarHealthCheck(key, scoreRow[key] as number | null))
    .filter((r): r is HealthCheckRow => r != null);

  if (rows.length === 0) return null;

  return (
    <section id="health" className="mb-8 scroll-mt-[112px]">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        The Health Check
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Five quick checks that tell you whether this company is healthy, fairly priced, and worth holding.
      </p>

      <div className="space-y-2.5">
        {rows.map((row) => (
          <HealthRow key={row.pillarKey} row={row} scoreRow={scoreRow} detail={detail} />
        ))}
      </div>
    </section>
  );
}

function HealthRow({ row, scoreRow, detail }: { row: HealthCheckRow; scoreRow: ScoreRow; detail: CompanyDetail }) {
  const [open, setOpen] = useState(false);
  const tone = STATUS_TONE[row.status];

  const subs = (PILLAR_SUBS[row.pillarKey] ?? [])
    .map((s) => ({ ...s, score: toNum(scoreRow[s.key] as number | null) }))
    .filter((s) => s.score != null);
  const numbers = pillarNumbers(row.pillarKey, detail);

  return (
    <div
      className="rounded-2xl transition-colors"
      style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center gap-4 p-4 sm:p-5"
        aria-expanded={open}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 44, height: 44,
            background: tone.bg,
            border: `1.5px solid ${tone.border}`,
            color: tone.color,
            fontSize: 22, fontWeight: 800,
          }}
          aria-hidden="true"
        >
          {tone.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>
            {row.headline}
          </p>
          <p className="text-sm leading-snug mt-0.5" style={{ color: "var(--text-muted)" }}>
            {row.oneLine}
          </p>
        </div>
        <span
          className="shrink-0 transition-transform text-lg"
          style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            {row.learnMore}
          </div>

          {numbers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {numbers.map((n) => (
                <Card key={n.label} padding="none" className="rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: "var(--text-muted)" }}>
                    {n.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums nums" style={{ color: "var(--text)" }}>{n.value}</p>
                </Card>
              ))}
            </div>
          )}

          {subs.length > 0 && (
            <div className="space-y-2">
              {subs.map((s) => {
                const score = s.score as number;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="text-xs w-32 shrink-0" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--surface-2)" }}
                      role="img"
                      aria-label={`${s.label}: ${score.toFixed(0)} out of 10`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(2, Math.min(100, score * 10))}%`, background: pillarColor(score) }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-10 text-right" style={{ color: "var(--text)" }}>
                      {score.toFixed(0)}/10
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
