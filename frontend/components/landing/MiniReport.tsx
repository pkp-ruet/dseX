import Link from "next/link";
import {
  getTier,
  TIER_VAR,
  TIER_MEANINGS,
  TIER_LABELS,
  TIER_LABELS_BN,
  TIER_THRESHOLDS,
  type TierKey,
} from "@/lib/constants";
import { PILLARS, type LandingStock } from "@/lib/landing";
import { pillarColor } from "@/lib/insight-utils";
import Bn from "@/components/i18n/Bn";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";

/**
 * The report card the hero shows for whichever stock the visitor picks.
 *
 * It is the landing page's whole argument in one object: a score, the grade it
 * maps to, the five pillars it was built from, the plain verdict, and the numbers
 * behind it. Everything here is real data from /api/scores — there is no
 * placeholder mode, because a fake card would defeat the point.
 *
 * Labels are English only: this is a dense card, and doubling ten one-word
 * labels would wreck it. The one place Bengali earns its space is the verdict —
 * the sentence that actually explains the score.
 */

function fmt(n: number | null | undefined, digits = 2): string {
  return n == null ? "—" : n.toFixed(digits);
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function moveColor(n: number | null | undefined): string {
  if (n == null || n === 0) return "var(--text-muted)";
  return n > 0 ? "var(--positive)" : "var(--negative)";
}

/** One pillar row: name, a 0–10 bar, and the number itself. */
function PillarRow({ label, value }: { label: string; value: number | null }) {
  const color = pillarColor(value);
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value * 10));

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[7.5rem] shrink-0 text-xs font-semibold leading-tight text-text-muted">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        {value != null && (
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        )}
      </div>
      <span
        className="w-7 shrink-0 text-right text-xs font-extrabold tabular-nums nums"
        style={{ color: value == null ? "var(--text-muted)" : color }}
      >
        {value == null ? "—" : value.toFixed(1)}
      </span>
    </div>
  );
}

/** The grade bands on a 0–100 line, low to high. Widths are the band sizes. */
const BANDS: { tier: TierKey; from: number; to: number }[] = [
  { tier: "weak", from: 0, to: TIER_THRESHOLDS.AVERAGE },
  { tier: "average", from: TIER_THRESHOLDS.AVERAGE, to: TIER_THRESHOLDS.GOOD },
  { tier: "good", from: TIER_THRESHOLDS.GOOD, to: TIER_THRESHOLDS.EXCELLENT },
  { tier: "excellent", from: TIER_THRESHOLDS.EXCELLENT, to: 100 },
];

/**
 * Where this score sits on the grade scale: four coloured bands with a marker,
 * plus one line ("3 points from Excellent"). Reads without knowing what a 72
 * means — the colour does the work.
 */
function GradeScale({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const tier = getTier(s);
  const idx = BANDS.findIndex((b) => b.tier === tier);
  const next = BANDS[idx + 1];
  const gap = next ? Math.ceil(next.from - s) : 0;

  return (
    <div className="px-4 pb-3.5 sm:px-5">
      <div className="relative pt-1.5">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {BANDS.map((b) => (
            <span
              key={b.tier}
              className="h-full"
              style={{
                width: `${b.to - b.from}%`,
                background: TIER_VAR[b.tier],
                opacity: b.tier === tier ? 1 : 0.28,
              }}
            />
          ))}
        </div>
        {/* Marker */}
        <span
          aria-hidden
          className="absolute top-0 h-5 w-1 -translate-x-1/2 rounded-full border-2 border-surface"
          style={{ left: `${s}%`, background: "var(--text)" }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-text-muted">
        <span className="font-extrabold" style={{ color: TIER_VAR[tier] }}>
          {TIER_LABELS[tier]}
        </span>
        {next && gap > 0 ? (
          <> · {gap} point{gap === 1 ? "" : "s"} from {TIER_LABELS[next.tier]}</>
        ) : null}
        {!next && <> · the top grade</>}
        <Bn as="span" className="ml-1.5">
          ({TIER_LABELS_BN[tier]})
        </Bn>
      </p>
    </div>
  );
}

export default function MiniReport({ stock }: { stock: LandingStock }) {
  const tier = getTier(stock.score);
  const tierColor = TIER_VAR[tier];
  const hasSignal = stock.sig !== "none";
  const signalColor = stock.sig === "buy" ? "var(--positive)" : "var(--negative)";

  return (
    <article className="soft-card relative overflow-hidden">
      {/* Tier-coloured hairline — the card's grade is visible before you read it */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${tierColor}, transparent 88%)` }}
      />

      {/* Identity + the score itself */}
      <div
        className="flex items-start justify-between gap-4 p-4 sm:p-5"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${tierColor} 7%, transparent), transparent)`,
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-sm font-extrabold tracking-[0.03em]"
              style={{
                color: tierColor,
                background: `color-mix(in srgb, ${tierColor} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${tierColor} 28%, transparent)`,
              }}
            >
              {stock.code}
            </span>
            {stock.category && (
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
                Cat {stock.category}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-text-main">
            {stock.name ?? stock.code}
          </h3>
          {stock.sector && (
            <p className="mt-0.5 truncate text-xs font-medium text-text-muted">
              {stock.sector}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <ScoreBadge score={stock.score} tier={tier} size="lg" />
          <TierPill tier={tier} size="sm" />
        </div>
      </div>

      {stock.score != null && <GradeScale score={stock.score} />}

      {/* Verdict — the signal when there is one, else the tier's meaning.
          Never empty, never invented. */}
      <div
        className="border-y px-4 py-3 sm:px-5"
        style={{
          borderColor: "var(--border)",
          background: hasSignal
            ? `color-mix(in srgb, ${signalColor} 6%, transparent)`
            : "var(--surface-2)",
        }}
      >
        <div className="flex items-start gap-2.5">
          {hasSignal && (
            <SignalChip
              signal={stock.sig}
              strength={stock.strong ? "strong" : null}
              size="sm"
              className="shrink-0"
            />
          )}
          <p className="text-xs font-semibold leading-relaxed text-text-main">
            {stock.reasonEn ?? TIER_MEANINGS[tier]}
          </p>
        </div>
        {stock.reasonBn && (
          <Bn className="mt-1.5 text-xs leading-relaxed text-text-muted">
            {stock.reasonBn}
          </Bn>
        )}
      </div>

      {/* The five pillars — this is the part that says "there is a method here" */}
      <div className="flex flex-col gap-2 px-4 py-3.5 sm:px-5">
        <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
          The five checks behind the score
        </p>
        {PILLARS.map((p, i) => (
          <PillarRow key={p.key} label={p.en} value={stock.pillars[i]} />
        ))}
      </div>

      {/* Hard numbers */}
      <div className="grid grid-cols-4 gap-2 border-t border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-sm font-extrabold tabular-nums nums text-text-main">
            ৳{fmt(stock.ltp)}
          </div>
          <span className="mt-0.5 block truncate text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            Price
          </span>
        </div>
        <div className="min-w-0">
          <div
            className="text-sm font-extrabold tabular-nums nums"
            style={{ color: moveColor(stock.chg) }}
          >
            {fmtSigned(stock.chg)}
          </div>
          <span className="mt-0.5 block truncate text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            Today
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold tabular-nums nums text-text-main">
            {stock.divY == null ? "—" : `${stock.divY.toFixed(1)}%`}
          </div>
          <span className="mt-0.5 block truncate text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            Dividend
          </span>
        </div>
        <div className="min-w-0">
          <div
            className="text-sm font-extrabold tabular-nums nums"
            style={{ color: moveColor(stock.epsG) }}
          >
            {fmtSigned(stock.epsG)}
          </div>
          <span className="mt-0.5 block truncate text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
            Profit growth
          </span>
        </div>
      </div>

      {/* Provenance — the reader can see how old the underlying report is. */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-2.5 sm:px-5">
        <span className="text-xs font-semibold text-text-muted">
          {stock.year ? `Based on the FY${stock.year} report` : "No annual report on file"}
          {stock.stale && <span className="text-watch"> · report is old</span>}
        </span>
        <Link
          href={`/stock/${stock.code}`}
          prefetch={false}
          className="shrink-0 text-xs font-bold text-primary-ink hover:underline"
        >
          Full report →
        </Link>
      </div>
    </article>
  );
}
