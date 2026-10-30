import Link from "next/link";
import { T } from "@/components/i18n/T";
import { IconCheck } from "@/components/ui/icons";
import HealthCheck, { PillarBars } from "@/components/stock/HealthCheck";
import ScoreHistory from "@/components/stock/ScoreHistory";
import BuyBelowAlert from "@/components/stock/report/BuyBelowAlert";
import Term from "@/components/stock/visuals/Term";
import TierPill from "@/components/ui/TierPill";
import { getTier } from "@/lib/constants";
import {
  CheckDots, CompareBars, DateLine, HundredBar, Meter, MoneySteps, PairBars, Paths, RankLine,
  RatingLadder, Squares, TrendLine, YearBars, type Swatch,
} from "@/components/stock/visuals/kit";
import { DateT, Label, TONE_CLASS, money, perShare, signedPct, tx } from "@/components/stock/report/fmt";
import type { CompanyDetail } from "@/lib/api";
import type {
  AlternativesSection, Bi, CashSection, DividendSection, NextSection, OwnersSection, PriceSection,
  QualitySection, RedFlagsSection, RisksSection, SafetySection, SectorSection, StorySection, ThisYearSection, Tone,
} from "@/lib/stock-report";

/**
 * What each question row of the stock report shows (2026-10-30 rebuild):
 * `…Picture` = the free picture (public figures only), `…Free` = free facts
 * under the answer, `…Premium` = a picture built on our figures (shown to
 * Premium readers and on the free samples), `…Details` = what sits in the
 * row's "Why we say this" fold. Server components; the data comes ready-worded
 * from the backend (`backend/services/stock_report.py`), the pictures from
 * `components/stock/visuals/kit.tsx`.
 */

const crore = (v: number | null | undefined) =>
  v == null ? "--" : `৳${v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1)} cr`;
const croreBnT = (v: number | null | undefined) =>
  v == null ? "--" : `৳${v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1)} কোটি`;
const yy = (y: number) => `'${String(y).slice(2)}`;

function Fact({ label, value, sub }: { label: Bi; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <Label {...label} />
      <span className="mt-0.5 block text-base font-bold leading-tight tabular-nums nums text-text-main">{value}</span>
      {sub && <span className="mt-0.5 block text-xs text-text-muted">{sub}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ 1 · does it make money?

/** Free: ten years of sales and profit as two lines (public accounts). */
export function MoneyPicture({ story }: { story?: StorySection }) {
  const rows = (story?.years ?? []).filter((y) => y.revenue_cr != null || y.profit_cr != null);
  if (rows.length < 3) return null;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const times = (a: number | null, b: number | null) =>
    a != null && b != null && a > 0 && b > 0 ? b / a : null;
  const sx = times(first.revenue_cr, last.revenue_cr);
  const px = times(first.profit_cr, last.profit_cr);
  const span = last.year - first.year;
  const note = (x: number | null) =>
    x == null ? undefined : (
      <T en={` · ${x >= 0.95 ? `${x.toFixed(1)}×` : `down ${Math.round((1 - x) * 100)}%`} in ${span} years`}
         bn={` · ${span} বছরে ${x >= 0.95 ? `${x.toFixed(1)} গুণ` : `${Math.round((1 - x) * 100)}% কম`}`} />
    );
  return (
    <TrendLine
      label={`Sales and profit from ${first.year} to ${last.year}`}
      from={String(first.year)}
      to={String(last.year)}
      series={[
        { key: "sales", values: rows.map((y) => y.revenue_cr), swatch: "quiet", name: <T en="Sales" bn="বিক্রি" />, note: note(sx) },
        { key: "profit", values: rows.map((y) => y.profit_cr), swatch: "primary", name: <T en="Profit" bn="মুনাফা" />, note: note(px) },
      ]}
    />
  );
}

/** Free: the latest results headline (a public notice). */
export function ThisYearFree({ s }: { s: ThisYearSection }) {
  if (!s.latest) return null;
  return (
    <p className="text-sm text-text-muted">
      <T en="Latest results: " bn="সর্বশেষ ফল: " />
      <span className="font-semibold text-text-main">{tx(s.latest.headline)}</span>
      {s.latest.posted && (
        <>
          {" · "}
          <DateT iso={s.latest.posted} />
        </>
      )}
    </p>
  );
}

/** Premium: profit a share quarter by quarter, this year against last. */
export function ThisYearPremium({ s }: { s: ThisYearSection }) {
  if (!s.quarters.length) return null;
  return (
    <>
      <PairBars
        label="Profit per share by quarter, this year against last year"
        legend={[<T key="l" en="Last year" bn="গত বছর" />, tx(s.fy_label)]}
        items={s.quarters.map((q) => ({ key: q.q, name: tx(q.label), prev: q.prev, cur: q.cur }))}
      />
      <p className="rv-cap">
        <T en="Profit for each share, every three months " bn="প্রতি তিন মাসে শেয়ারপ্রতি মুনাফা " />
        <Term k="eps" />
      </p>
    </>
  );
}

export function ThisYearDetails({ s, story }: { s?: ThisYearSection; story?: StorySection }) {
  const g = story?.growth;
  return (
    <>
      {g && (
        <div className="rp-facts" data-cols="3">
          <Fact label={{ en: "Years looked at", bn: "যত বছর দেখা" }} value={<T en={`${g.years} years`} bn={`${g.years} বছর`} />} />
          <Fact label={{ en: "Sales grew each year by about", bn: "প্রতি বছর বিক্রি বেড়েছে প্রায়" }} value={signedPct(g.sales_pct)} />
          <Fact label={{ en: "Profit grew each year by about", bn: "প্রতি বছর মুনাফা বেড়েছে প্রায়" }} value={signedPct(g.profit_pct)} />
        </div>
      )}
      {s?.next && !s.watch && (
        <div className="rp-note text-sm text-text-main">
          <p className="font-bold">
            {tx(s.next.what)}
            {s.next.date && (
              <>
                {" · "}
                {s.next.approx && <T en="around " bn="সম্ভাব্য " />}
                <DateT iso={s.next.date} />
              </>
            )}
          </p>
          {s.next.beat != null && (
            <p>
              <T
                en={`To keep growing, profit for each share has to beat last year's ${perShare(s.next.beat)} for the same months.`}
                bn={`মুনাফা বাড়তে থাকলে শেয়ারপ্রতি মুনাফা গত বছরের একই সময়ের ${perShare(s.next.beat)}-এর বেশি হতে হবে।`}
              />
            </p>
          )}
        </div>
      )}
      {story && story.meaning.length > 0 && (
        <div className="rp-meaning">
          {story.meaning.map((m, i) => (
            <p key={i} className="text-sm leading-relaxed text-text-main sm:text-base">{tx(m)}</p>
          ))}
        </div>
      )}
    </>
  );
}

/** The ten-year table, for the data room's Profit tab (the page shows the line). */
export function StoryTable({ s }: { s: StorySection }) {
  const rows = s.years.filter((y) => y.revenue_cr != null || y.profit_cr != null);
  if (!rows.length) return null;
  return (
    <div className="mb-6 overflow-x-auto">
      <p className="mb-2 text-sm font-bold text-text-main">
        <T en="Ten years of accounts" bn="দশ বছরের হিসাব" />
      </p>
      <table className="w-full border-collapse text-xs tabular-nums nums sm:text-sm">
        <thead>
          <tr className="text-left text-xs text-text-muted">
            <th className="py-2 pr-3 font-semibold"><T en="Year" bn="বছর" /></th>
            <th className="py-2 pr-3 text-right font-semibold"><T en="Sales" bn="বিক্রি" /></th>
            <th className="py-2 pr-3 text-right font-semibold"><T en="Profit" bn="মুনাফা" /></th>
            <th className="py-2 pr-3 text-right font-semibold"><T en="Kept from ৳100 sold" bn="৳100 বিক্রিতে থাকে" /></th>
            <th className="py-2 text-right font-semibold"><T en="Profit on owners' money" bn="মালিকের টাকায় মুনাফা" /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((y) => (
            <tr key={y.year} className="border-t border-border">
              <td className="py-2 pr-3 font-semibold text-text-main">{y.year}</td>
              <td className="py-2 pr-3 text-right"><T en={crore(y.revenue_cr)} bn={croreBnT(y.revenue_cr)} /></td>
              <td className={`py-2 pr-3 text-right ${y.profit_cr != null && y.profit_cr < 0 ? "text-negative" : ""}`}>
                <T en={crore(y.profit_cr)} bn={croreBnT(y.profit_cr)} />
              </td>
              <td className="py-2 pr-3 text-right">{y.margin_pct == null ? "--" : `৳${y.margin_pct.toFixed(1)}`}</td>
              <td className="py-2 text-right">{y.roe_pct == null ? "--" : `${y.roe_pct.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ 2 · is the profit real cash?

export function CashPremium({ s }: { s: CashSection }) {
  if (!s.years.length) return null;
  const last = s.years[s.years.length - 1];
  const r = Math.max(0, last.ratio);
  const max = Math.max(110, ...s.years.map((y) => y.ratio)) * 1.08;
  const tone = (y: { ratio: number }, i: number): Tone | undefined =>
    y.ratio < 0 ? "bad" : i === s.years.length - 1 ? (s.usual != null && y.ratio < s.usual - 10 ? "fair" : "good") : undefined;
  return (
    <>
      <HundredBar
        label={`This year, ${Math.round(Math.min(100, r))} percent of its profit came in as cash`}
        parts={[
          { key: "cash", value: Math.min(100, r), swatch: last.ratio < 50 ? "fair" : "good", text: <T en="Came in as real cash" bn="আসল নগদ হয়ে এসেছে" /> },
          ...(r < 100 ? [{ key: "not", value: 100 - r, swatch: "quiet" as const, text: <T en="Not in cash yet" bn="এখনো নগদ হয়নি" /> }] : []),
        ]}
        caption={<T en="This year's profit, split by how much of it arrived as money" bn="এ বছরের মুনাফা, কতটা টাকা হয়ে এসেছে সেই ভাগে" />}
      />
      {s.years.length >= 2 && (
        <YearBars
          label="Cash from the business for every 100 taka of profit, by year"
          max={max}
          refLine={{ value: 100, text: <T en="All of it" bn="পুরোটাই" /> }}
          items={s.years.map((y, i) => ({ key: y.year, value: Math.max(0, y.ratio), text: "", x: yy(y.year), tone: tone(y, i) }))}
          caption={
            <>
              <T
                en="Each year: how much of the profit came in as cash. Reaching the line means all of it did. "
                bn="প্রতি বছর মুনাফার কতটা নগদ হয়ে এসেছে। দাগ পর্যন্ত পৌঁছালে পুরোটাই এসেছে। "
              />
              <Term k="cash_flow" />
            </>
          }
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------ 3 · can it handle its loans?

export function SafetyFree({ s }: { s: SafetySection }) {
  const r = s.rating;
  if (!r) return null;
  return (
    <RatingLadder
      grade={r.long_term}
      label={`Credit rating ${r.long_term} from ${r.agency}`}
      caption={
        <>
          <T en={`Credit grade from ${r.agency}`} bn={`${r.agency}-এর ঋণমান`} />
          {r.outlook ? <T en={`, ${r.outlook.toLowerCase()} outlook`} bn={`, দৃষ্টিভঙ্গি ${r.outlook}`} /> : null}
          {" · "}
          <DateT iso={r.date} />
          {" · "}
          <Term k="rating" />
        </>
      }
    />
  );
}

export function SafetyPremium({ s }: { s: SafetySection }) {
  const m = s.measures;
  if (!m) return null;
  if (m.no_loans) {
    return (
      <p className="text-sm font-semibold text-positive">
        <T en="It has no loans." bn="এর কোনো ঋণ নেই।" />
      </p>
    );
  }
  return (
    <>
      {m.saved_pct != null && (
        <Meter
          min={0}
          max={150}
          label={`Its loans next to the money it has kept from past years: ${m.saved_pct < 50 ? "comfortable" : m.saved_pct <= 100 ? "worth watching" : "heavy"}`}
          zones={[
            { key: "ok", from: 0, to: 50, tone: "good", name: <T en="Comfortable" bn="স্বস্তির" /> },
            { key: "watch", from: 50, to: 100, tone: "fair", name: <T en="Watch" bn="নজরে রাখুন" /> },
            { key: "heavy", from: 100, to: 150, tone: "bad", name: <T en="Heavy" bn="বেশি" /> },
          ]}
          pins={[{ key: "now", value: Math.min(150, m.saved_pct), main: true, text: <T en="Its loans" bn="এর ঋণ" /> }]}
          caption={<T en="Its loans next to the money it has kept from past years" bn="আগের বছরগুলোতে জমানো টাকার তুলনায় এর ঋণ" />}
        />
      )}
      {m.cover != null && (
        <p className="mt-3 text-sm text-text-main">
          <T
            en={m.cover >= 3 ? "Its profit pays the interest on its loans easily." : m.cover >= 1.5 ? "Its profit covers the interest on its loans, but not by much." : m.cover >= 1 ? "Its profit barely covers the interest on its loans." : "Its profit does not cover the interest on its loans."}
            bn={m.cover >= 3 ? "মুনাফা দিয়ে ঋণের সুদ সহজেই দেওয়া যায়।" : m.cover >= 1.5 ? "মুনাফা দিয়ে ঋণের সুদ মেটে, তবে খুব বেশি জায়গা থাকে না।" : m.cover >= 1 ? "মুনাফা দিয়ে ঋণের সুদ কোনোমতে মেটে।" : "মুনাফা দিয়ে ঋণের সুদও মেটে না।"}
          />{" "}
          <Term k="interest_cover" />
        </p>
      )}
    </>
  );
}

export function SafetyDetails({ s }: { s: SafetySection }) {
  if (!s.facts.length) return null;
  return (
    <ul className="rp-rows">
      {s.facts.map((f, i) => (
        <li key={i} className="text-sm">
          <span className="text-text-muted">{tx(f.label)}</span>
          <b className={`text-right ${TONE_CLASS[f.tone]}`}>{tx(f.value)}</b>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ 4 · is it strong in its business?

/** How strong the business is, as one word from its "business strength"
 *  check (2026-10-30: the row answers this question only). */
export function strengthAnswer(scoreRow: CompanyDetail["score_row"]): { word: Bi; tone: Tone } | null {
  const v = scoreRow?.p3_moat;
  const n = typeof v === "number" ? v : v == null ? null : Number(v);
  if (n == null || !Number.isFinite(n)) return null;
  return n >= 8 ? { word: { en: "Very strong", bn: "খুব শক্তিশালী" }, tone: "good" }
    : n >= 6 ? { word: { en: "Strong", bn: "শক্তিশালী" }, tone: "good" }
    : n >= 4 ? { word: { en: "Average", bn: "মাঝারি" }, tone: "fair" }
    : { word: { en: "Weak", bn: "দুর্বল" }, tone: "bad" };
}

const ordinal = (n: number) => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** The three ranks that answer "is it strong in its business?", by the
 *  backend's English label: its size, how much of each sale it keeps, our grade. */
const STRENGTH_RANKS: { en: string; name: Bi }[] = [
  { en: "Sales", name: { en: "Size (its sales)", bn: "আকার (বিক্রি)" } },
  { en: "Profit kept from sales", name: { en: "Profit it keeps from each sale", bn: "প্রতি বিক্রিতে যা মুনাফা থাকে" } },
  { en: "Our score", name: { en: "Our grade", bn: "আমাদের গ্রেড" } },
];

/** Free: where it stands among the companies in its own sector — three lines,
 *  each saying its place in words ("The best", "2nd of 3"); the dots only
 *  illustrate it. */
export function StrengthPicture({ sector }: { sector: SectorSection }) {
  const rows = STRENGTH_RANKS
    .map((r) => ({ ...r, rank: sector.ranks.find((x) => x.label.en === r.en) }))
    .filter((r) => r.rank);
  if (!rows.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm text-text-muted">
        <T
          en={`Compared with the other ${sector.peers - 1} ${sector.peers - 1 === 1 ? "company" : "companies"} in ${sector.sector}:`}
          bn={`${sector.sector} সেক্টরের অন্য ${sector.peers - 1}টি কোম্পানির সঙ্গে তুলনায়:`}
        />
      </p>
      {rows.map(({ en, name, rank }) => {
        const r = rank!;
        return (
          <RankLine
            key={en}
            rank={r.rank}
            of={r.of}
            label={`${name.en}: ${r.rank} of ${r.of}`}
            name={tx(name)}
            value={
              r.rank === 1
                ? <T en="The best" bn="সবার সেরা" />
                : <T en={`${ordinal(r.rank)} of ${r.of}`} bn={`${r.of}টির মধ্যে ${r.rank} নম্বর`} />
            }
          />
        );
      })}
    </div>
  );
}

/** The fold: how we grade the whole company — the five bars, each explained,
 *  and how the grade has moved. */
export function QualityDetails({ detail, showBars = true }: { detail: CompanyDetail; showBars?: boolean }) {
  if (!detail.score_row) return null;
  return (
    <>
      {showBars && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-bold text-text-main">
            <T en="How we grade the whole company" bn="পুরো কোম্পানিকে যেভাবে গ্রেড দিই" />
          </p>
          <p className="mb-3 text-xs text-text-muted">
            <T en="The five things we look at. A longer bar is better." bn="আমরা যে পাঁচটি বিষয় দেখি। দাগ যত লম্বা, তত ভালো।" />
          </p>
          <PillarBars scoreRow={detail.score_row} />
        </div>
      )}
      <HealthCheck scoreRow={detail.score_row} detail={detail} />
      {detail.score_history && detail.score_history.points.length >= 2 && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-sm font-bold text-text-main">
            <T en="Has it always been this good?" bn="সবসময় কি এমন ভালো ছিল?" />
          </p>
          <ScoreHistory history={detail.score_history} />
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ 5 · does it share its profit?

/** Built on the page from the dividend history (public): a word, a line and the bars. */
export function sharesAnswer(s: DividendSection): { word: Bi; tone: Tone; line: Bi } | null {
  const h = s.history.slice(-10);
  if (h.length < 2) return null;
  const paid = h.filter((y) => y.cash_ps > 0).length;
  const n = h.length;
  const word: Bi =
    paid === n ? { en: "Every year", bn: "প্রতি বছর" }
    : paid >= n / 2 ? { en: "Most years", bn: "বেশির ভাগ বছর" }
    : paid > 0 ? { en: "Rarely", bn: "কদাচিৎ" }
    : { en: "No", bn: "না" };
  const tone: Tone = paid === n ? "good" : paid >= n / 2 ? "fair" : "bad";
  const line: Bi =
    paid === n
      ? { en: `It paid a cash dividend in each of the last ${n} years.`, bn: `গত ${n} বছরের প্রতিটিতে নগদ ডিভিডেন্ড দিয়েছে।` }
      : { en: `It paid a cash dividend in ${paid} of the last ${n} years.`, bn: `গত ${n} বছরের মধ্যে ${paid} বছর নগদ ডিভিডেন্ড দিয়েছে।` };
  return { word, tone, line };
}

export function SharesPicture({ s }: { s: DividendSection }) {
  const h = s.history.slice(-10);
  if (h.length < 2) return null;
  const max = Math.max(1, ...h.map((y) => y.cash_ps)) * 1.1;
  return (
    <YearBars
      label="Cash dividend per share by year"
      max={max}
      items={h.map((y, i) => ({
        key: y.year,
        value: y.cash_ps,
        text: y.cash_ps <= 0 ? "0" : y.cash_ps >= 10 ? y.cash_ps.toFixed(0) : y.cash_ps.toFixed(1),
        x: yy(y.year),
        tone: y.cash_ps <= 0 ? "bad" : i === h.length - 1 ? "good" : undefined,
      }))}
      caption={<T en="Cash dividend, taka a share, each year" bn="প্রতি বছর শেয়ারপ্রতি নগদ ডিভিডেন্ড, টাকায়" />}
    />
  );
}

// ------------------------------------------------------------------ price

/** Free: what you pay for ৳1 of yearly profit, now vs its usual vs its sector. */
export function PricePicture({ s }: { s: PriceSection }) {
  const pe = s.pe;
  const yrs = (v: number) => <T en={`${Math.round(v)} years`} bn={`${Math.round(v)} বছর`} />;
  const rows = [
    pe.now != null && pe.now > 0 && { key: "now", name: <T en="Today" bn="আজ" />, value: pe.now, text: yrs(pe.now), me: true },
    pe.usual != null && pe.usual > 0 && { key: "usual", name: <T en="Usually" bn="সাধারণত" />, value: pe.usual, text: yrs(pe.usual) },
    pe.sector != null && pe.sector > 0 && { key: "sector", name: <T en="Similar companies" bn="একই ধরনের কোম্পানি" />, value: pe.sector, text: yrs(pe.sector) },
  ].filter(Boolean) as { key: string; name: React.ReactNode; value: number; text: React.ReactNode; me?: boolean }[];
  if (!rows.some((r) => r.me)) {
    return (
      <p className="text-sm text-text-muted">
        <T
          en={`Today ${money(s.today)}. It made no profit in its latest results, so there is no price-for-profit figure.`}
          bn={`আজ ${money(s.today)}। সর্বশেষ ফলে মুনাফা নেই, তাই মুনাফার তুলনায় দামের হিসাব হয় না।`}
        />
      </p>
    );
  }
  return (
    <CompareBars
      label={`How many years of its profit the price equals: ${rows.map((r) => `${r.key} ${Math.round(r.value)} years`).join(", ")}`}
      rows={rows}
      caption={
        <>
          <T
            en="How many years of its profit you pay for. A shorter bar means a cheaper share. "
            bn="কত বছরের মুনাফার দাম দিচ্ছেন। ছোট দাগ মানে শেয়ারটি সস্তা। "
          />
          <Term k="pe" />
        </>
      }
    />
  );
}

/** Premium: today's price on the cheap / fair / expensive line, with our buy price. */
export function PricePremium({ s }: { s: PriceSection }) {
  const f = s.fair;
  if (!f) return null;
  const pts = [s.today, f.low, f.high, ...(s.buy_below != null ? [s.buy_below] : [])];
  const min = Math.min(...pts) * 0.85;
  const max = Math.max(...pts) * 1.12;
  return (
    <Meter
      min={min}
      max={max}
      label={`Fair value ${money(f.low)} to ${money(f.high)}; today ${money(s.today)}${s.buy_below != null ? `; buy below ${money(s.buy_below)}` : ""}`}
      zones={[
        { key: "cheap", from: min, to: f.low, tone: "good", name: <T en="Cheap" bn="সস্তা" /> },
        { key: "fair", from: f.low, to: f.high, tone: "neutral", name: <T en={`Fair ${money(f.low)}–${money(f.high)}`} bn={`ন্যায্য ${money(f.low)}–${money(f.high)}`} /> },
        { key: "dear", from: f.high, to: max, tone: "bad", name: <T en="Expensive" bn="দামি" /> },
      ]}
      pins={[
        { key: "today", value: s.today, main: true, text: <T en={`Today ${money(s.today)}`} bn={`আজ ${money(s.today)}`} /> },
        ...(s.buy_below != null
          ? [{ key: "buy", value: s.buy_below, text: <T en={`Buy below ${money(s.buy_below)}`} bn={`${money(s.buy_below)}-এর নিচে কিনুন`} /> }]
          : []),
      ]}
    />
  );
}

export function PriceDetails({ s, code, ltp, w52High, w52Low }: {
  s: PriceSection; code: string; ltp: number | null; w52High?: number | null; w52Low?: number | null;
}) {
  return (
    <>
      {s.buy_below != null && (
        <div className="rp-note flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-text-main">
            <T en={`Our buy price: under ${money(s.buy_below)}`} bn={`আমাদের কেনার দাম: ${money(s.buy_below)}-এর নিচে`} />
          </p>
          <BuyBelowAlert code={code} target={s.buy_below} ltp={ltp} w52High={w52High} w52Low={w52Low} />
        </div>
      )}
      {s.scenarios.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-text-main">
            <T en="Three paths for the next 12 months" bn="আগামী 12 মাসের তিনটি পথ" />
          </p>
          <Paths
            today={s.today}
            todayText={<T en={`From today's ${money(s.today)}`} bn={`আজকের ${money(s.today)} থেকে`} />}
            label={`Three prices in 12 months: ${s.scenarios.map((sc) => `${money(sc.price)} if ${sc.label.en}`).join("; ")}`}
            paths={s.scenarios.map((sc, i) => ({ key: String(i), price: sc.price, priceText: money(sc.price), name: tx(sc.label) }))}
            caption={<T en="These are sums from its profit and its usual price, not a forecast." bn="এগুলো মুনাফা আর স্বাভাবিক দাম থেকে হিসাব, পূর্বাভাস নয়।" />}
          />
        </div>
      )}
      {s.methods.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-text-main">
            <T en="How we worked out what it's worth" bn="এর মূল্য যেভাবে হিসাব করেছি" />
          </p>
          <ul className="rp-rows">
            {s.methods.map((m, i) => (
              <li key={i} className="text-sm">
                <span className="text-text-muted">{tx(m.label)}</span>
                <b className="tabular-nums nums text-text-main">{money(m.price)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ dividend (what it pays you)

/** Free: the latest dividend and its dates (the same facts as the calendar). */
export function DividendFree({ s }: { s: DividendSection }) {
  const l = s.latest;
  if (!l) return null;
  const dates = [
    l.upcoming && l.buy_by && { key: "buy", name: <T en="Last day to buy" bn="কেনার শেষ দিন" />, when: <DateT iso={l.buy_by} />, strong: true },
    l.record_date && {
      key: "record",
      name: <><T en="Record date" bn="রেকর্ড ডেট" /> <Term k="record_date" /></>,
      when: <DateT iso={l.record_date} />,
    },
    l.agm_date && { key: "agm", name: <T en="AGM" bn="এজিএম" />, when: <DateT iso={l.agm_date} /> },
  ].filter(Boolean) as { key: string; name: React.ReactNode; when: React.ReactNode; strong?: boolean }[];
  return (
    <>
      <p className="text-base text-text-main">
        {l.cash_ps != null && l.cash_ps > 0 ? (
          <>
            <b className="text-2xl tabular-nums nums">{perShare(l.cash_ps)}</b>{" "}
            <T en="cash a share" bn="শেয়ারপ্রতি নগদ" />
            {l.yield_pct != null && (
              <span className="text-text-muted">
                {" · "}
                <T en={`about ${l.yield_pct.toFixed(1)}% a year on today's price, like interest`} bn={`আজকের দামে বছরে প্রায় ${l.yield_pct.toFixed(1)}%, সুদের মতো`} />
              </span>
            )}
          </>
        ) : (
          <T en="No cash dividend in its latest declaration" bn="সর্বশেষ ঘোষণায় নগদ ডিভিডেন্ড নেই" />
        )}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">
        {tx(l.kind)}
        {l.fy ? ` · FY${l.fy}` : ""}
        {l.stock_pct != null && l.stock_pct > 0 ? <T en={` · ${l.stock_pct}% bonus shares`} bn={` · ${l.stock_pct}% বোনাস শেয়ার`} /> : null}
      </p>
      {dates.length > 0 && <DateLine label="Dividend dates" items={dates} />}
    </>
  );
}

/** Premium: your ৳10,000, and how much of its profit it pays out. */
export function DividendPremium({ s }: { s: DividendSection }) {
  const k = s.on_10k;
  return (
    <>
      {k && k.shares > 0 && (
        <MoneySteps
          label={`10,000 taka buys ${k.shares} shares and gets about ${Math.round(k.net)} taka a year after tax`}
          steps={[
            { key: "in", value: "৳10,000", name: <T en="put in today" bn="আজ বিনিয়োগ" /> },
            { key: "sh", value: k.shares.toLocaleString("en-US"), name: <T en="shares" bn="শেয়ার" /> },
            { key: "out", value: money(k.net), name: <T en={`a year after ${s.tax_pct}% tax`} bn={`বছরে, ${s.tax_pct}% করের পর`} />, tone: "good" },
          ]}
        />
      )}
      {s.payout_pct != null && s.payout_pct > 0 && (
        <HundredBar
          label={`Of its profit, ${Math.round(Math.min(100, s.payout_pct))} percent paid out as dividend`}
          parts={
            s.payout_pct > 100
              ? [{ key: "paid", value: 100, swatch: "bad", text: <T en="It paid out more than it earned" bn="আয়ের চেয়ে বেশি দিয়েছে" /> }]
              : [
                  { key: "paid", value: s.payout_pct, swatch: "primary", text: <T en="Paid to shareholders" bn="শেয়ারহোল্ডারদের দিয়েছে" /> },
                  { key: "kept", value: 100 - s.payout_pct, swatch: "quiet", text: <T en="Kept to grow the business" bn="ব্যবসা বাড়াতে রেখেছে" /> },
                ]
          }
          caption={
            <>
              <T en="How it splits its profit " bn="মুনাফা যেভাবে ভাগ করে " />
              <Term k="payout" />
            </>
          }
        />
      )}
    </>
  );
}

export function DividendDetails({ s }: { s: DividendSection }) {
  if (!s.next_range) return null;
  return (
    <div className="rp-facts" data-cols="2">
      <Fact label={{ en: "Next year's dividend could be", bn: "আগামী বছরের ডিভিডেন্ড হতে পারে" }} value={`${perShare(s.next_range.low)}–${perShare(s.next_range.high)}`} sub={<T en="a share, if profit holds" bn="শেয়ারপ্রতি, মুনাফা একই থাকলে" />} />
    </div>
  );
}

// ------------------------------------------------------------------ red flags

function FlagList({ checks }: { checks: RedFlagsSection["checks"] }) {
  return (
    <ul className="rp-checks mt-3">
      {checks.map((c) => (
        <li key={c.key} className="rp-check" data-level={c.level}>
          <span className="rp-check-dot" aria-hidden="true" />
          <span className="min-w-0 text-sm leading-snug">
            <b className="block text-text-main">{tx(c.label)}</b>
            <span className="text-text-muted">{tx(c.detail)}</span>
            {c.evidence && (
              <span className="mt-0.5 block text-xs text-text-muted">
                <T en="Notice: " bn="নোটিশ: " />
                {c.evidence.title} · <DateT iso={c.evidence.date} />
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Free: one dot per check, and every serious red flag named with its notice. */
export function RedFlagsFree({ s }: { s: RedFlagsSection }) {
  const reds = s.checks.filter((c) => c.level === "red");
  const { red, amber, pass } = s.counts;
  return (
    <>
      <CheckDots
        red={red}
        amber={amber}
        pass={pass}
        label={`${s.counts.checks} checks: ${red} red, ${amber} to watch, ${pass} fine`}
        caption={
          <T
            en={`We checked ${s.counts.checks} things: ${red} serious, ${amber} worth a look, ${pass} fine`}
            bn={`আমরা ${s.counts.checks}টি বিষয় দেখেছি: ${red}টি গুরুতর, ${amber}টি দেখে নেওয়ার মতো, ${pass}টি ঠিক আছে`}
          />
        }
      />
      {reds.length > 0 && <FlagList checks={reds} />}
    </>
  );
}

export function RedFlagsDetails({ s }: { s: RedFlagsSection }) {
  const ambers = s.checks.filter((c) => c.level === "amber");
  const passed = s.checks.filter((c) => c.level === "pass");
  return (
    <>
      {ambers.length > 0 && <FlagList checks={ambers} />}
      {passed.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-bold text-text-muted">
            <T en={`Passed ${passed.length} checks`} bn={`${passed.length}টি যাচাইয়ে উত্তীর্ণ`} />
          </p>
          <ul className="rp-passed">
            {passed.map((c) => (
              <li key={c.key} className="text-xs leading-snug text-text-main">
                <IconCheck size={12} />
                <span>{tx(c.detail)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ owners

const OWN_KEYS: { k: "sponsor" | "institute" | "foreign" | "govt" | "public"; swatch: Swatch; en: string; bn: string }[] = [
  { k: "sponsor", swatch: "primary", en: "Founders and directors", bn: "উদ্যোক্তা-পরিচালক" },
  { k: "govt", swatch: "navy", en: "Government", bn: "সরকার" },
  { k: "institute", swatch: "info", en: "Institutions", bn: "প্রতিষ্ঠান" },
  { k: "foreign", swatch: "gold", en: "Foreign investors", bn: "বিদেশি বিনিয়োগকারী" },
  { k: "public", swatch: "quiet", en: "The public", bn: "সাধারণ বিনিয়োগকারী" },
];

/** Free: of every 100 shares, who holds them, and the 30% rule. */
export function OwnersFree({ s }: { s: OwnersSection }) {
  const sp = s.split;
  if (!sp) return null;
  const parts = OWN_KEYS.map((o) => ({ ...o, v: sp[o.k] ?? 0 })).filter((o) => o.v > 0.05);
  if (!parts.length) return null;
  return (
    <>
      <Squares
        label={`Of every 100 shares: ${parts.map((p) => `${p.en} ${p.v.toFixed(0)}`).join(", ")}`}
        parts={parts.map((p) => ({ key: p.k, value: p.v, swatch: p.swatch, text: <T en={p.en} bn={p.bn} /> }))}
        caption={
          <>
            <T en="Of every 100 shares" bn="প্রতি 100টি শেয়ারের মধ্যে" />
            {sp.as_of && (
              <>
                {" · "}
                <DateT iso={sp.as_of} />
              </>
            )}
          </>
        }
      />
      {s.rule30 && (
        <p className={`mt-2 text-sm ${s.rule30.ok ? "text-text-main" : "font-semibold text-negative"}`}>
          {s.rule30.ok ? <IconCheck size={12} /> : null}{" "}
          <T
            en={`Founders and directors hold ${s.rule30.pct.toFixed(1)}%; the rule asks for at least 30%.`}
            bn={`উদ্যোক্তা-পরিচালকদের হাতে ${s.rule30.pct.toFixed(1)}%; নিয়মে অন্তত 30% লাগে।`}
          />{" "}
          <Term k="sponsors" />
        </p>
      )}
    </>
  );
}

const shares = (n: number) => n.toLocaleString("en-US");

export function OwnersDetails({ s }: { s: OwnersSection }) {
  return (
    <>
      {s.trades.length > 0 && (
        <ul className="rp-timeline">
          {s.trades.map((t, i) => (
            <li key={i} data-side={t.side}>
              <b className="block text-sm text-text-main">
                {tx(t.role)}
                {t.name ? <span className="font-normal text-text-muted"> · {t.name}</span> : null}
              </b>
              <span className="block text-sm text-text-main">
                <T
                  en={`${t.side === "buy" ? "Bought" : "Sold"} ${shares(t.shares)} shares${t.status === "declared" ? " (declared, not yet confirmed)" : ""}`}
                  bn={`${shares(t.shares)}টি শেয়ার ${t.side === "buy" ? "কিনেছেন" : "বিক্রি করেছেন"}${t.status === "declared" ? " (ঘোষণা দিয়েছেন, এখনো নিশ্চিত হয়নি)" : ""}`}
                />
                {t.value_mn != null && (
                  <span className="text-text-muted">
                    {" · "}
                    <T en={`about ${crore(t.value_mn / 10)}`} bn={`প্রায় ${croreBnT(t.value_mn / 10)}`} />
                  </span>
                )}
              </span>
              <span className="block text-xs text-text-muted">
                {t.declared && (<><T en="Declared " bn="ঘোষণা " /><DateT iso={t.declared} /></>)}
                {t.done && (<>{t.declared ? " · " : ""}<T en="done " bn="সম্পন্ন " /><DateT iso={t.done} /></>)}
                {t.price_low != null && t.price_high != null && (
                  <>
                    {" · "}
                    <T
                      en={`price then ${money(t.price_low)} to ${money(t.price_high)}`}
                      bn={`তখন দাম ${money(t.price_low)} থেকে ${money(t.price_high)}`}
                    />
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {s.trend.length > 0 && (
        <ul className="rp-rows">
          {s.trend.map((g, i) => {
            const up = g.to_pct > g.from_pct;
            return (
              <li key={i} className="text-sm">
                <span className="text-text-muted">
                  {tx(g.group)} · <DateT iso={g.from_date} /> → <DateT iso={g.to_date} />
                </span>
                <b className={`shrink-0 tabular-nums nums ${up ? "text-positive" : "text-negative"}`}>
                  {g.from_pct.toFixed(1)}% → {g.to_pct.toFixed(1)}%
                </b>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ------------------------------------------------------------------ risks

export function RisksDetails({ s }: { s: RisksSection }) {
  if (!s.items.length) return null;
  return (
    <ol className="mt-1 grid gap-3">
      {s.items.map((r, i) => {
        // The first risk is usually the row's answer: don't print it twice.
        const isHeadline = r.text.en === s.headline.en;
        if (isHeadline && !r.trigger) return null;
        return (
          <li key={i} className="flex gap-3 text-sm leading-snug">
            <span className="rp-n" aria-hidden="true">{i + 1}</span>
            <span className="min-w-0 pt-1">
              {!isHeadline && <span className="block text-text-main">{tx(r.text)}</span>}
              {r.trigger && (
                <span className={`block text-xs text-text-muted ${isHeadline ? "" : "mt-0.5"}`}>
                  <T en="What would change our view: " bn="যা হলে আমাদের মত বদলাবে: " />
                  {tx(r.trigger)}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ what's coming up

/** Free: the dates ahead on one line. */
export function NextFree({ s }: { s: NextSection }) {
  const items = s.items.filter((it) => it.date).slice(0, 4);
  if (!items.length) return null;
  return (
    <DateLine
      label={`Coming up: ${items.map((it) => `${it.label.en} ${it.date}`).join(", ")}`}
      items={items.map((it, i) => ({
        key: `${it.kind}-${i}`,
        name: tx(it.label),
        when: (
          <>
            {it.approx && <T en="around " bn="সম্ভাব্য " />}
            <DateT iso={it.date} />
          </>
        ),
        strong: i === 0,
      }))}
    />
  );
}

export function NextDetails({ s }: { s: NextSection }) {
  const withExpect = s.items.filter((it) => it.expect);
  if (!withExpect.length) return null;
  return (
    <ul className="mt-1 grid gap-3">
      {withExpect.map((it, i) => (
        <li key={i} className="text-sm leading-snug">
          <b className="block text-text-main">{tx(it.label)}</b>
          <span className="text-text-main">{tx(it.expect)}</span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ better choices

export function AlternativesDetails({ s }: { s: AlternativesSection }) {
  if (!s.items.length) return null;
  return (
    <ul className="rp-rows">
      {s.items.map((a) => (
        <li key={a.code} className="text-sm">
          <Link href={`/stock/${a.code}`} prefetch={false} className="min-w-0 hover:underline active:opacity-70">
            <b className="block text-text-main">{a.name ?? a.code}</b>
            <span className="text-xs text-text-muted">
              {a.code} · {tx(a.why)}
            </span>
          </Link>
          <span className="shrink-0 text-right text-xs text-text-muted tabular-nums nums">
            <span className="block"><TierPill tier={getTier(a.score)} /></span>
            {a.pe != null && <T en={`${Math.round(a.pe)} years of profit`} bn={`${Math.round(a.pe)} বছরের মুনাফা`} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
