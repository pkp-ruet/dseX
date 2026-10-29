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
import type { Bi } from "@/lib/plain-language";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";

const tx = (b: Bi) => <T en={b.en} bn={b.bn} />;

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

function tile(label: Bi, value: string, sub: Bi, color?: string) {
  return (
    <Card key={label.en} padding="none" className="flex-1 rounded-2xl p-4">
      <p className="text-xs font-semibold mb-2 text-text-muted">{tx(label)}</p>
      <p className="text-2xl font-bold tabular-nums nums leading-none" style={{ color: color ?? "var(--text)" }}>
        {value}
      </p>
      <p className="text-xs mt-2 leading-snug text-text-muted">{tx(sub)}</p>
    </Card>
  );
}

export default function ValuationPanel({ financials, latestPrice, scoreRow, valuation, verdictHref }: Props) {
  const [tab, setTab] = useState<Tab>("pe");
  const { bn } = useLang();

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

  type TabDef = { key: Tab; label: Bi; show: boolean };
  const tabs: TabDef[] = ([
    { key: "pe", label: { en: "P/E over the years", bn: "বছরভিত্তিক পিই" }, show: peData.length >= 2 },
    { key: "pb", label: { en: "P/B and NAV", bn: "পিবি ও এনএভি" }, show: hasNav },
    { key: "sector", label: { en: "Against its sector", bn: "সেক্টরের তুলনায়" }, show: hasSector },
  ] as TabDef[]).filter((t) => t.show);

  // Ensure selected tab is available
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  const epsBasis = valuation?.eps_basis ?? null;
  const avgShort = bn
    ? valuation?.own_avg_pe_label?.short_bn ?? valuation?.own_avg_pe_label?.bn ?? "গড়"
    : valuation?.own_avg_pe_label?.short_en ?? "average";

  return (
    <section id="valuation" className="mb-8 stock-anchor">
      <SectionTitle
        title={<T en="Price compared with profit and assets" bn="মুনাফা ও সম্পদের তুলনায় দাম" />}
        sub={
          <T
            en="How today's price compares with the company's profit, its assets and its own past."
            bn="কোম্পানির মুনাফা, সম্পদ আর নিজের অতীতের তুলনায় আজকের দাম কেমন।"
          />
        }
      />

      {/* Headline tiles */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {tile(
          { en: "P/E", bn: "পিই" },
          currentPe != null ? currentPe.toFixed(1) : "—",
          epsBasis
            ? { en: `Price for each ৳1 of profit (${epsBasis.en})`, bn: `প্রতি ৳1 মুনাফার জন্য দাম (${epsBasis.bn})` }
            : { en: "Price for each ৳1 of yearly profit", bn: "প্রতি ৳1 বার্ষিক মুনাফার জন্য দাম" },
        )}
        {tile(
          { en: "Dividend yield", bn: "ডিভিডেন্ড ইল্ড" },
          divYield != null ? `${divYield.toFixed(2)}%` : "—",
          { en: "Yearly cash dividend as a share of the price", bn: "দামের তুলনায় বছরে নগদ ডিভিডেন্ড" },
        )}
        {tile(
          { en: "P/B", bn: "পিবি" },
          currentPb != null ? currentPb.toFixed(1) : "—",
          { en: "Price for each ৳1 of net assets", bn: "প্রতি ৳1 নিট সম্পদের জন্য দাম" },
        )}
      </div>

      {/* The ratios are free facts; our verdict on the price lives in the
          report's price section, one link away. */}
      {verdictHref && (
        <p className="mb-4 text-sm text-text-muted">
          <T en="Is this price low or high? " bn="এই দাম কম না বেশি? " />
          <a href={verdictHref} className="font-semibold text-primary-ink hover:underline">
            <T en="See our view on the price" bn="দাম নিয়ে আমাদের মত দেখুন" />
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
                  {tx(t.label)}
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
                  <Tooltip contentStyle={TIP_STYLE} formatter={(v: number) => [v.toFixed(1), bn ? "পিই" : "P/E"]} />
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
                  <T
                    en="Today's P/E uses the last 12 months of profit. Each past year uses that year's own profit."
                    bn="আজকের পিই শেষ 12 মাসের মুনাফা দিয়ে হিসাব করা। আগের প্রতিটি বছরে সেই বছরের মুনাফা ধরা হয়েছে।"
                  />
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
                  <Tooltip
                    contentStyle={TIP_STYLE}
                    formatter={(v: number) => [`৳${v.toFixed(1)}`, bn ? "শেয়ারপ্রতি এনএভি" : "NAV per share"]}
                  />
                  <Line type="monotone" dataKey="nav" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm mt-3 leading-snug text-text-muted">
                {currentPb != null ? (
                  <T
                    en={`Net assets per share over the years. Today the price is ${currentPb.toFixed(1)} times the net assets.`}
                    bn={`বছরভিত্তিক শেয়ারপ্রতি নিট সম্পদ। আজকের দাম নিট সম্পদের ${currentPb.toFixed(1)} গুণ।`}
                  />
                ) : (
                  <T en="Net assets per share over the years." bn="বছরভিত্তিক শেয়ারপ্রতি নিট সম্পদ।" />
                )}
              </p>
            </>
          )}

          {activeTab === "sector" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {tile(
                  { en: "This share's P/E", bn: "এই শেয়ারের পিই" },
                  currentPe != null ? currentPe.toFixed(1) : "—",
                  { en: "Price compared with profit today", bn: "আজ মুনাফার তুলনায় দাম" },
                )}
                {tile(
                  { en: "Sector's typical P/E", bn: "সেক্টরের সাধারণ পিই" },
                  sectorPe != null ? sectorPe.toFixed(1) : "—",
                  { en: "The middle company in its sector", bn: "সেক্টরের মাঝামাঝি কোম্পানি" },
                )}
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
