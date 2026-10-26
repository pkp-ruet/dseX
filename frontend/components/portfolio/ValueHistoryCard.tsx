"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import PfCard from "./PfCard";
import Stat from "@/components/ui/Stat";
import Tabs from "@/components/ui/Tabs";
import Chip from "@/components/ui/Chip";
import { CHART } from "@/lib/chart-theme";
import { formatDate, takaCompact, takaGroup } from "@/lib/formatters";
import type { PortfolioHistory } from "@/lib/api";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

type RangeKey = "1m" | "3m" | "1y" | "all";
const RANGE_DAYS: Record<RangeKey, number | null> = { "1m": 31, "3m": 92, "1y": 366, all: null };

/** Below this many of their own daily snapshots, the chart shows the replay instead. */
const MIN_SNAPSHOTS = 10;

interface Point {
  date: string;
  value: number;
  cost?: number;
  dsex?: number;
}

function shortDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return d;
  }
}

/** A short legend swatch: solid or dashed, primary or neutral. */
function Swatch({ kind }: { kind: "value" | "cost" | "dsex" }) {
  if (kind === "cost") return <span aria-hidden="true" className="inline-block w-4 border-t-2 border-dashed border-text-muted" />;
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-0.5 w-4 rounded-full ${kind === "value" ? "bg-primary" : "bg-text-muted"}`}
    />
  );
}

/**
 * "Your money over time". Two sources:
 * - the reader's own daily snapshots (value + what it cost), once there are
 *   ten of them — the true record, growing from the day this shipped;
 * - before that, a replay: the shares they hold today, priced over the last
 *   ~4 months on adjusted closes (labelled as such — it ignores past trades).
 *
 * Free for everyone (2026-10-25: the page keeps one Premium lock, not nine):
 * every range and the DSEX line rebased to the same starting value. The DSEX
 * line is the reader's own result next to the market — not a claim about our
 * signals.
 *
 * 2026-10-26 clean look: the change over the chosen range leads as one big
 * number, the range tabs + DSEX chip sit under it, the chart is a flat
 * primary area (no gradient) with a neutral DSEX line, and a small legend
 * names the lines.
 */
export default function ValueHistoryCard({
  history,
  lang,
}: {
  history: PortfolioHistory | null;
  lang: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const bnText = bn ? "font-bn" : "";
  const [range, setRange] = useState<RangeKey>("1m");
  const [withDsex, setWithDsex] = useState(false);

  const own = (history?.snapshots ?? []).filter((p) => p.value > 0);
  const useOwn = own.length >= MIN_SNAPSHOTS;
  const base = useOwn ? own : (history?.replay ?? []);

  const data = useMemo<Point[]>(() => {
    if (!base.length) return [];
    const days = RANGE_DAYS[range];
    const cut = days ? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) : "";
    const pts = base.filter((p) => p.date >= cut).map((p) => ({ date: p.date, value: p.value, cost: p.cost }));
    if (!withDsex || !history?.dsex?.length || !pts.length) return pts;
    const dsexBy = new Map(history.dsex.map((d) => [d.date, d.value]));
    // Rebase DSEX to the portfolio's first value in the window: "if this money had followed the market".
    const firstWithDsex = pts.find((p) => dsexBy.has(p.date));
    if (!firstWithDsex) return pts;
    const k = firstWithDsex.value / (dsexBy.get(firstWithDsex.date) as number);
    let last: number | undefined;
    return pts.map((p) => {
      const d = dsexBy.get(p.date);
      if (d != null && p.date >= firstWithDsex.date) last = d * k;
      return { ...p, dsex: p.date >= firstWithDsex.date ? last : undefined };
    });
  }, [base, range, withDsex, history]);

  if (base.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];
  // Own snapshots: profit change (value − cost) so money added isn't read as a gain.
  const change =
    first && last
      ? useOwn && first.cost != null && last.cost != null
        ? last.value - last.cost - (first.value - first.cost)
        : last.value - first.value
      : null;
  const changePct = change != null && first?.value ? (change / first.value) * 100 : null;
  const dsexChangePct =
    withDsex && first?.dsex != null && last?.dsex != null ? ((last.dsex - first.dsex) / first.dsex) * 100 : null;
  const showDsexLine = withDsex && data.some((p) => p.dsex != null);

  return (
    <PfCard
      title={L("Your money over time", "সময়ের সাথে আপনার টাকা")}
      bn="সময়ের সাথে আপনার টাকা"
      lang={lang}
      dataCard="value-history"
    >
      {change != null && first && (
        <div className={bnText} lang={bn ? "bn" : undefined}>
          <Stat
            size="lg"
            tone={change > 0 ? "positive" : change < 0 ? "negative" : "default"}
            value={
              <span className="pv">
                {change > 0 ? "+" : change < 0 ? "−" : ""}
                {takaGroup(Math.abs(change))}
                {changePct != null && (
                  <span className="ml-2 text-base font-semibold sm:text-lg">
                    {changePct >= 0 ? "+" : "−"}
                    {Math.abs(changePct).toFixed(1)}%
                  </span>
                )}
              </span>
            }
            label={
              useOwn
                ? L(`Change in your profit since ${formatDate(first.date)}`, `${formatDate(first.date)} থেকে আপনার লাভের পরিবর্তন`)
                : L(`Change in value since ${formatDate(first.date)}`, `${formatDate(first.date)} থেকে মূল্যের পরিবর্তন`)
            }
            sub={
              dsexChangePct != null
                ? L(
                    `DSEX moved ${dsexChangePct >= 0 ? "+" : "−"}${Math.abs(dsexChangePct).toFixed(1)}% over the same days`,
                    `একই সময়ে DSEX ${dsexChangePct >= 0 ? "+" : "−"}${Math.abs(dsexChangePct).toFixed(1)}%`,
                  )
                : undefined
            }
          />
        </div>
      )}

      <div className={`mt-4 flex flex-wrap items-center justify-between gap-2 ${bnText}`}>
        <Tabs
          ariaLabel={L("Time range", "সময়")}
          idBase="pf-hist"
          value={range}
          onChange={setRange}
          tabs={[
            { key: "1m", label: L("1 month", "1 মাস") },
            { key: "3m", label: L("3 months", "3 মাস") },
            { key: "1y", label: L("1 year", "1 বছর") },
            { key: "all", label: L("All", "সব") },
          ]}
        />
        <Chip active={withDsex} onClick={() => setWithDsex((v) => !v)}>
          {L("Compare with DSEX", "DSEX-এর সাথে তুলনা")}
        </Chip>
      </div>

      <div
        className="mt-4"
        role="tabpanel"
        aria-labelledby={`pf-hist-${range}`}
        style={{ width: "100%", height: CHART.height.md }}
      >
        <ResponsiveContainer>
          <ComposedChart data={data} margin={CHART.margin}>
            <CartesianGrid {...CHART.grid} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...CHART.xAxis} minTickGap={28} />
            <YAxis
              {...CHART.yAxis}
              width={56}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => takaCompact(v)}
            />
            <Tooltip
              {...CHART.tooltip}
              labelFormatter={(d: string) => formatDate(d)}
              formatter={(v: number, name: string) => [
                takaGroup(v),
                name === "dsex"
                  ? L("If it had followed DSEX", "DSEX-এর মতো চললে")
                  : name === "cost"
                    ? L("What it cost", "কেনার দাম")
                    : L("Value", "মূল্য"),
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART.color.primary}
              fill={CHART.color.primary}
              {...CHART.area}
              isAnimationActive={false}
            />
            {useOwn && (
              <Line
                type="stepAfter"
                dataKey="cost"
                stroke={CHART.color.reference}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {withDsex && (
              <Line
                type="monotone"
                dataKey="dsex"
                stroke={CHART.color.neutral}
                {...CHART.line}
                strokeWidth={1.5}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {(useOwn || showDsexLine) && (
        <ul
          className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-text-muted ${bnText}`}
          lang={bn ? "bn" : undefined}
        >
          <li className="inline-flex items-center gap-1.5">
            <Swatch kind="value" />
            {L("Value", "মূল্য")}
          </li>
          {useOwn && (
            <li className="inline-flex items-center gap-1.5">
              <Swatch kind="cost" />
              {L("What it cost", "কেনার দাম")}
            </li>
          )}
          {showDsexLine && (
            <li className="inline-flex items-center gap-1.5">
              <Swatch kind="dsex" />
              {L("If it had followed DSEX", "DSEX-এর মতো চললে")}
            </li>
          )}
        </ul>
      )}

      <p className={`pf-fine ${bnText}`} lang={bn ? "bn" : undefined}>
        {useOwn
          ? L(
              `Your own record: one point for each trading day since ${formatDate(own[0].date)}. The dashed line is what your shares cost.`,
              `আপনার নিজের রেকর্ড: ${formatDate(own[0].date)} থেকে প্রতি লেনদেনের দিনে একটি বিন্দু। ড্যাশ লাইন = শেয়ারগুলোর কেনার দাম।`,
            )
          : L(
              `The shares you hold today, priced over recent months. Past buys and sales aren't in it. Your own daily record ${own.length ? `started ${formatDate(own[0].date)}` : "starts at today's close"} and takes over after ${MIN_SNAPSHOTS} trading days.`,
              `আজ যে শেয়ার আছে, গত কয়েক মাসের দামে। আগের কেনা-বেচা এতে নেই। আপনার নিজের দৈনিক রেকর্ড ${own.length ? `${formatDate(own[0].date)} থেকে শুরু হয়েছে` : "আজকের ক্লোজ থেকে শুরু হবে"}; ${MIN_SNAPSHOTS} দিন পর সেটিই দেখাবে।`,
            )}
      </p>
    </PfCard>
  );
}
