"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from "recharts";
import SectionLabel from "@/components/ui/SectionLabel";
import { formatDate, pct } from "@/lib/formatters";
import type { DividendDeclaration } from "@/lib/api";

interface Props {
  financials: Record<string, unknown>[];
  declaration: DividendDeclaration | null;
  faceValue: number | null;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function DividendSection({ financials, declaration, faceValue }: Props) {
  const face = faceValue ?? 10;

  const data = financials.map((r) => {
    const rec = r as Record<string, unknown>;
    const cashPct = toNum(rec.cash_dividend_pct) ?? 0;
    const stockPct = toNum(rec.stock_dividend_pct) ?? 0;
    const eps = toNum(rec.eps);
    const dps = cashPct * face / 100;
    const payout = eps && eps > 0 ? (dps / eps) * 100 : null;
    return {
      year: String(rec.year),
      cash: cashPct,
      stock: stockPct,
      payout,
    };
  });

  // Dividend streak
  const reversed = [...data].reverse();
  let streak = 0;
  for (const d of reversed) {
    if (d.cash > 0) streak++;
    else break;
  }

  const tickStyle = { fontSize: 10, fill: "var(--text-muted)" };
  const tooltipStyle = { fontSize: 11, borderRadius: "6px", border: "1px solid var(--border)" };

  return (
    <div className="mb-4">
      <SectionLabel>Dividends</SectionLabel>

      {/* Declaration info */}
      {declaration && (
        <div className="flex gap-4 text-xs mb-3 mt-2 flex-wrap">
          <div>
            <span className="text-[var(--text-muted)]">Declaration: </span>
            <span className="font-medium">{formatDate(declaration.declaration_date)}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Record Date: </span>
            <span className="font-medium">{formatDate(declaration.record_date)}</span>
          </div>
          {declaration.dividend_pct != null && (
            <div>
              <span className="text-[var(--text-muted)]">Dividend: </span>
              <span className="font-medium text-[var(--positive)]">{pct(declaration.dividend_pct, 0)}</span>
            </div>
          )}
          {streak > 0 && (
            <div>
              <span className="text-[var(--text-muted)]">Streak: </span>
              <span className="font-medium text-[var(--positive)]">{streak} consecutive year{streak !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Dividend history */}
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Dividend History (%)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={35} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="cash" name="Cash Div %" fill="var(--positive)" stackId="a" />
              <Bar dataKey="stock" name="Bonus Div %" fill="var(--accent)" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payout ratio */}
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Payout Ratio (%)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={tickStyle} />
              <YAxis tick={tickStyle} width={35} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <ReferenceLine y={90} stroke="var(--negative)" strokeDasharray="4 2" label={{ value: "90%", fontSize: 9 }} />
              <Line type="monotone" dataKey="payout" name="Payout %" stroke="var(--primary)" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
