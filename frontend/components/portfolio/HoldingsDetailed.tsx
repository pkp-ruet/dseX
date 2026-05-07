import Link from "next/link";
import type { PortfolioAnalysis, QualityWord } from "@/lib/portfolio-analysis";
import { PILLAR_META, pillarColor } from "@/lib/insight-utils";
import { taka } from "@/lib/formatters";

const QUALITY_DOT: Record<QualityWord, string> = {
  Strong: "bg-green-500",
  Solid: "bg-blue-500",
  Average: "bg-amber-500",
  Weak: "bg-red-500",
  Unrated: "bg-gray-500",
};

interface Props {
  analysis: PortfolioAnalysis;
}

export default function HoldingsDetailed({ analysis }: Props) {
  const sorted = [...analysis.holdings].sort((a, b) => b.weightPct - a.weightPct);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">
          Holdings Breakdown
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Each holding scored across five fundamentals: business quality, financial health,
          competitive moat, valuation, and dividend.
        </p>
      </div>

      {sorted.map((h) => {
        const pnlAmount = h.pnlPct != null && h.ltp != null ? (h.ltp - h.buyPrice) * h.qty : null;
        const currentValue = h.ltp != null ? h.ltp * h.qty : null;
        const pnlColor =
          pnlAmount == null
            ? "text-[var(--text)]"
            : pnlAmount > 0
              ? "text-green-500"
              : pnlAmount < 0
                ? "text-red-500"
                : "text-[var(--text)]";

        return (
          <article
            key={h.code}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--border)]">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/stock/${h.code}`}
                  className="font-mono font-bold text-base text-[var(--primary)] hover:underline"
                >
                  {h.code}
                </Link>
                {h.companyName && (
                  <p className="text-sm text-[var(--text)] mt-0.5 leading-snug truncate">
                    {h.companyName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${QUALITY_DOT[h.qualityWord]}`}
                      aria-hidden
                    />
                    <span className="text-[var(--text)] font-medium">{h.qualityWord} company</span>
                  </span>
                  {h.sector && (
                    <span className="text-xs px-2 py-0.5 bg-[var(--border)]/40 border border-[var(--border)] rounded-full text-[var(--text-muted)]">
                      {h.sector}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-muted)]">
                    {h.weightPct.toFixed(0)}% of portfolio
                  </span>
                </div>
              </div>
              {h.score != null && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Overall
                  </p>
                  <p className="text-xl font-bold text-[var(--text)] leading-none mt-0.5">
                    {h.score.toFixed(0)}
                    <span className="text-xs text-[var(--text-muted)] font-normal">/100</span>
                  </p>
                </div>
              )}
            </div>

            {/* Numbers row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 border-b border-[var(--border)]">
              <Cell label="Buy Price" value={taka(h.buyPrice, 2)} />
              <Cell label="Qty" value={h.qty.toLocaleString()} />
              <Cell label="LTP" value={h.ltp != null ? taka(h.ltp, 2) : "—"} />
              <Cell
                label="Current Value"
                value={currentValue != null ? taka(currentValue, 0) : "—"}
              />
              <Cell
                label="P&L"
                value={
                  pnlAmount == null
                    ? "—"
                    : `${pnlAmount > 0 ? "+" : ""}${taka(pnlAmount, 0)}${
                        h.pnlPct != null
                          ? ` (${h.pnlPct > 0 ? "+" : ""}${h.pnlPct.toFixed(1)}%)`
                          : ""
                      }`
                }
                valueClass={pnlColor}
              />
            </div>

            {/* Pillar bars */}
            {h.score != null && (
              <div className="p-4 border-b border-[var(--border)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">
                  Strength Across Five Pillars
                </p>
                <div className="flex flex-col gap-2">
                  {PILLAR_META.map((p) => {
                    const v = h.pillars[p.key];
                    return (
                      <div key={p.key} className="flex items-center gap-3 text-sm">
                        <span className="text-xs text-[var(--text)] w-32 sm:w-36 shrink-0">
                          {p.label}
                        </span>
                        <div className="h-2 flex-1 rounded-full bg-[var(--border)]/40 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${v != null ? (v / 10) * 100 : 0}%`,
                              backgroundColor: pillarColor(v),
                            }}
                            aria-hidden
                          />
                        </div>
                        <span
                          className="text-xs font-mono font-semibold w-10 text-right shrink-0"
                          style={{ color: pillarColor(v) }}
                        >
                          {v != null ? `${v.toFixed(1)}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Entry label + link */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-[var(--text)] italic leading-relaxed flex-1">
                &ldquo;{h.entryLabel}&rdquo;
              </p>
              <Link
                href={`/stock/${h.code}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline shrink-0"
              >
                Read full stock analysis
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                </svg>
              </Link>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Cell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-0.5">
        {label}
      </p>
      <p className={`text-sm font-medium ${valueClass ?? "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}
