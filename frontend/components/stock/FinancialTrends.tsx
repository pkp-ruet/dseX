"use client";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend,
} from "recharts";
import ChartCard from "@/components/stock/ChartCard";
import {
  normalizeExtFinancials, revenueSeries, marginSeries, debtEquitySeries, cashQualitySeries,
} from "@/lib/stock-metrics";
import { crore } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";
import { CHART } from "@/lib/chart-theme";
import type { Bi } from "@/lib/plain-language";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

const tx = (b: Bi | null) => (b ? <T en={b.en} bn={b.bn} /> : null);

interface Props {
  extFinancials: Record<string, unknown>[];
}

// Shared chart style (lib/chart-theme.ts) — 12px ticks, one tooltip look.
const TICK = CHART.xAxis.tick;
const TIP_STYLE = CHART.tooltip.contentStyle;

export default function FinancialTrends({ extFinancials }: Props) {
  const [open, setOpen] = useState(true);
  const { bn } = useLang();
  const tk = (v: number) => (bn ? croreBn(v) : crore(v));

  const rows = normalizeExtFinancials(extFinancials);
  if (rows.length < 2) return null;

  const revenue = revenueSeries(rows);
  const margins = marginSeries(rows);
  const debtEq = debtEquitySeries(rows);
  const cashQ = cashQualitySeries(rows);

  const hasRevenue = revenue.some((d) => d.value != null);
  const hasMargins = margins.some((d) => d.gross != null || d.net != null);
  const hasDebtEq = debtEq.some((d) => d.debt != null || d.equity != null);
  const hasCashQ = cashQ.some((d) => d.value != null);

  if (!hasRevenue && !hasMargins && !hasDebtEq && !hasCashQ) return null;

  // Captions
  const firstRev = revenue.find((d) => d.value != null)?.value ?? null;
  const lastRev = [...revenue].reverse().find((d) => d.value != null)?.value ?? null;
  const revCap: Bi | null =
    firstRev != null && lastRev != null
      ? lastRev > firstRev * 1.1
        ? { en: "Sales have grown over these years.", bn: "এই বছরগুলোতে বিক্রি বেড়েছে।" }
        : lastRev < firstRev * 0.9
          ? { en: "Sales have fallen over these years.", bn: "এই বছরগুলোতে বিক্রি কমেছে।" }
          : { en: "Sales have stayed about the same.", bn: "বিক্রি মোটামুটি একই আছে।" }
      : null;

  const lastNet = [...margins].reverse().find((d) => d.net != null)?.net ?? null;
  const marginCap: Bi | null =
    lastNet != null
      ? {
          en: `From every ৳1 of sales, it keeps about ৳${(lastNet / 100).toFixed(2)} as profit.`,
          bn: `প্রতি ৳1 বিক্রি থেকে প্রায় ৳${(lastNet / 100).toFixed(2)} মুনাফা থাকে।`,
        }
      : null;

  const lastDe = [...debtEq].reverse().find((d) => d.de != null)?.de ?? null;
  const deCap: Bi | null =
    lastDe != null
      ? {
          en: `It owes about ৳${lastDe.toFixed(1)} for every ৳1 of its own capital.`,
          bn: `প্রতি ৳1 নিজস্ব মূলধনের বিপরীতে প্রায় ৳${lastDe.toFixed(1)} ঋণ আছে।`,
        }
      : null;

  const lastCq = [...cashQ].reverse().find((d) => d.value != null)?.value ?? null;
  const cqCap: Bi | null =
    lastCq != null
      ? lastCq >= 0.8
        ? {
            en: `Its reported profit comes in as real cash (${lastCq.toFixed(1)} times the profit).`,
            bn: `হিসাবের মুনাফা সত্যিকারের নগদ হিসেবে আসছে (মুনাফার ${lastCq.toFixed(1)} গুণ)।`,
          }
        : {
            en: `Only ৳${lastCq.toFixed(1)} of cash comes in for each ৳1 of reported profit. This is worth a closer look.`,
            bn: `হিসাবের প্রতি ৳1 মুনাফার বিপরীতে নগদ আসছে মাত্র ৳${lastCq.toFixed(1)}। এটি ভালো করে দেখে নেওয়া দরকার।`,
          }
      : null;

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left mb-1"
        aria-expanded={open}
      >
        <span className="text-xl sm:text-2xl font-bold text-text-main">
          <T en="Financial trends" bn="আর্থিক ধারা" />
        </span>
        <span
          className="text-sm font-semibold flex items-center gap-1 text-primary"
        >
          {open ? <T en="Hide" bn="লুকান" /> : <T en="Show" bn="দেখুন" />}
          <span className="transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} aria-hidden="true">▾</span>
        </span>
      </button>
      <p className="text-sm mb-5 text-text-muted">
        <T
          en="The deeper figures over the years: sales, profit margins, debt and cash."
          bn="বছরভিত্তিক গভীর হিসাব: বিক্রি, মুনাফার হার, ঋণ আর নগদ।"
        />
      </p>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hasRevenue && (
            <ChartCard title={<T en="Sales" bn="বিক্রি" />} subtitle={<T en="Each year" bn="প্রতি বছর" />} caption={tx(revCap)}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenue} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number) => [tk(v), bn ? "বিক্রি" : "Sales"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {hasMargins && (
            <ChartCard
              title={<T en="Profit margins" bn="মুনাফার হার" />}
              subtitle={<T en="Gross and net, in %" bn="মোট ও নিট, শতাংশে" />}
              caption={tx(marginCap)}
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={margins} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} width={32} unit="%" />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number, n: string) => [`${v.toFixed(1)}%`, n === "gross" ? (bn ? "মোট" : "Gross") : bn ? "নিট" : "Net"]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "gross" ? (bn ? "মোট মুনাফার হার" : "Gross margin") : bn ? "নিট মুনাফার হার" : "Net margin")} />
                  <Line type="monotone" dataKey="gross" stroke="var(--positive)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                  <Line type="monotone" dataKey="net" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {hasDebtEq && (
            <ChartCard
              title={<T en="Debt and own capital" bn="ঋণ ও নিজস্ব মূলধন" />}
              subtitle={<T en="How strong the balance sheet is" bn="আর্থিক ভিত কতটা শক্ত" />}
              caption={tx(deCap)}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={debtEq} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number, n: string) => [tk(v), n === "debt" ? (bn ? "ঋণ" : "Debt") : bn ? "নিজস্ব মূলধন" : "Own capital"]} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(v) => (v === "debt" ? (bn ? "ঋণ" : "Debt") : bn ? "নিজস্ব মূলধন" : "Own capital")}
                  />
                  <Bar dataKey="equity" radius={[6, 6, 0, 0]} fill="var(--positive)" />
                  <Bar dataKey="debt" radius={[6, 6, 0, 0]} fill="var(--negative)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {hasCashQ && (
            <ChartCard
              title={<T en="Cash from the business" bn="ব্যবসা থেকে নগদ" />}
              subtitle={<T en="Compared with reported profit" bn="হিসাবের মুনাফার তুলনায়" />}
              caption={tx(cqCap)}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cashQ} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number) => [`${v.toFixed(2)}×`, bn ? "মুনাফার তুলনায় নগদ" : "Cash compared with profit"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {cashQ.map((d, i) => (
                      <Cell key={i} fill={(d.value ?? 0) >= 0.8 ? "var(--positive)" : "var(--watch)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </section>
  );
}
