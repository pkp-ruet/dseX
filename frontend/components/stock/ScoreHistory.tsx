"use client";

import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ScoreChange, ScoreHistory as ScoreHistoryData, ScoreTierKey } from "@/lib/api";
import { CHART } from "@/lib/chart-theme";
import { TIER_LABELS, TIER_LABELS_BN, TIER_THRESHOLDS } from "@/lib/constants";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import type { Bi } from "@/lib/plain-language";
import Card from "@/components/ui/Card";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

const LINES = [
  { y: TIER_THRESHOLDS.EXCELLENT, en: "Excellent", bn: "চমৎকার" },
  { y: TIER_THRESHOLDS.GOOD, en: "Good", bn: "ভালো" },
  { y: TIER_THRESHOLDS.AVERAGE, en: "Average", bn: "মাঝারি" },
];

function tierWord(t: ScoreTierKey): Bi {
  if (t === "unknown") return { en: "not rated", bn: "রেটিং নেই" };
  return { en: TIER_LABELS[t], bn: TIER_LABELS_BN[t] };
}

const date = (iso: string): Bi => ({ en: formatDate(iso), bn: bnDate(iso) || formatDate(iso) });

function shortDate(iso: string, bn: boolean): string {
  if (bn) return (bnDate(iso) || iso).replace(/\s\d{4}$/, "");
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ChangeRow({ c }: { c: ScoreChange }) {
  const rose = (c.to_score ?? 0) >= (c.from_score ?? 0);
  const reasons = [...c.notes, ...c.drivers];
  const d = date(c.date);
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${c.method ? "bg-border" : rose ? "bg-positive" : "bg-negative"}`}
      />
      <div className="min-w-0">
        <p className="text-xs text-text-muted">
          <T en={d.en} bn={d.bn} />
        </p>
        <p className="text-sm font-semibold text-text-main">
          <T en={c.en} bn={c.bn} />
        </p>
        {c.method ? (
          <p className="mt-1 text-sm text-text-muted">
            <T
              en="On that day we changed how we score every company. It is not news about this company."
              bn="সেদিন আমরা সব কোম্পানির স্কোর হিসাবের নিয়ম বদলেছিলাম। এটি এই কোম্পানির কোনো খবর নয়।"
            />
          </p>
        ) : reasons.length ? (
          <ul className="mt-1 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i} className="text-sm text-text-main">
                <T en={r.en} bn={r.bn} />
                {r.points != null && (
                  <span className={`ml-1.5 tabular-nums ${r.points > 0 ? "text-positive" : "text-negative"}`}>
                    {r.points > 0 ? "+" : "−"}
                    {Math.abs(r.points).toFixed(1)} <T en="points" bn="পয়েন্ট" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : !c.explained ? (
          <p className="mt-1 text-sm text-text-muted">
            <T
              en="We have kept the reasons for grade changes only since 25 Oct 2026."
              bn="গ্রেড বদলের কারণ আমরা 25 অক্টোবর 2026 থেকে রাখছি।"
            />
          </p>
        ) : (
          <p className="mt-1 text-sm text-text-muted">
            <T
              en="Several small changes added up. No single reason stands out."
              bn="কয়েকটি ছোট পরিবর্তন মিলে এটি হয়েছে। আলাদা করে বড় কোনো কারণ নেই।"
            />
          </p>
        )}
        {c.from_score != null && c.since !== c.date && (
          <p className="mt-0.5 text-xs text-text-muted">
            <T
              en={`Compared with ${date(c.since).en}, when it became ${tierWord(c.from_tier).en}`}
              bn={`${date(c.since).bn}-এর সঙ্গে তুলনা, যেদিন এটি ${tierWord(c.from_tier).bn} হয়েছিল`}
            />
          </p>
        )}
      </div>
    </li>
  );
}

/** The free line: today's score and grade, since when we track it, how often
 *  the grade changed. */
export function scoreHistorySummary(history: ScoreHistoryData): Bi | null {
  const pts = history.points;
  if (pts.length < 2) return null;
  const now = pts[pts.length - 1];
  const first = pts[0];
  const n = history.grade_changes;
  const tw = tierWord(now.tier);
  const since = date(first.date);
  return {
    en: `The score is ${now.score.toFixed(0)} today (${tw.en}). We have checked it every trading day since ${since.en}, and the grade has changed ${n} ${n === 1 ? "time" : "times"}.`,
    bn: `আজ স্কোর ${now.score.toFixed(0)} (${tw.bn})। ${since.bn} থেকে প্রতি কার্যদিবসে আমরা এটি দেখছি, এর মধ্যে গ্রেড ${n} বার বদলেছে।`,
  };
}

/**
 * "How the score has moved" — our score for this company on every trading
 * day since we started keeping it (9 Jul 2026), and each grade change with
 * the pillar that caused it (backend services/score_history.py). Rendered in
 * the stock page's full verdict, whose question row carries the free summary
 * line (`scoreHistorySummary`) and wraps this in `PremiumMask`.
 */
export default function ScoreHistory({ history }: { history: ScoreHistoryData }) {
  const { bn } = useLang();
  const pts = history.points;
  if (pts.length < 2) return null;

  const now = pts[pts.length - 1];
  const first = pts[0];
  const scores = pts.map((p) => p.score);
  const lo = Math.max(0, Math.floor((Math.min(...scores) - 5) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...scores) + 5) / 5) * 5);
  const since = date(first.date);
  const tw = tierWord(now.tier);

  return (
    <Card padding="lg">
      <div className="h-[220px]" aria-label={bn ? "স্কোরের চার্ট" : "Score chart"} role="img">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pts} margin={CHART.margin}>
            <CartesianGrid {...CHART.grid} />
            <XAxis dataKey="date" tickFormatter={(v: string) => shortDate(v, bn)} {...CHART.xAxis} />
            <YAxis domain={[lo, hi]} {...CHART.yAxis} width={32} allowDecimals={false} />
            <Tooltip
              {...CHART.tooltip}
              labelFormatter={(l) => (bn ? bnDate(String(l)) || String(l) : formatDate(String(l)))}
              formatter={(v) => [Number(v).toFixed(1), bn ? "স্কোর" : "Score"]}
            />
            {LINES.filter((l) => l.y > lo && l.y < hi).map((l) => (
              <ReferenceLine
                key={l.y}
                y={l.y}
                {...CHART.reference}
                label={{ value: bn ? l.bn : l.en, position: "insideTopLeft", fontSize: 12, fill: "var(--text-muted)" }}
              />
            ))}
            <Line type="stepAfter" dataKey="score" stroke={CHART.color.primary} {...CHART.line} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5">
        <h4 className="text-sm font-bold text-text-main mb-3">
          <T en="When the grade changed" bn="গ্রেড কবে বদলেছে" />
        </h4>
        {history.changes.length ? (
          <ol className="space-y-4">
            {history.changes.map((c) => <ChangeRow key={`${c.date}-${c.to_tier}`} c={c} />)}
          </ol>
        ) : (
          <p className="text-sm text-text-muted">
            <T
              en={`The grade has stayed ${tw.en} since ${since.en}.`}
              bn={`${since.bn} থেকে গ্রেড একই আছে: ${tw.bn}।`}
            />
          </p>
        )}
      </div>
    </Card>
  );
}
