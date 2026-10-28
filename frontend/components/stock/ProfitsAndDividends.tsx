"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList,
} from "recharts";
import { profitTrendCaption, epsCaption, dividendStreakCaption, type Bi } from "@/lib/plain-language";
import { formatDate, crore } from "@/lib/formatters";
import type { DividendDeclaration } from "@/lib/api";
import ChartCard from "@/components/stock/ChartCard";
import SectionTitle from "@/components/stock/SectionTitle";
import { CHART } from "@/lib/chart-theme";
import { bnDate, croreBn } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

const tx = (b: Bi | null) => (b ? <T en={b.en} bn={b.bn} /> : null);

/**
 * Bar value labels that know when to stay quiet. Recharts' LabelList has no
 * collision handling, so with 8+ yearly bars on a phone every "৳2,662 Cr" ran
 * into its neighbours. Draw the label only when the text fits the bar's slot
 * (bar width plus most of the 30% category gap); otherwise the tooltip has it.
 */
function fitLabel(fmt: (v: number) => string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function FitLabel(props: any) {
    const vb = props.viewBox ?? {};
    const x = typeof props.x === "number" ? props.x : vb.x;
    const y = typeof props.y === "number" ? props.y : vb.y;
    const width = typeof props.width === "number" ? props.width : vb.width;
    const raw = props.value;
    if (raw == null || typeof x !== "number" || typeof y !== "number" || typeof width !== "number") return null;
    const text = fmt(Number(raw));
    if (!text) return null;
    const est = text.length * 6.4; // ~11px bold
    if (est > width * 1.35) return null;
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text)">
        {text}
      </text>
    );
  };
}

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

// Shared chart style (lib/chart-theme.ts) — 12px ticks, one tooltip look.
const TICK = CHART.xAxis.tick;
const TIP_STYLE = CHART.tooltip.contentStyle;

export default function ProfitsAndDividends({ financials, extFinancials, declaration }: Props) {
  const { bn } = useLang();
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

  // A year newer than DSE's audited table, read from the company's own results
  // notice (backend notices.provisional_fin_row, 2026-10-28).
  const provisional = financials
    .map((r) => r as Record<string, unknown>)
    .filter((r) => r.provisional === true)
    .map((r) => String(r.year));

  return (
    <section className="mb-8">
      <SectionTitle
        title={<T en="Profit and dividends" bn="মুনাফা ও ডিভিডেন্ড" />}
        sub={
          <T
            en="Is the company making money, and does it share it with shareholders?"
            bn="কোম্পানি মুনাফা করছে কি না, আর শেয়ারহোল্ডারদের সঙ্গে তা ভাগ করছে কি না।"
          />
        }
      />

      {provisional.length > 0 && (
        <p className="mb-3 text-xs text-text-muted">
          <T
            en={`${provisional.join(", ")} figures come from the company's results notice. DSE's audited table hasn't added that year yet.`}
            bn={`${provisional.join(", ")} সালের সংখ্যা কোম্পানির ফল প্রকাশের নোটিশ থেকে নেওয়া। ডিএসই-র নিরীক্ষিত টেবিলে সেই বছর এখনো যোগ হয়নি।`}
          />
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hasProfit && (
          <ChartCard
            title={<T en="Profit each year" bn="প্রতি বছরের মুনাফা" />}
            subtitle={<T en="Net profit" bn="নিট মুনাফা" />}
            caption={tx(profitCap)}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={profitData} margin={{ top: 28, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis hide domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']} />
                <Tooltip
                  contentStyle={TIP_STYLE}
                  cursor={{ fill: "rgba(15,23,42,0.05)" }}
                  formatter={(v: number) => [bn ? croreBn(v) : crore(v), bn ? "মুনাফা" : "Profit"]}
                />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="profit" content={fitLabel(bn ? croreBn : crore)} />
                  {profitData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={(d.profit ?? 0) >= 0 ? "var(--positive)" : "var(--negative)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {hasEps && (
          <ChartCard
            title={<T en="Earnings per share (EPS)" bn="শেয়ারপ্রতি আয় (ইপিএস)" />}
            subtitle={<T en="Profit for each share you own" bn="প্রতিটি শেয়ারের ভাগের মুনাফা" />}
            caption={tx(epsCap)}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={epsData} margin={{ top: 28, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis hide domain={[(dataMin: number) => Math.min(0, dataMin), 'auto']} />
                <Tooltip
                  contentStyle={TIP_STYLE}
                  cursor={{ fill: "rgba(15,23,42,0.05)" }}
                  formatter={(v: number) => [fmtEps(v), bn ? "ইপিএস" : "EPS"]}
                />
                <Bar dataKey="eps" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="eps" content={fitLabel(fmtEps)} />
                  {epsData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={(d.eps ?? 0) >= 0 ? "var(--primary)" : "var(--negative)"}
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
              title={<T en="Cash dividend each year" bn="প্রতি বছরের নগদ ডিভিডেন্ড" />}
              subtitle={<T en="As a % of face value" bn="অভিহিত মূল্যের শতাংশ হিসেবে" />}
              caption={tx(divCap)}
              pill={
                declaration && declaration.dividend_pct != null ? (
                  <T
                    en={`A ${declaration.dividend_pct}% dividend has just been declared${
                      declaration.record_date ? `. Record date: ${formatDate(declaration.record_date)}` : ""
                    }`}
                    bn={`সম্প্রতি ${declaration.dividend_pct}% ডিভিডেন্ড ঘোষণা হয়েছে${
                      declaration.record_date
                        ? `। রেকর্ড ডেট: ${bnDate(declaration.record_date) || formatDate(declaration.record_date)}`
                        : ""
                    }`}
                  />
                ) : null
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
                    formatter={(v: number) => [`${v}%`, bn ? "নগদ ডিভিডেন্ড" : "Cash dividend"]}
                  />
                  <Bar dataKey="cash" fill="var(--positive)" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="cash" content={fitLabel((v: number) => (v > 0 ? `${v}%` : ""))} />
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
