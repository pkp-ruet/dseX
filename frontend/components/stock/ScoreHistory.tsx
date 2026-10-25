"use client";

import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ScoreChange, ScoreHistory as ScoreHistoryData, ScoreTierKey } from "@/lib/api";
import { CHART } from "@/lib/chart-theme";
import { TIER_LABELS, TIER_LABELS_BN, TIER_THRESHOLDS } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";
import PremiumGate from "@/components/premium/PremiumGate";
import { useStockLang } from "@/context/StockLangContext";

const LINES = [
  { y: TIER_THRESHOLDS.EXCELLENT, en: "Excellent", bn: "চমৎকার" },
  { y: TIER_THRESHOLDS.GOOD, en: "Good", bn: "ভালো" },
  { y: TIER_THRESHOLDS.AVERAGE, en: "Average", bn: "মাঝারি" },
];

function tierWord(t: ScoreTierKey, isBn: boolean): string {
  if (t === "unknown") return isBn ? "রেটিং নেই" : "Unrated";
  return isBn ? TIER_LABELS_BN[t] : TIER_LABELS[t];
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ChangeRow({ c, isBn }: { c: ScoreChange; isBn: boolean }) {
  const rose = (c.to_score ?? 0) >= (c.from_score ?? 0);
  const reasons = [...c.notes, ...c.drivers];
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${c.method ? "bg-border" : rose ? "bg-positive" : "bg-negative"}`}
      />
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{formatDate(c.date)}</p>
        <p className="text-sm font-semibold text-text-main">{isBn ? c.bn : c.en}</p>
        {c.method ? (
          <p className="mt-1 text-sm text-text-muted">
            {isBn
              ? "সেদিন আমরা সব কোম্পানির স্কোর করার নিয়ম বদলেছিলাম — এটি এই কোম্পানির কোনো খবর নয়।"
              : "That day we changed how we score every company — it is not news about this one."}
          </p>
        ) : reasons.length ? (
          <ul className="mt-1 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i} className="text-sm text-text-main">
                {isBn ? r.bn : r.en}
                {r.points != null && (
                  <span className={`ml-1.5 tabular-nums ${r.points > 0 ? "text-positive" : "text-negative"}`}>
                    {r.points > 0 ? "+" : "−"}{Math.abs(r.points).toFixed(1)}
                    {isBn ? " পয়েন্ট" : " pts"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : !c.explained ? (
          <p className="mt-1 text-sm text-text-muted">
            {isBn
              ? "25 অক্টোবর 2026-এর আগের বদলের কারণ আমরা রাখিনি।"
              : "We only keep the reason for changes from 25 Oct 2026 on."}
          </p>
        ) : (
          <p className="mt-1 text-sm text-text-muted">
            {isBn ? "অনেকগুলো ছোট বদল মিলে হয়েছে।" : "Many small moves added up — no single reason stands out."}
          </p>
        )}
        {c.from_score != null && c.since !== c.date && (
          <p className="mt-0.5 text-xs text-text-muted">
            {isBn ? `${formatDate(c.since)} থেকে তুলনা` : `Compared with ${formatDate(c.since)}, when it became ${tierWord(c.from_tier, false)}`}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * "How the score has moved" — our score for this company on every trading
 * day since we started keeping it (9 Jul 2026), and each grade change with
 * the pillar that caused it (backend services/score_history.py). The summary
 * line is free; the chart and the reasons are Premium (screen-only lock).
 */
export default function ScoreHistory({ history, code }: { history: ScoreHistoryData; code: string }) {
  const { lang } = useStockLang();
  const isBn = lang === "bn";
  const pts = history.points;
  if (pts.length < 2) return null;

  const now = pts[pts.length - 1];
  const first = pts[0];
  const n = history.grade_changes;
  const scores = pts.map((p) => p.score);
  const lo = Math.max(0, Math.floor((Math.min(...scores) - 5) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...scores) + 5) / 5) * 5);

  const summary = isBn
    ? `আজ ${now.score.toFixed(0)} (${tierWord(now.tier, true)}) · ${formatDate(first.date)} থেকে প্রতিদিন দেখা হচ্ছে · গ্রেড বদলেছে ${n} বার`
    : `${now.score.toFixed(0)} today (${tierWord(now.tier, false)}) · tracked every trading day since ${formatDate(first.date)} · grade changed ${n} ${n === 1 ? "time" : "times"}`;

  const stakes = n
    ? [isBn ? `${code}-এর গ্রেড ${n} বার বদলেছে — কেন, দেখুন` : `${code}'s grade changed ${n} ${n === 1 ? "time" : "times"} — see why`]
    : [isBn ? `${code}-এর প্রতিদিনের স্কোর` : `${code}'s score on every trading day`];

  return (
    <section id="score-history" className="mb-8 stock-anchor">
      <SectionTitle
        title="How the score has moved"
        sub="Our score for this company on every trading day, and why the grade changed."
        bn="প্রতিদিনের স্কোর — গ্রেড কবে আর কেন বদলেছে।"
      />
      <Card padding="lg">
        <p className={`text-sm text-text-main ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
          {summary}
        </p>
        <PremiumGate
          label={isBn ? "স্কোরের চার্ট আর গ্রেড বদলের কারণ" : "The score chart and why the grade changed"}
          preview="blur"
          peek={180}
          stakes={stakes}
          className="mt-4"
        >
          <div className="h-[220px]" aria-label={isBn ? "স্কোরের চার্ট" : "Score chart"} role="img">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pts} margin={CHART.margin}>
                <CartesianGrid {...CHART.grid} />
                <XAxis dataKey="date" tickFormatter={shortDate} {...CHART.xAxis} />
                <YAxis domain={[lo, hi]} {...CHART.yAxis} width={32} allowDecimals={false} />
                <Tooltip
                  {...CHART.tooltip}
                  labelFormatter={(l) => formatDate(String(l))}
                  formatter={(v) => [Number(v).toFixed(1), isBn ? "স্কোর" : "Score"]}
                />
                {LINES.filter((l) => l.y > lo && l.y < hi).map((l) => (
                  <ReferenceLine
                    key={l.y}
                    y={l.y}
                    {...CHART.reference}
                    label={{ value: isBn ? l.bn : l.en, position: "insideTopLeft", fontSize: 12, fill: "var(--text-muted)" }}
                  />
                ))}
                <Line type="stepAfter" dataKey="score" stroke={CHART.color.primary} {...CHART.line} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`mt-5 ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
            <h4 className="text-sm font-bold text-text-main mb-3">
              {isBn ? "গ্রেড যখন বদলেছে" : "When the grade changed"}
            </h4>
            {history.changes.length ? (
              <ol className="space-y-4">
                {history.changes.map((c) => <ChangeRow key={`${c.date}-${c.to_tier}`} c={c} isBn={isBn} />)}
              </ol>
            ) : (
              <p className="text-sm text-text-muted">
                {isBn
                  ? `${formatDate(first.date)} থেকে গ্রেড একই আছে: ${tierWord(now.tier, true)}।`
                  : `The grade has stayed ${tierWord(now.tier, false)} since ${formatDate(first.date)}.`}
              </p>
            )}
          </div>
        </PremiumGate>
      </Card>
    </section>
  );
}
