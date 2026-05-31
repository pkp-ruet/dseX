import Link from "next/link";
import { type CompanyDetail } from "@/lib/api";
import { getTier, TIER_LABELS } from "@/lib/constants";
import { verdictHeadline, verdictTone } from "@/lib/plain-language";

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Live "what you get" teaser: price + plain-English verdict + key numbers for one real stock. */
export default function SampleAnalysisCard({ detail }: { detail: CompanyDetail }) {
  const { profile, latest_price, score_row, verdict, financials } = detail;

  const score = toNum(score_row?.score);
  const tier = getTier(score);
  const tone = verdictTone(score);
  const word = verdict?.headline ?? verdictHeadline(score);
  const tagline = verdict?.tagline ?? verdict?.sentences?.[0] ?? null;

  const ltp = latest_price?.ltp ?? null;
  const chg = latest_price?.change_pct ?? null;
  const chgUp = (chg ?? 0) >= 0;

  // Mirror the real stock page's Key Numbers logic
  const sortedFins = [...financials].sort(
    (a, b) => Number((b as Record<string, unknown>).year ?? 0) - Number((a as Record<string, unknown>).year ?? 0),
  );
  const latestFin = sortedFins[0] as Record<string, unknown> | undefined;
  const eps = toNum(latestFin?.eps) ?? toNum(latestFin?.eps_cont_basic) ?? toNum(latestFin?.eps_basic);
  const peStored = toNum(latestFin?.pe_ratio_cont_basic) ?? toNum(latestFin?.pe_ratio_basic);
  const pe = peStored ?? (eps != null && eps > 0 && ltp != null ? ltp / eps : null);
  const divYield = toNum(score_row?.div_yield_pct);

  const stats: { label: string; value: string }[] = [
    { label: "EPS", value: eps != null ? `৳${eps.toFixed(2)}` : "--" },
    { label: "P/E", value: pe != null ? pe.toFixed(1) : "--" },
    { label: "Div Yield", value: divYield != null ? `${divYield.toFixed(2)}%` : "--" },
  ];

  return (
    <div className="rounded-2xl border bg-[var(--surface)] shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden" style={{ borderColor: tone.border }}>
      {/* Header: identity + score */}
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-[var(--border)]">
        <div className="min-w-0">
          <span className="inline-block text-[0.55rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">
            Example · any stock
          </span>
          <div className="font-extrabold text-base text-[var(--text)] leading-tight truncate">
            {profile.company_name ?? profile.trading_code}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full" style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}>
              {profile.trading_code}
            </span>
            {profile.sector && (
              <span className="text-[0.66rem] text-[var(--text-muted)] truncate">{profile.sector}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <div className="text-[0.58rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">Score</div>
            <div className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: tone.color }}>
              {score != null ? Math.round(score) : "--"}
            </div>
          </div>
          <span className="text-[0.6rem] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full text-white" style={{ background: tone.color }}>
            {TIER_LABELS[tier]}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline justify-between gap-3 px-4 sm:px-5 pt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tabular-nums text-[var(--text)]">
            {ltp != null ? `৳${ltp.toFixed(2)}` : "--"}
          </span>
          {chg != null && (
            <span className="text-sm font-bold tabular-nums" style={{ color: chgUp ? "var(--positive)" : "var(--negative)" }}>
              {chgUp ? "▲" : "▼"} {chgUp ? "+" : ""}{chg.toFixed(2)}%
            </span>
          )}
        </div>
        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Latest price</span>
      </div>

      {/* Verdict teaser */}
      <div className="px-4 sm:px-5 pt-3">
        <span className="font-extrabold text-lg leading-tight" style={{ color: tone.color }}>{word}</span>
        {tagline && (
          <p className="mt-1 text-[0.82rem] leading-snug text-[var(--text-muted)] line-clamp-2">{tagline}</p>
        )}
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-px bg-[var(--border)] mt-4 border-t border-[var(--border)]">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--surface)] px-3 py-3 text-center">
            <div className="text-[0.58rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">{s.label}</div>
            <div className="mt-1 text-base font-extrabold tabular-nums text-[var(--text)]">{s.value}</div>
          </div>
        ))}
      </div>

      <Link
        href={`/stock/${profile.trading_code}`}
        className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        See full analysis for {profile.trading_code} →
      </Link>
    </div>
  );
}
