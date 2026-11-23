import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { CheckDots, CompareBars, RankLine, YearBars } from "@/components/stock/visuals/kit";
import { FlagList, PricePicture } from "@/components/stock/report/sections";
import { tx } from "@/components/stock/report/fmt";
import { sectorBn } from "@/lib/bn";
import type { AnalysisPart, StockReport } from "@/lib/stock-report";

/**
 * Each part's ONE picture, from the part's own figures or the report's
 * sections, drawn with the report's picture kit (2026-11-24: one picture a
 * card; the fair-price bar sits in the "In short" card). Server components.
 */

const crore = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 100 ? Math.round(a).toLocaleString("en-US") : a.toFixed(1);
  return `${v < 0 ? "-" : ""}${s}`;
};
const share = (v: number) => (Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : v.toFixed(2));
const shortYear = (y: number) => `'${String(y).slice(2)}`;

function ProfitPicture({ part }: { part: AnalysisPart }) {
  const s = part.series ?? [];
  if (s.length < 2) return null;
  const perShare = part.unit === "share";
  const fmt = (v: number) => (perShare ? `${v < 0 ? "-" : ""}${Math.abs(v).toFixed(2)}` : crore(v));
  const max = Math.max(0.0001, ...s.map((p) => Math.abs(p.value)));
  return (
    <YearBars
      label={`Profit each year${perShare ? " a share, in taka" : " in crore taka"}: ${s.map((p) => `${p.year} ${fmt(p.value)}`).join(", ")}`}
      max={max}
      items={s.map((p) => ({
        key: p.year,
        value: Math.abs(p.value),
        text: fmt(p.value),
        x: p.year,
        tone: p.value < 0 ? "bad" : undefined,
      }))}
      caption={
        perShare ? (
          <T en="Profit a share each year, ৳" bn="প্রতি বছর শেয়ারপ্রতি মুনাফা, ৳" />
        ) : (
          <T en="Profit each year, ৳ crore" bn="প্রতি বছরের মুনাফা, ৳ কোটি" />
        )
      }
    />
  );
}

function DividendPicture({ part }: { part: AnalysisPart }) {
  const s = part.series ?? [];
  if (s.length < 2) return null;
  const max = Math.max(0.0001, ...s.map((p) => p.value));
  const many = s.length > 6;
  const peak = s.reduce((a, b) => (b.value > a.value ? b : a), s[0]);
  return (
    <YearBars
      label={`Cash dividend a share by year: ${s.map((p) => `${p.year} ৳${share(p.value)}`).join(", ")}`}
      max={max}
      items={s.map((p, i) => ({
        key: p.year,
        value: p.value,
        // On a long run only the first, the last and the best year carry a figure.
        text: !many || i === 0 || i === s.length - 1 || p === peak ? share(p.value) : "",
        x: many ? shortYear(p.year) : p.year,
        tone: i === s.length - 1 ? "good" : undefined,
      }))}
      caption={<T en="Cash dividend a share, ৳" bn="শেয়ারপ্রতি নগদ ডিভিডেন্ড, ৳" />}
    />
  );
}

function FinancesPicture({ part }: { part: AnalysisPart }) {
  const bars = part.bars ?? [];
  if (bars.length < 2) return null;
  return (
    <CompareBars
      label={bars.map((b) => `${b.label.en} ${b.text.en}`).join(", ")}
      rows={bars.map((b, i) => ({ key: String(i), name: tx(b.label), value: b.value, text: tx(b.text), me: i === 0 }))}
      caption={<T en="Its loans against the savings it has built up" bn="জমানো টাকার তুলনায় ঋণ" />}
    />
  );
}

function BusinessPicture({ part }: { part: AnalysisPart }) {
  const ranks = part.ranks ?? [];
  if (!ranks.length) return null;
  const of = ranks[0].of;
  return (
    <div>
      <p className="an-pic-k">
        {part.sector ? (
          <T en={`Its place among the ${of} ${part.sector} companies on the DSE`} bn={`ডিএসইর ${sectorBn(part.sector)} সেক্টরের ${of}টি কোম্পানির মধ্যে এর অবস্থান`} />
        ) : (
          <T en={`Its place among the ${of} companies in its sector`} bn={`নিজের সেক্টরের ${of}টি কোম্পানির মধ্যে এর অবস্থান`} />
        )}
      </p>
      {ranks.slice(0, 1).map((r, i) => (
        <RankLine
          key={i}
          rank={r.rank}
          of={r.of}
          label={`${r.label.en}: number ${r.rank} of ${r.of}`}
          name={<>{tx(r.label)} · {tx(r.value)}</>}
          value={<T en={`No. ${r.rank} of ${r.of}`} bn={`${r.of}টির মধ্যে ${r.rank}`} />}
        />
      ))}
      <p className="mt-2 flex justify-between text-xs font-semibold text-text-main">
        <span><T en="Best" bn="সেরা" /></span>
        <span><T en="Last" bn="শেষে" /></span>
      </p>
    </div>
  );
}

function SafetyPicture({ report }: { report: StockReport }) {
  const rf = report.sections.red_flags;
  if (!rf) return null;
  const { red, amber, pass, checks } = rf.counts;
  return (
    <CheckDots
      red={red}
      amber={amber}
      pass={pass}
      label={`${checks} checks: ${red} serious, ${amber} smaller, ${pass} passed`}
      caption={
        <T
          en={`Our ${checks} safety checks: ${pass} passed, ${amber} smaller ${amber === 1 ? "thing" : "things"}, ${red} serious`}
          bn={`আমাদের ${checks}টি নিরাপত্তা যাচাই: ${pass}টি ঠিক, ${amber}টি ছোট বিষয়, ${red}টি গুরুতর`}
        />
      }
    />
  );
}

/** The picture beside a part's answer. */
export function partPicture(part: AnalysisPart, report: StockReport): ReactNode {
  switch (part.key) {
    case "profit":
      return <ProfitPicture part={part} />;
    case "finances":
      return <FinancesPicture part={part} />;
    case "business":
      return <BusinessPicture part={part} />;
    case "dividend":
      return <DividendPicture part={part} />;
    case "price": {
      const pr = report.sections.price;
      return pr ? <PricePicture s={pr} /> : null;
    }
    case "safety":
      return <SafetyPicture report={report} />;
    default:
      return null;
  }
}

/** Under the safety card: each check that found something, with its notice.
 *  The other parts have nothing under their picture. */
export function partExtra(part: AnalysisPart, report: StockReport): ReactNode {
  if (part.key !== "safety") return null;
  const flagged = (report.sections.red_flags?.checks ?? []).filter((c) => c.level !== "pass");
  return flagged.length > 0 ? <FlagList checks={flagged} /> : null;
}
