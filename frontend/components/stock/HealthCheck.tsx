"use client";
import { useState } from "react";
import { pillarHealthCheck, HEALTH_PILLAR_ORDER, type HealthCheckRow, type HealthStatus } from "@/lib/plain-language";
import { pillarColor } from "@/lib/insight-utils";
import {
  normalizeExtFinancials, roe3yAvg, debtToEquity, interestCoverage,
  cashFlowQuality, grossMargin, netMargin, toNum,
} from "@/lib/stock-metrics";
import type { CompanyDetail } from "@/lib/api";
import Card from "@/components/ui/Card";
import { T } from "@/components/i18n/T";

type ScoreRow = Record<string, number | string | boolean | null>;

interface Props {
  scoreRow: ScoreRow;
  detail: CompanyDetail;
}

// Status tones ride on the tier tokens — the same three bands `pillarColor`
// paints the bars with, so a "strong" row and an Excellent pill read as one thing.
function statusTone(status: HealthStatus) {
  const color =
    status === "strong" ? "var(--tier-excellent)" : status === "fair" ? "var(--tier-average)" : "var(--tier-weak)";
  return {
    color,
    bg: `color-mix(in srgb, ${color} 7%, transparent)`,
    border: `color-mix(in srgb, ${color} 22%, transparent)`,
    glyph: status === "strong" ? "check" : status === "fair" ? "dash" : "bang",
  } as const;
}

function StatusGlyph({ kind }: { kind: "check" | "dash" | "bang" }) {
  const common = {
    width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
  } as const;
  if (kind === "check") return <svg {...common}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
  if (kind === "dash") return <svg {...common}><path d="M6 12h12" /></svg>;
  return <svg {...common}><path d="M12 5v9" /><path d="M12 18.5h.01" /></svg>;
}

/** Short pillar names for the at-a-glance bars. */
export const PILLAR_NAMES: Record<string, { en: string; bn: string }> = {
  p1_biz:    { en: "Profit",           bn: "মুনাফা" },
  p2_health: { en: "Finances",         bn: "আর্থিক অবস্থা" },
  p3_moat:   { en: "Business",         bn: "ব্যবসার শক্তি" },
  p4_val:    { en: "Price",            bn: "দাম" },
  p5_div:    { en: "Dividend",         bn: "ডিভিডেন্ড" },
};

// Sub-metric keys per pillar, with their names in both languages.
const PILLAR_SUBS: Record<string, { key: string; en: string; bn: string }[]> = {
  p1_biz: [
    { key: "p1_eps_consist", en: "Years with a profit", bn: "মুনাফার বছর" },
    { key: "p1_eps_cagr", en: "Profit growing over the years", bn: "বছরে বছরে মুনাফা বৃদ্ধি" },
    { key: "p1_roe", en: "Profit on the owners' money", bn: "মালিকের টাকায় মুনাফা" },
    { key: "p1_npm_trend", en: "Keeping more of each sale", bn: "প্রতি বিক্রিতে বেশি রাখা" },
  ],
  p2_health: [
    // p2_de is null for banks / NBFIs and p2_capital is null for everyone else,
    // so exactly one leverage bar renders per company (rows with null hide).
    { key: "p2_de", en: "Few loans", bn: "কম ঋণ" },
    { key: "p2_capital", en: "Its own money", bn: "নিজস্ব টাকা" },
    { key: "p2_ic", en: "Can pay its interest", bn: "সুদ দেওয়ার সামর্থ্য" },
    { key: "p2_cfo", en: "Profit coming in as cash", bn: "মুনাফা নগদে আসা" },
    { key: "p2_cash", en: "Cash in hand", bn: "হাতে নগদ" },
  ],
  p3_moat: [
    { key: "p3_margin", en: "Profit kept from sales", bn: "বিক্রি থেকে থাকা মুনাফা" },
    { key: "p3_rev_vol", en: "Steady sales", bn: "স্থির বিক্রি" },
    { key: "p3_sector_rank", en: "Size in its sector", bn: "সেক্টরে আকার" },
    { key: "p3_capex", en: "Spending on growth", bn: "প্রবৃদ্ধিতে বিনিয়োগ" },
  ],
  p4_val: [
    { key: "p4_pe", en: "Price compared with profit", bn: "মুনাফার তুলনায় দাম" },
    { key: "p4_pb", en: "Price compared with what it owns", bn: "সম্পদের তুলনায় দাম" },
  ],
  p5_div: [
    { key: "p5_consist", en: "Pays every year", bn: "প্রতি বছর দেয়" },
    { key: "p5_payout", en: "Dividend it can afford", bn: "সামর্থ্যের মধ্যে ডিভিডেন্ড" },
    { key: "p5_yield", en: "Cash it pays on today's price", bn: "আজকের দামে নগদ ডিভিডেন্ড" },
    { key: "p5_dps_cagr", en: "Dividend growth", bn: "ডিভিডেন্ড বৃদ্ধি" },
  ],
};

type Fig = { en: string; bn: string; value: string };

/** Real computed figures shown alongside the sub-score bars. */
function pillarNumbers(pillarKey: string, detail: CompanyDetail): Fig[] {
  const rows = normalizeExtFinancials(detail.extended_financials);
  const last = rows[rows.length - 1];
  const sr = detail.score_row ?? {};
  const out: Fig[] = [];

  const push = (en: string, bn: string, val: string | null) => {
    if (val != null) out.push({ en, bn, value: val });
  };

  switch (pillarKey) {
    case "p1_biz": {
      // Plain words (2026-10-30): taka of profit per ৳100, never "ROE" / "margin".
      const roe = roe3yAvg(rows);
      const nm = last ? netMargin(last.net_profit, last.revenue ?? last.net_interest_income) : null;
      push("Profit a year on every ৳100 of the owners' money", "মালিকের প্রতি ৳100-এ বছরে মুনাফা", roe == null ? null : `৳${roe.toFixed(0)}`);
      push("Profit kept from every ৳100 it sells", "প্রতি ৳100 বিক্রিতে থাকা মুনাফা", nm == null ? null : `৳${nm.toFixed(0)}`);
      break;
    }
    case "p2_health": {
      // Banks / NBFIs are scored on a capital cushion (equity / assets); the
      // borrowings-based ratios below say nothing useful for them.
      const isLender = toNum(sr.p2_capital as number | null) != null;
      if (isLender) {
        const eq = toNum(last?.total_equity ?? null);
        const ta = toNum(last?.total_assets ?? null);
        push("Its own money in every ৳100 it holds", "প্রতি ৳100 সম্পদে নিজস্ব টাকা", eq != null && ta != null && ta > 0 ? `৳${((eq / ta) * 100).toFixed(0)}` : null);
      } else {
        const de = last ? debtToEquity(last.total_debt, last.total_equity) : null;
        const ic = last ? interestCoverage(last.ebit, last.interest_expense) : null;
        push("Loans for every ৳100 of the owners' money", "মালিকের প্রতি ৳100-এর বিপরীতে ঋণ", de == null ? null : `৳${(de * 100).toFixed(0)}`);
        push("Times its profit could pay the interest", "মুনাফা দিয়ে সুদ কতবার দেওয়া যায়", ic == null ? null : `${ic.toFixed(1)}`);
      }
      {
        const cq = last ? cashFlowQuality(last.operating_cf, last.net_profit) : null;
        push("Cash that came in for every ৳100 of profit", "প্রতি ৳100 মুনাফায় আসা নগদ", cq == null ? null : `৳${(cq * 100).toFixed(0)}`);
      }
      break;
    }
    case "p3_moat": {
      const gm = last ? grossMargin(last.gross_profit, last.revenue ?? last.net_interest_income) : null;
      push("Left from every ৳100 sold, before running costs", "প্রতি ৳100 বিক্রিতে খরচের আগে যা থাকে", gm == null ? null : `৳${gm.toFixed(0)}`);
      break;
    }
    case "p4_val": {
      const pe = toNum(sr.current_pe as number | null);
      const pb = toNum(sr.current_pb as number | null);
      const avgPe = toNum(sr.own_avg_pe as number | null);
      const basis = detail.valuation?.eps_basis;
      const avg = detail.valuation?.own_avg_pe_label;
      // "Years of its profit you pay for" is how the page says P/E (2026-10-30).
      void basis;
      void pb;
      push("Years of its profit you pay for today", "আজকের দামে কত বছরের মুনাফা", pe != null ? `${pe.toFixed(0)}` : null);
      push(
        avg ? `Usually, ${avg.en}` : "Usually",
        avg ? `সাধারণত, ${avg.bn}` : "সাধারণত",
        avgPe != null ? `${avgPe.toFixed(0)}` : null,
      );
      break;
    }
    case "p5_div":
      push("Cash a year on ৳100 at today's price", "আজকের দামে ৳100-এ বছরে নগদ", (() => {
        const y = toNum(sr.div_yield_pct as number | null);
        return y == null ? null : `৳${y.toFixed(1)}`;
      })());
      push("Paid out of every ৳100 of profit", "প্রতি ৳100 মুনাফা থেকে দেওয়া", (() => {
        const p = toNum(sr.payout_pct as number | null);
        return p == null ? null : `৳${p.toFixed(0)}`;
      })());
      break;
  }
  return out;
}

/** One word for a check's score (2026-10-30: the bars say a word, never "8.1"). */
export function pillarWord(v: number): { en: string; bn: string } {
  return v >= 8 ? { en: "Strong", bn: "শক্তিশালী" }
    : v >= 6 ? { en: "Good", bn: "ভালো" }
    : v >= 4 ? { en: "Fair", bn: "মোটামুটি" }
    : { en: "Weak", bn: "দুর্বল" };
}

/** The five pillar scores as bars — free, the shape of the company at a
 *  glance. Each bar says a word (Strong / Good / Fair / Weak). */
export function PillarBars({ scoreRow }: { scoreRow: ScoreRow }) {
  const bars = HEALTH_PILLAR_ORDER
    .map((key) => ({ key, value: toNum(scoreRow[key] as number | null) }))
    .filter((b) => b.value != null);
  if (bars.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {bars.map((b) => {
        const v = b.value as number;
        const color = pillarColor(v);
        const name = PILLAR_NAMES[b.key] ?? { en: b.key, bn: b.key };
        return (
          <div key={b.key} className="flex items-center gap-3">
            <span className="w-[8.5rem] sm:w-[10rem] shrink-0 text-xs font-semibold leading-tight text-text-muted">
              <T en={name.en} bn={name.bn} />
            </span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`${name.en}: ${pillarWord(v).en}`}
            >
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, v * 10))}%`, background: color }} />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-bold" style={{ color }}>
              <T en={pillarWord(v).en} bn={pillarWord(v).bn} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The five checks, explained — one row per pillar that opens to the plain
 * explanation, the real figures and the sub-scores. Lives in the stock
 * report's quality section, inside its one Premium panel (the old full
 * verdict's first-free / PremiumMask split went with that page, 2026-10-29).
 */
export default function HealthCheck({ scoreRow, detail }: Props) {
  // The backend replaces a band's generic wording when it would contradict the
  // numbers (profitable every year but "loses money", "low loans" beside loans
  // bigger than the reserve, "strong dividend" at a 2% yield, banks and "loans").
  const overrides = detail.health_overrides ?? {};
  const rows = HEALTH_PILLAR_ORDER
    .map((key): HealthCheckRow | null => {
      const base = pillarHealthCheck(key, scoreRow[key] as number | null);
      const o = overrides[key];
      return base && o ? { ...base, ...o, pillarKey: key } : base;
    })
    .filter((r): r is HealthCheckRow => r != null);

  if (rows.length === 0) return null;

  // Plain rows split by hairlines, no tinted boxes — the status ring alone
  // carries the colour.
  return (
    <div className="divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <HealthRow key={row.pillarKey} row={row} scoreRow={scoreRow} detail={detail} plain />
      ))}
    </div>
  );
}

function HealthRow({ row, scoreRow, detail, plain = false }: {
  row: HealthCheckRow; scoreRow: ScoreRow; detail: CompanyDetail; plain?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tone = statusTone(row.status);

  const subs = (PILLAR_SUBS[row.pillarKey] ?? [])
    .map((s) => ({ ...s, score: toNum(scoreRow[s.key] as number | null) }))
    .filter((s) => s.score != null);
  const numbers = pillarNumbers(row.pillarKey, detail);

  return (
    <div
      className={plain ? "" : "rounded-xl transition-colors"}
      style={plain ? undefined : { background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left flex items-center gap-4 ${plain ? "py-4" : "p-4 sm:p-5"}`}
        aria-expanded={open}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 44, height: 44,
            background: tone.bg,
            border: `1.5px solid ${tone.border}`,
            color: tone.color,
          }}
          aria-hidden="true"
        >
          <StatusGlyph kind={tone.glyph} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-bold leading-tight text-text-main">
            <T en={row.headline} bn={row.headlineBn} />
          </p>
          <p className="text-sm leading-snug mt-0.5 text-text-muted">
            <T en={row.oneLine} bn={row.oneLineBn} />
          </p>
        </div>
        <svg
          className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className={`space-y-4 ${plain ? "pb-4" : "px-4 sm:px-5 pb-4 sm:pb-5"}`}>
          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            <T en={row.learnMore} bn={row.learnMoreBn} />
          </div>

          {numbers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {numbers.map((n) => (
                <Card key={n.en} padding="none" className="rounded-xl p-3">
                  <p className="text-xs font-semibold mb-1 text-text-muted">
                    <T en={n.en} bn={n.bn} />
                  </p>
                  <p className="text-lg font-bold tabular-nums nums text-text-main">{n.value}</p>
                </Card>
              ))}
            </div>
          )}

          {subs.length > 0 && (
            <div className="space-y-2">
              {subs.map((s) => {
                const score = s.score as number;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="text-xs w-32 shrink-0 text-text-muted">
                      <T en={s.en} bn={s.bn} />
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden bg-surface-2"
                      role="img"
                      aria-label={`${s.en}: ${pillarWord(score).en}`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(2, Math.min(100, score * 10))}%`, background: pillarColor(score) }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs font-semibold text-text-main">
                      <T en={pillarWord(score).en} bn={pillarWord(score).bn} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
