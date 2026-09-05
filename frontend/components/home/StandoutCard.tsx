import Link from "next/link";
import type { CSSProperties } from "react";
import Bn from "@/components/i18n/Bn";
import SignalChip from "@/components/ui/SignalChip";
import {
  getTier,
  TIER_VAR,
  TIER_GRADES,
  TIER_MEANINGS,
  TIER_MEANINGS_BN,
} from "@/lib/constants";
import { PILLARS, pillarBand, PILLAR_BAND_COLOR } from "@/lib/landing";
import { bdGroup } from "@/lib/formatters";
import type { StoryStock, StoryKey } from "@/lib/home-stories";
import type { ScoreItem } from "@/lib/api";

/**
 * One of the three daily standouts (strongest / biggest cash dividend / fastest
 * growing profit), as a small report card.
 *
 * Shared by the marketing landing page (block 4) and the logged-in dashboard, so
 * the same three picks look the same wherever a reader meets them.
 *
 * It is a report, not a teaser: the slot it won and the number that won it, who
 * the company is and what we grade it, today's price and the two headline
 * figures this card ISN'T about, the five checks behind the score, and the plain
 * verdict. The whole pitch is that we show our working — a card that showed one
 * number would argue against it.
 */

/**
 * Labels, glyph and accent for the three slots. `pickStoryStocks` also produces
 * a full headline sentence, which reads as marketing copy here — the short
 * label, the number and the card's own `shortLine` claim say more.
 *
 * `accent` fills (tiles, tints, borders) and paints the big figure; `ink` is the
 * darker sibling used wherever the colour has to carry small text.
 */
const SLOT: Record<
  StoryKey,
  { label: string; unit: string; accent: string; ink: string; glyph: string }
> = {
  strongest: {
    label: "Strongest overall",
    unit: "out of 100",
    accent: "var(--tier-excellent)",
    ink: "var(--tier-excellent)",
    glyph: "★",
  },
  dividend: {
    label: "Biggest cash dividend",
    unit: "a year",
    accent: "var(--warm)",
    ink: "var(--warm-ink)",
    glyph: "৳",
  },
  growth: {
    label: "Fastest growing profit",
    unit: "in one year",
    accent: "var(--primary)",
    ink: "var(--primary-ink)",
    glyph: "▲",
  },
};

function fmt1(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${fmt1(n)}%`;
}

function moveColor(n: number | null | undefined): string {
  if (n == null || n === 0) return "var(--text)";
  return n > 0 ? "var(--positive)" : "var(--negative)";
}

/** The one number this card won its slot with. */
function figure(card: StoryStock): string {
  const it = card.item;
  if (card.key === "dividend") return it.div_yield_pct == null ? "—" : `${fmt1(it.div_yield_pct)}%`;
  if (card.key === "growth") {
    if (it.eps_yoy_pct == null) return "—";
    return `${it.eps_yoy_pct > 0 ? "+" : ""}${Math.round(it.eps_yoy_pct)}%`;
  }
  return it.score == null ? "—" : String(Math.round(it.score));
}

/**
 * The same claim in a second, more concrete form — arithmetic on the numbers
 * already on the card, never a projection. Returns null when the inputs aren't
 * there, so nothing is ever invented to fill the line.
 */
function subLine(card: StoryStock): string | null {
  const it = card.item;

  if (card.key === "dividend") {
    if (it.div_yield_pct == null || it.div_yield_pct <= 0) return null;
    return `About ৳${bdGroup(it.div_yield_pct * 100)} a year for every ৳10,000 at today's price.`;
  }

  if (card.key === "growth") {
    const { eps, eps_yoy_pct: yoy } = it;
    if (eps == null || eps <= 0 || yoy == null || yoy <= -99) return null;
    const before = eps / (1 + yoy / 100);
    if (!Number.isFinite(before) || before <= 0) return null;
    return `Profit per share went from ৳${before.toFixed(2)} to ৳${eps.toFixed(2)}.`;
  }

  const known = pillarValues(it).filter((v): v is number => v != null);
  const strong = known.filter((v) => v >= 7).length;
  if (known.length === 0 || strong === 0) return null;
  return strong === 5
    ? "Strong on all five checks below."
    : `Strong on ${strong} of the five checks below.`;
}

/** The five pillars in P1..P5 order, matching `PILLARS`. */
function pillarValues(it: ScoreItem): (number | null)[] {
  return [
    it.p1_biz ?? null,
    it.p2_health ?? null,
    it.p3_moat ?? null,
    it.p4_val ?? null,
    it.p5_div ?? null,
  ];
}

interface Stat {
  label: string;
  value: string;
  color: string;
}

/**
 * Four hard numbers per card: today's price and move, plus the two headline
 * figures this card is NOT about — so the dividend card still shows its score
 * and nothing is quietly left out of the picture.
 */
function stats(card: StoryStock): Stat[] {
  const it = card.item;

  const score: Stat = {
    label: "Score",
    value: it.score == null ? "—" : String(Math.round(it.score)),
    color: TIER_VAR[getTier(it.score)],
  };
  const dividend: Stat = {
    label: "Dividend",
    value: it.div_yield_pct == null ? "—" : `${fmt1(it.div_yield_pct)}%`,
    color: "var(--text)",
  };
  const growth: Stat = {
    label: "Profit growth",
    value: fmtSigned(it.eps_yoy_pct),
    color: moveColor(it.eps_yoy_pct),
  };

  const rest =
    card.key === "strongest"
      ? [dividend, growth]
      : card.key === "dividend"
        ? [score, growth]
        : [score, dividend];

  return [
    {
      label: "Price",
      value: it.ltp == null ? "—" : `৳${it.ltp.toFixed(2)}`,
      color: "var(--text)",
    },
    { label: "Today", value: fmtSigned(it.change_pct), color: moveColor(it.change_pct) },
    ...rest,
  ];
}

/** One pillar as a small vertical bar — the hero's report card, shrunk. */
function PillarBar({ label, value }: { label: string; value: number | null }) {
  const color = PILLAR_BAND_COLOR[pillarBand(value)];
  const pct = value == null ? 0 : Math.max(6, Math.min(100, value * 10));

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span
        className="text-[0.68rem] font-extrabold leading-none tabular-nums nums"
        style={{ color: value == null ? "var(--text-muted)" : color }}
      >
        {value == null ? "—" : value.toFixed(1)}
      </span>
      <span className="flex h-7 w-full items-end overflow-hidden rounded-[4px] bg-[var(--surface-2)]">
        {value != null && (
          <span className="w-full rounded-[4px]" style={{ height: `${pct}%`, background: color }} />
        )}
      </span>
      <span className="w-full truncate text-center text-[0.68rem] font-bold leading-none text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

export default function StandoutCard({ card }: { card: StoryStock }) {
  const it = card.item;
  const tier = getTier(it.score);
  const tierColor = TIER_VAR[tier];
  const meta = SLOT[card.key];
  const value = figure(card);
  const sub = subLine(card);
  const pillars = pillarValues(it);

  return (
    <Link
      href={`/stock/${it.trading_code}`}
      prefetch={false}
      className="acc-card acc-top group flex flex-col no-underline"
      style={{ "--acc": meta.accent } as CSSProperties}
    >
      {/* Which slot this card won, and whether we currently rate it a buy */}
      <div
        className="flex items-center gap-2.5 border-b px-3.5 py-2.5 sm:px-4"
        style={{
          borderColor: `color-mix(in srgb, ${meta.accent} 18%, var(--border))`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${meta.accent} 9%, transparent), transparent)`,
        }}
      >
        <span className="icon-tile icon-tile-sm text-[0.95rem] font-extrabold leading-none" aria-hidden>
          {meta.glyph}
        </span>
        <span
          className="min-w-0 flex-1 text-[0.68rem] font-extrabold uppercase leading-tight tracking-[0.1em]"
          style={{ color: meta.ink }}
        >
          {meta.label}
        </span>
        <SignalChip signal={it.signal?.signal} strength={it.signal?.strength} />
      </div>

      {/* Who it is, what we grade it, and the number that earned the slot */}
      <div className="flex items-start justify-between gap-3 px-3.5 pt-3.5 sm:px-4">
        <div className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.8rem] font-extrabold leading-none tracking-[0.03em]"
              style={{
                color: tierColor,
                background: `color-mix(in srgb, ${tierColor} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${tierColor} 28%, transparent)`,
              }}
            >
              {it.trading_code}
            </span>
            <span
              className="inline-flex h-[1.05rem] w-[1.05rem] shrink-0 items-center justify-center rounded text-[0.68rem] font-extrabold leading-none text-white"
              style={{ background: tierColor }}
              title={TIER_MEANINGS[tier]}
            >
              {TIER_GRADES[tier]}
            </span>
          </span>
          <p className="mt-1.5 line-clamp-2 text-[0.78rem] font-bold leading-snug text-[var(--text)]">
            {it.company_name ?? it.trading_code}
          </p>
          {it.sector && (
            <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-[var(--text-muted)]">
              {it.sector}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <span
            className={`font-display block font-extrabold leading-none tabular-nums nums ${
              value.length > 4 ? "text-[1.5rem]" : "text-[1.9rem]"
            }`}
            style={{ color: meta.accent }}
          >
            {value}
          </span>
          <span className="mt-1 block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {meta.unit}
          </span>
        </div>
      </div>

      {/* The claim, plus the same claim in money or in taka per share */}
      <div
        className="mx-3.5 mt-3 rounded-lg border px-2.5 py-2 sm:mx-4"
        style={{
          borderColor: `color-mix(in srgb, ${meta.accent} 20%, transparent)`,
          background: `color-mix(in srgb, ${meta.accent} 7%, transparent)`,
        }}
      >
        <p className="text-[0.76rem] font-bold leading-snug text-[var(--text)]">{card.shortLine}</p>
        {sub && (
          <p className="mt-0.5 text-[0.7rem] font-semibold leading-snug text-[var(--text-muted)]">
            {sub}
          </p>
        )}
      </div>

      {/* Hard numbers — today's price and move, then what this card isn't about */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 px-3.5 sm:px-4">
        {stats(card).map((s) => (
          <div key={s.label} className="min-w-0">
            <span
              className="block truncate text-[0.8rem] font-extrabold leading-none tabular-nums nums"
              style={{ color: s.color }}
            >
              {s.value}
            </span>
            <span className="mt-1 block truncate text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* The five checks behind the score — the same method the hero card shows */}
      <div className="mt-3.5 px-3.5 sm:px-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          The five checks behind the score
        </p>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          {PILLARS.map((p, i) => (
            <PillarBar key={p.key} label={p.short} value={pillars[i]} />
          ))}
        </div>
      </div>

      {/* The verdict in one line, English then Bengali */}
      <div className="mt-3 px-3.5 sm:px-4">
        <p className="line-clamp-2 text-[0.72rem] font-semibold leading-snug text-[var(--text)]">
          {card.reasonEn ?? TIER_MEANINGS[tier]}
        </p>
        <Bn className="mt-0.5 line-clamp-2 text-[0.72rem] leading-snug text-[var(--text-muted)]">
          {card.reasonBn ?? TIER_MEANINGS_BN[tier]}
        </Bn>
      </div>

      {/* The card is one big link, so this is a styled affordance rather than a
          nested control — hidden from screen readers to avoid a double read. */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 sm:px-4">
        <span className="truncate text-[0.68rem] font-semibold text-[var(--text-muted)]">
          {it.last_reported_year
            ? `From the FY${it.last_reported_year} report`
            : "No annual report on file"}
        </span>
        <span
          aria-hidden
          className="shrink-0 text-[0.72rem] font-extrabold"
          style={{ color: meta.ink }}
        >
          Full report{" "}
          <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}
