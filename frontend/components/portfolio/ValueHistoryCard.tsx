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
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import Chip from "@/components/ui/Chip";
import Bn from "@/components/i18n/Bn";
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

  const chart = (
    <div style={{ width: "100%", height: CHART.height.md }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={CHART.margin}>
          <defs>
            <linearGradient id="pfHistFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.color.primary} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART.color.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
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
              name === "dsex" ? L("If it had followed DSEX", "DSEX-এর মতো চললে") : name === "cost" ? L("What it cost", "কেনার দাম") : L("Value", "মূল্য"),
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART.color.primary}
            fill="url(#pfHistFill)"
            {...CHART.area}
            fillOpacity={1}
            isAnimationActive={false}
          />
          {useOwn && (
            <Line type="stepAfter" dataKey="cost" stroke={CHART.color.reference} strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          )}
          {withDsex && (
            <Line type="monotone" dataKey="dsex" stroke={CHART.color.info} {...CHART.line} strokeWidth={1.5} connectNulls isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <Card padding="none" className="p-5 sm:p-6" data-card="value-history">
      <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {L("Your money over time", "সময়ের সাথে আপনার টাকা")}
      </h2>
      {!bn && <Bn className="text-sm text-text-muted">সময়ের সাথে আপনার পোর্টফোলিওর মূল্য।</Bn>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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

      {change != null && (
        <p className="mt-3 nums text-sm font-semibold text-text-main">
          <span className={`pv ${change >= 0 ? "text-positive" : "text-negative"}`}>
            {change >= 0 ? "+" : "−"}
            {takaGroup(Math.abs(change))}
            {changePct != null ? ` (${changePct >= 0 ? "+" : "−"}${Math.abs(changePct).toFixed(1)}%)` : ""}
          </span>{" "}
          <span className={`text-text-muted ${bn ? "font-bn" : ""}`}>
            {first &&
              (useOwn
                ? L(`profit change since ${formatDate(first.date)}`, `${formatDate(first.date)} থেকে লাভের পরিবর্তন`)
                : L(`change since ${formatDate(first.date)}`, `${formatDate(first.date)} থেকে পরিবর্তন`))}
          </span>
          {dsexChangePct != null && (
            <span className="block text-text-muted">
              {L(
                `DSEX moved ${dsexChangePct >= 0 ? "+" : ""}${dsexChangePct.toFixed(1)}% over the same days.`,
                `একই সময়ে DSEX ${dsexChangePct >= 0 ? "+" : ""}${dsexChangePct.toFixed(1)}%।`,
              )}
            </span>
          )}
        </p>
      )}

      <div className="mt-3">{chart}</div>

      <p className={`mt-2 text-xs text-text-muted ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {useOwn
          ? L(
              `Your own record — one point each trading day since ${formatDate(own[0].date)}. The dashed line is what your shares cost.`,
              `আপনার নিজের রেকর্ড — ${formatDate(own[0].date)} থেকে প্রতি লেনদেনের দিনে একটি বিন্দু। ড্যাশ লাইন = কেনার দাম।`,
            )
          : L(
              `The shares you hold today, priced over recent months — past buys and sales aren't in it. Your own daily record ${own.length ? `started ${formatDate(own[0].date)}` : "starts at today's close"} and takes over after ${MIN_SNAPSHOTS} trading days.`,
              `আজ যে শেয়ার আছে, গত কয়েক মাসের দামে — আগের কেনা-বেচা এতে নেই। আপনার নিজের দৈনিক রেকর্ড ${own.length ? `${formatDate(own[0].date)} থেকে শুরু হয়েছে` : "আজকের ক্লোজ থেকে শুরু হবে"}; ${MIN_SNAPSHOTS} দিন পর সেটিই দেখাবে।`,
            )}
      </p>
    </Card>
  );
}
