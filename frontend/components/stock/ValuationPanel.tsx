"use client";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import type { LatestPrice, ValuationContext } from "@/lib/api";
import { valuationCaption } from "@/lib/plain-language";
import { peHistory, peRatio, pbRatio, toNum, avgIgnoringNulls } from "@/lib/stock-metrics";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Props {
  financials: Record<string, unknown>[];
  latestPrice: LatestPrice;
  scoreRow: Record<string, number | string | boolean | null> | null;
  valuation?: ValuationContext | null;
}

const TICK = { fontSize: 11, fill: "var(--text-muted)" };
const TIP_STYLE = {
  fontSize: 12,
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  boxShadow: "var(--shadow-soft)",
};

type Tab = "pe" | "pb" | "sector";

function tile(label: string, value: string, sub: string, color?: string) {
  return (
    <Card key={label} padding="none" className="flex-1 rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums nums leading-none" style={{ color: color ?? "var(--text)" }}>
        {value}
      </p>
      <p className="text-xs mt-2 leading-snug" style={{ color: "var(--text-muted)" }}>{sub}</p>
    </Card>
  );
}

export default function ValuationPanel({ financials, latestPrice, scoreRow, valuation }: Props) {
  const [tab, setTab] = useState<Tab>("pe");

  const ltp = latestPrice.ltp;
  const p4 = toNum(scoreRow?.p4_val as number | null);
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

  const caption = valuationCaption(p4);

  return (
    <section id="valuation" className="mb-8 scroll-mt-[112px]">
      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
        Is the Price Right?
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        {caption ?? "How today's price compares to the company's earnings and its own history."}
      </p>

      {/* Headline tiles */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {tile(
          "P/E Ratio",
          currentPe != null ? currentPe.toFixed(1) : "—",
          "Price per ৳1 of yearly earnings",
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

      {tabs.length > 0 && activeTab && (
        <Card padding="none" className="rounded-2xl p-5">
          {/* Tab pills */}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
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
                      label={{ value: `5y avg ${ownAvgPe.toFixed(1)}`, position: "insideTopRight", fontSize: 10, fill: "var(--text-muted)" }}
                    />
                  )}
                  <Line type="monotone" dataKey="pe" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              {currentPe != null && ownAvgPe != null && (
                <p className="text-sm mt-3 leading-snug" style={{ color: "var(--text-muted)" }}>
                  {currentPe < ownAvgPe
                    ? `Trading at ${currentPe.toFixed(1)} — below its 5-year average of ${ownAvgPe.toFixed(1)}.`
                    : `Trading at ${currentPe.toFixed(1)} — above its 5-year average of ${ownAvgPe.toFixed(1)}.`}
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
              <p className="text-sm mt-3 leading-snug" style={{ color: "var(--text-muted)" }}>
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
              {currentPe != null && sectorPe != null && sectorPe > 0 && (
                <p className="text-sm leading-snug" style={{ color: "var(--text-muted)" }}>
                  {currentPe < sectorPe
                    ? `Cheaper than the typical company in its sector (${(((sectorPe - currentPe) / sectorPe) * 100).toFixed(0)}% below the median).`
                    : `Pricier than the typical company in its sector (${(((currentPe - sectorPe) / sectorPe) * 100).toFixed(0)}% above the median).`}
                </p>
              )}
              {impliedPrice != null && ltp != null && (
                <div
                  className="rounded-xl p-3 text-sm leading-snug"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  At the sector-median P/E, this stock would be priced around{" "}
                  <b style={{ color: "var(--text)" }}>৳{impliedPrice.toFixed(1)}</b> versus today&apos;s ৳{ltp.toFixed(1)}.{" "}
                  <span className="opacity-80">(A peer comparison, not a fair-value estimate.)</span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
