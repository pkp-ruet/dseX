"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, CartesianGrid,
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

const TICK = { fontSize: 10, fill: "#94A3B8" };
const TIP_STYLE = {
  fontSize: 11,
  borderRadius: "8px",
  border: "1px solid #1E3A5F",
  background: "#0A1525",
  color: "#CBD5E1",
};

export default function DividendSection({ financials, declaration, faceValue }: Props) {
  const face = faceValue ?? 10;

  const data = financials.map((r) => {
    const rec = r as Record<string, unknown>;
    const cashPct = toNum(rec.cash_dividend_pct) ?? 0;
    const stockPct = toNum(rec.stock_dividend_pct) ?? 0;
    const eps = toNum(rec.eps);
    const dps = cashPct * face / 100;
    const payout = eps && eps > 0 ? (dps / eps) * 100 : null;
    return { year: String(rec.year), cash: cashPct, stock: stockPct, payout };
  });

  const reversed = [...data].reverse();
  let streak = 0;
  for (const d of reversed) { if (d.cash > 0) streak++; else break; }

  return (
    <div className="mb-5">
      <SectionLabel>Dividends</SectionLabel>

      {(declaration || streak > 0) && (
        <div
          className="rounded-xl p-4 mt-3 mb-4"
          style={{
            background: "linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(10,21,37,0.9) 100%)",
            border: "1px solid rgba(52,211,153,0.25)",
          }}
        >
          <div className="flex flex-wrap items-center gap-5">
            {streak > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-xl font-black tabular-nums leading-none" style={{ color: "#34D399" }}>{streak}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Year Streak</p>
                </div>
              </div>
            )}
            {declaration && (
              <>
                {declaration.dividend_pct != null && (
                  <div>
                    <p className="text-xl font-black" style={{ color: "#34D399" }}>{pct(declaration.dividend_pct, 0)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Declared</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#E2E8F0" }}>{formatDate(declaration.declaration_date)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Declaration Date</p>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#E2E8F0" }}>{formatDate(declaration.record_date)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Record Date</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-4"
          style={{ background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)", border: "1px solid #1E3A5F" }}
        >
          <p className="text-xs font-bold mb-3" style={{ color: "#94A3B8" }}>Dividend History (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#1E3A5F" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="cash" name="Cash Div" fill="#34D399" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="stock" name="Bonus Div" fill="#818CF8" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#34D399" }} />
              <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>Cash Dividend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#818CF8" }} />
              <span className="text-[10px] font-medium" style={{ color: "#94A3B8" }}>Bonus Shares</span>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)", border: "1px solid #1E3A5F" }}
        >
          <p className="text-xs font-bold mb-3" style={{ color: "#94A3B8" }}>Payout Ratio (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#1E3A5F" strokeOpacity={0.5} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={TIP_STYLE} cursor={{ stroke: "#1E3A5F" }} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <ReferenceLine y={90} stroke="#F87171" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: "90%", fontSize: 9, fill: "#F87171" }} />
              <Line
                type="monotone"
                dataKey="payout"
                name="Payout"
                stroke="#FB923C"
                strokeWidth={2.5}
                dot={{ fill: "#FB923C", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#FB923C" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
