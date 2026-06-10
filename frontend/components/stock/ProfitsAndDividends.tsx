"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList,
} from "recharts";
import { profitTrendCaption, epsCaption, dividendStreakCaption } from "@/lib/plain-language";
import { formatDate, crore } from "@/lib/formatters";
import type { DividendDeclaration } from "@/lib/api";
import ChartCard from "@/components/stock/ChartCard";

interface Props {
  financials: Record<string, unknown>[];
  extFinancials: Record<string, unknown>[];
  declaration: DividendDeclaration | null;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Format EPS (BDT per share) → "৳21.9" or "৳150". */
function fmtEps(v: number | null | undefined): string {
  if (v == null) return "--";
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return `${sign}৳${abs >= 100 ? abs.toFixed(0) : abs.toFixed(1)}`;
}

const TICK = { fontSize: 11, fill: "#64748B" };
const TIP_STYLE = {
  fontSize: 12,
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
};

export default function ProfitsAndDividends({ financials, extFinancials, declaration }: Props) {
  const extMap = Object.fromEntries(
    extFinancials.map((r) => [(r as Record<string, unknown>).year, r])
  );

  const profitData = financials.map((r) => {
    const rec = r as Record<string, unknown>;
    const ext = (extMap[rec.year as string] || {}) as Record<string, unknown>;
    // `profit_mn` is in millions of BDT (clearly named).
    // `ext.net_profit` is raw BDT — divide by 1e6 to convert to millions.
    const fromMn = toNum(rec.profit_mn);
    const fromRaw = toNum(ext.net_profit);
    const profitInMn = fromMn != null ? fromMn : (fromRaw != null ? fromRaw / 1e6 : null);
    return {
      year: String(rec.year),
      profit: profitInMn,
    };
  });

  const epsData = financials.map((r) => {
    const rec = r as Record<string, unknown>;
    const eps = toNum(rec.eps) ?? toNum(rec.eps_cont_basic) ?? toNum(rec.eps_basic);
    return {
      year: String(rec.year),
      eps,
    };
  });

  const dividendData = financials.map((r) => {
    const rec = r as Record<string, unknown>;
    return {
      year: String(rec.year),
      cash: toNum(rec.cash_dividend_pct) ?? 0,
    };
  });

  const profitCap = profitTrendCaption(profitData.map((d) => d.profit));
  const epsCap = epsCaption(epsData.map((d) => d.eps));
  const divCap = dividendStreakCaption(dividendData.map((d) => d.cash));

  const hasProfit = profitData.some((d) => d.profit != null);
  const hasEps = epsData.some((d) => d.eps != null);
  const hasDividend = dividendData.some((d) => d.cash > 0);

  if (!hasProfit && !hasEps && !hasDividend) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Profits & Dividends
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Are they making money — and do they share it with shareholders?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hasProfit && (
          <ChartCard
            title="Yearly Profit"
            subtitle="Net profit per year"
            caption={profitCap}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={profitData} margin={{ top: 28, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis hide domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']} />
                <Tooltip
                  contentStyle={TIP_STYLE}
                  cursor={{ fill: "rgba(15,23,42,0.05)" }}
                  formatter={(v: number) => [crore(v), "Profit"]}
                />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  <LabelList
                    dataKey="profit"
                    position="top"
                    formatter={(v: number) => crore(v)}
                    style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }}
                  />
                  {profitData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={(d.profit ?? 0) >= 0 ? "#15803D" : "#DC2626"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {hasEps && (
          <ChartCard
            title="Earnings Per Share"
            subtitle="Profit you earn per share"
            caption={epsCap}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={epsData} margin={{ top: 28, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis hide domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']} />
                <Tooltip
                  contentStyle={TIP_STYLE}
                  cursor={{ fill: "rgba(15,23,42,0.05)" }}
                  formatter={(v: number) => [fmtEps(v), "EPS"]}
                />
                <Bar dataKey="eps" radius={[6, 6, 0, 0]}>
                  <LabelList
                    dataKey="eps"
                    position="top"
                    formatter={(v: number) => fmtEps(v)}
                    style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }}
                  />
                  {epsData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={(d.eps ?? 0) >= 0 ? "#2563EB" : "#DC2626"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {hasDividend && (
          <div className="sm:col-span-2">
            <ChartCard
              title="Yearly Cash Dividend"
              subtitle="% of face value"
              caption={divCap}
              pill={
                declaration && declaration.dividend_pct != null
                  ? `New ${declaration.dividend_pct}% dividend just declared${
                      declaration.record_date ? ` — record ${formatDate(declaration.record_date)}` : ""
                    }`
                  : null
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dividendData} margin={{ top: 28, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={TIP_STYLE}
                    cursor={{ fill: "rgba(15,23,42,0.05)" }}
                    formatter={(v: number) => [`${v}%`, "Cash Dividend"]}
                  />
                  <Bar dataKey="cash" fill="#15803D" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="cash"
                      position="top"
                      formatter={(v: number) => v > 0 ? `${v}%` : ""}
                      style={{ fontSize: 11, fontWeight: 700, fill: "#0F172A" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>
    </section>
  );
}
