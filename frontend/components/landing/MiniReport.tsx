import Link from "next/link";
import { getTier, TIER_VAR, TIER_LABELS, TIER_GRADES, TIER_MEANINGS } from "@/lib/constants";
import { PILLARS, pillarBand, PILLAR_BAND_COLOR, type LandingStock } from "@/lib/landing";
import Bn from "@/components/i18n/Bn";

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
  const band = pillarBand(value);
  const color = PILLAR_BAND_COLOR[band];
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value * 10));

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[7.5rem] shrink-0 text-[0.72rem] font-semibold leading-tight text-[var(--text-muted)]">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
        {value != null && (
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        )}
      </div>
      <span
        className="w-7 shrink-0 text-right text-[0.7rem] font-extrabold tabular-nums nums"
        style={{ color: value == null ? "var(--text-muted)" : color }}
      >
        {value == null ? "—" : value.toFixed(1)}
      </span>
    </div>
  );
}

export default function MiniReport({ stock }: { stock: LandingStock }) {
  const tier = getTier(stock.score);
  const tierColor = TIER_VAR[tier];
  const hasSignal = stock.sig !== "none";
  const signalColor = stock.sig === "buy" ? "var(--positive)" : "var(--negative)";
  const signalLabel =
    stock.sig === "buy" ? (stock.strong ? "Strong Buy" : "Buy") : "Sell";

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
              className="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[0.82rem] font-extrabold tracking-[0.03em]"
              style={{
                color: tierColor,
                background: `color-mix(in srgb, ${tierColor} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${tierColor} 28%, transparent)`,
              }}
            >
              {stock.code}
            </span>
            {stock.category && (
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Cat {stock.category}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-[0.9rem] font-bold leading-snug text-[var(--text)]">
            {stock.name ?? stock.code}
          </h3>
          {stock.sector && (
            <p className="mt-0.5 truncate text-[0.7rem] font-medium text-[var(--text-muted)]">
              {stock.sector}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span
              className="font-display text-[2.4rem] font-extrabold leading-none tabular-nums nums"
              style={{ color: tierColor }}
            >
              {stock.score == null ? "—" : Math.round(stock.score)}
            </span>
            <span className="text-[0.7rem] font-bold text-[var(--text-muted)]">/100</span>
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded text-[0.7rem] font-extrabold text-white"
              style={{ background: tierColor }}
              aria-hidden
            >
              {TIER_GRADES[tier]}
            </span>
            <span className="text-[0.75rem] font-extrabold" style={{ color: tierColor }}>
              {TIER_LABELS[tier]}
            </span>
          </div>
        </div>
      </div>

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
            <span
              className="shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-white"
              style={{ background: signalColor }}
            >
              {signalLabel}
            </span>
          )}
          <p className="text-[0.78rem] font-semibold leading-relaxed text-[var(--text)]">
            {stock.reasonEn ?? TIER_MEANINGS[tier]}
          </p>
        </div>
        {stock.reasonBn && (
          <Bn className="mt-1.5 text-[0.76rem] leading-relaxed text-[var(--text-muted)]">
            {stock.reasonBn}
          </Bn>
        )}
      </div>

      {/* The five pillars — this is the part that says "there is a method here" */}
      <div className="flex flex-col gap-2 px-4 py-3.5 sm:px-5">
        <p className="mb-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          The five checks behind the score
        </p>
        {PILLARS.map((p, i) => (
          <PillarRow key={p.key} label={p.en} value={stock.pillars[i]} />
        ))}
      </div>

      {/* Hard numbers */}
      <div className="grid grid-cols-4 gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-[0.82rem] font-extrabold tabular-nums nums text-[var(--text)]">
            ৳{fmt(stock.ltp)}
          </div>
          <span className="mt-0.5 block truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Price
          </span>
        </div>
        <div className="min-w-0">
          <div
            className="text-[0.82rem] font-extrabold tabular-nums nums"
            style={{ color: moveColor(stock.chg) }}
          >
            {fmtSigned(stock.chg)}
          </div>
          <span className="mt-0.5 block truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Today
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-[0.82rem] font-extrabold tabular-nums nums text-[var(--text)]">
            {stock.divY == null ? "—" : `${stock.divY.toFixed(1)}%`}
          </div>
          <span className="mt-0.5 block truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Dividend
          </span>
        </div>
        <div className="min-w-0">
          <div
            className="text-[0.82rem] font-extrabold tabular-nums nums"
            style={{ color: moveColor(stock.epsG) }}
          >
            {fmtSigned(stock.epsG)}
          </div>
          <span className="mt-0.5 block truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Profit growth
          </span>
        </div>
      </div>

      {/* Provenance — the reader can see how old the underlying report is. */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 sm:px-5">
        <span className="text-[0.68rem] font-semibold text-[var(--text-muted)]">
          {stock.year ? `Based on the FY${stock.year} report` : "No annual report on file"}
          {stock.stale && <span className="text-[var(--np-cautious)]"> · report is old</span>}
        </span>
        <Link
          href={`/stock/${stock.code}`}
          prefetch={false}
          className="shrink-0 text-[0.7rem] font-bold text-[var(--primary-ink)] hover:underline"
        >
          Full report →
        </Link>
      </div>
    </article>
  );
}
