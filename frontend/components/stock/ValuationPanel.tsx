"use client";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import type { LatestPrice, ValuationContext } from "@/lib/api";
import { peHistory, peRatio, pbRatio, toNum, avgIgnoringNulls } from "@/lib/stock-metrics";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/stock/SectionTitle";
import { CHART } from "@/lib/chart-theme";

interface Props {
  financials: Record<string, unknown>[];
  latestPrice: LatestPrice;
  scoreRow: Record<string, number | string | boolean | null> | null;
  valuation?: ValuationContext | null;
  /** Where our verdict on the price lives (the full verdict's price question). */
  verdictHref?: string;
}

// Shared chart style (lib/chart-theme.ts) — 12px ticks, one tooltip look.
const TICK = CHART.xAxis.tick;
const TIP_STYLE = CHART.tooltip.contentStyle;

type Tab = "pe" | "pb" | "sector";

function tile(label: string, value: string, sub: string, color?: string) {
  return (
    <Card key={label} padding="none" className="flex-1 rounded-2xl p-4">
      <p className="text-xs font-semibold mb-2 text-text-muted">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums nums leading-none" style={{ color: color ?? "var(--text)" }}>
        {value}
      </p>
      <p className="text-xs mt-2 leading-snug text-text-muted">{sub}</p>
    </Card>
  );
}

export default function ValuationPanel({ financials, latestPrice, scoreRow, valuation, verdictHref }: Props) {
  const [tab, setTab] = useState<Tab>("pe");

  const ltp = latestPrice.ltp;
  const divYield = toNum(scoreRow?.div_yield_pct as number | null);

  // P/E series + own average
  const peData = peHistory(financials, ltp).filter((d) => d.pe != null);
  const peVals = peData.map((d) => d.pe);
  const ownAvgPe = valuation?.own_avg_pe ?? avgIgnoringNulls(peVals);
  const latestFin = [...financials].sort((a, b) => (toNum(b.year) ?? 0) - (toNum(a.year) ?? 0))[0] as Record<string, unknown> | undefined;
  const currentPe =
    valuation?.current_pe ??
    peRatio(ltp, toNum(latestFin?.eps), toNum(latestFin?.pe_ratio_cont_basic) ?? toNum(latestFin?.pe_ratio_basic));

  // P/B & NAV series
  const navData = [...financials]
    .sort((a, b) => (toNum(a.year) ?? 0) - (toNum(b.year) ?? 0))
    .map((r) => {
      const rec = r as Record<string, unknown>;
      const nav = toNum(rec.nav_per_share);
      return { year: String(rec.year), nav, pb: pbRatio(ltp, nav) };
    });
  const hasNav = navData.some((d) => d.nav != null);
  const currentPb = valuation?.current_pb ?? pbRatio(ltp, toNum(latestFin?.nav_per_share));

  const impliedPrice = valuation?.sector_implied_price ?? null;
  const sectorPe = valuation?.sector_median_pe ?? null;
  const hasSector = sectorPe != null && (currentPe != null || impliedPrice != null);

  type TabDef = { key: Tab; label: string; show: boolean };
  const tabs: TabDef[] = ([
    { key: "pe", label: "P/E history", show: peData.length >= 2 },
    { key: "pb", label: "P/B & NAV", show: hasNav },
    { key: "sector", label: "vs Sector", show: hasSector },
  ] as TabDef[]).filter((t) => t.show);

  // Ensure selected tab is available
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  const epsBasis = valuation?.eps_basis ?? null;
  const avgShort = valuation?.own_avg_pe_label?.short_en ?? "avg";

  return (
    <section id="valuation" className="mb-8 stock-anchor">
      <SectionTitle
        title="Is the Price Right?"
        sub={<>How today&apos;s price compares to the company&apos;s earnings and its own history.</>}
        bn="আজকের দাম কোম্পানির আয়ের তুলনায় সস্তা না দামি।"
      />

      {/* Headline tiles */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {tile(
          "P/E Ratio",
          currentPe != null ? currentPe.toFixed(1) : "—",
          epsBasis ? `Price per ৳1 of earnings, ${epsBasis.en}` : "Price per ৳1 of yearly earnings",
        )}
        {tile(
          "Dividend Yield",
          divYield != null ? `${divYield.toFixed(2)}%` : "—",
          "Annual cash return on the price",
        )}
        {tile(
          "P/B Ratio",
          currentPb != null ? currentPb.toFixed(1) : "—",
          "Price per ৳1 of net assets",
        )}
      </div>

      {/* The ratios are free facts; our verdict on the price lives in the
          full verdict (FullVerdict → PriceVerdict), one link away. */}
      {verdictHref && (
        <p className="mb-4 text-sm text-text-muted">
          Cheap or dear at this price?{" "}
          <a href={verdictHref} className="font-semibold text-primary-ink hover:underline">
            See our verdict on the price
          </a>
        </p>
      )}

      {tabs.length > 0 && activeTab && (
        <Card padding="none" className="rounded-2xl p-5">
          {/* Tab pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <Button
                  key={t.key}
                  variant="tab"
                  size="sm"
                  active={isActive}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className="shrink-0 whitespace-nowrap"
                >
                  {t.label}
                </Button>
              );
            })}
          </div>

          {activeTab === "pe" && (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={peData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number) => [v.toFixed(1), "P/E"]} />
                  {ownAvgPe != null && (
                    <ReferenceLine
                      y={ownAvgPe}
                      stroke="var(--text-muted)"
                      strokeDasharray="4 4"
                      label={{ value: `${avgShort} ${ownAvgPe.toFixed(1)}`, position: peLabelPosition(peData, ownAvgPe), fontSize: 12, fill: "var(--text-muted)" }}
                    />
                  )}
                  <Line type="monotone" dataKey="pe" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              {epsBasis?.basis === "ttm" && (
                <p className="text-sm leading-snug mt-3 text-text-muted">
                  Today&apos;s P/E uses the last 12 months of profit; past years use each year&apos;s own.
                </p>
              )}
            </>
          )}

          {activeTab === "pb" && (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={navData.filter((d) => d.nav != null)} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.8} />
                  <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number) => [`৳${v.toFixed(1)}`, "NAV / share"]} />
                  <Line type="monotone" dataKey="nav" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm mt-3 leading-snug text-text-muted">
                {currentPb != null
                  ? `Net assets per share over time. Today the price is ${currentPb.toFixed(1)}× book value.`
                  : "Net assets (book value) per share over time."}
              </p>
            </>
          )}

          {activeTab === "sector" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {tile("This stock P/E", currentPe != null ? currentPe.toFixed(1) : "—", "Current price-to-earnings")}
                {tile("Sector median P/E", sectorPe != null ? sectorPe.toFixed(1) : "—", "Typical peer in its sector")}
              </div>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

/**
 * Put the "5y avg" label on the side of the dashed line the recent P/E points
 * are NOT on — Recharts does no label/series collision avoidance, so a label
 * drawn into the last few years' dots was unreadable.
 */
function peLabelPosition(
  rows: { pe?: number | null }[],
  avg: number,
): "insideTopRight" | "insideBottomRight" {
  const recent = rows.slice(-3).map((r) => r.pe).filter((v): v is number => typeof v === "number");
  if (!recent.length) return "insideTopRight";
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  return mean >= avg ? "insideBottomRight" : "insideTopRight";
}
