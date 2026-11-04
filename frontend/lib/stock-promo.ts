/**
 * What the stock page's Premium card leads with (2026-11-04, user: "need this
 * kind of same improvement in stock page premium promo" — after the
 * portfolio card's). Pure, built on the server from the report the page
 * already has: counts, dates and kinds that are free on the page (the chart's
 * events, the "What's next" dates, the red-flag counts, the three lights'
 * colours), never an answer.
 */
import type { Bi, ChartEvent, NextSection, StockReport, Tone } from "@/lib/stock-report";

/** The nearest dated thing ahead (results, a board meeting, a record date, an AGM). */
export interface PromoSoon {
  kind: "results" | "board" | "record" | "agm";
  date: string;
  /** The date is our estimate from last year's. */
  approx: boolean;
  label: Bi;
  /** Cash a share, for a record date (free on the page). */
  cashPs: number | null;
}

export interface StockPromoLead {
  /** The answer's three lights, worst first — a count, never which light. */
  lights: Tone[];
  /** The safety checks: how many, how many serious, how many smaller. */
  checks: { total: number; red: number; amber: number } | null;
  soon: PromoSoon | null;
  /** What happened on the share in the last 90 days, newest first. */
  happened: { date: string; kind: ChartEvent["kind"]; label: Bi }[];
  /** What the report shows on THIS share, from counts (the backend's `offer`). */
  shows: Bi[];
}

const TONE_RANK: Record<Tone, number> = { bad: 0, fair: 1, neutral: 2, good: 3 };
const SOON_DAYS = 14;
const HAPPENED_DAYS = 90;

const dayNum = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86_400_000;

export function buildStockPromo(report: StockReport | null): StockPromoLead | null {
  if (!report) return null;
  const today = dayNum(report.as_of);

  const lights = (report.answer?.lights ?? []).map((l) => l.tone).sort((a, b) => TONE_RANK[a] - TONE_RANK[b]);

  const rf = report.sections.red_flags;
  const checks = rf ? { total: rf.counts.checks, red: rf.counts.red, amber: rf.counts.amber } : null;

  const next: NextSection | undefined = report.sections.next;
  const cps = report.sections.dividend?.latest?.cash_ps ?? null;
  const soonItem = (next?.items ?? []).find(
    (it) =>
      it.date != null &&
      (it.kind === "results" || it.kind === "board" || it.kind === "record" || it.kind === "agm") &&
      dayNum(it.date) - today >= 0 &&
      dayNum(it.date) - today <= SOON_DAYS,
  );
  const soon: PromoSoon | null = soonItem?.date
    ? {
        kind: soonItem.kind as PromoSoon["kind"],
        date: soonItem.date,
        approx: soonItem.approx,
        label: soonItem.label,
        cashPs: soonItem.kind === "record" ? cps : null,
      }
    : null;

  const happened = (report.events ?? [])
    .filter((e) => {
      const d = today - dayNum(e.date);
      return d >= 0 && d <= HAPPENED_DAYS;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({ date: e.date, kind: e.kind, label: e.label }));

  return { lights, checks, soon, happened, shows: report.offer ?? [] };
}
