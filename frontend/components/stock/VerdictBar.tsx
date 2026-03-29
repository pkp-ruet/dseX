import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import { getTier } from "@/lib/constants";
import { taka, pct, signed } from "@/lib/formatters";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

export default function VerdictBar({ detail }: Props) {
  const { profile, latest_price, score_row } = detail;
  const score = score_row?.score as number | null;
  const tier = getTier(score);
  const rank = score_row?.overall_rank as number | null;
  const total = score_row?.total_scored as number | null;

  // P/E context
  const ltp = latest_price.ltp;
  const fins = detail.financials;
  const latestEps = fins.length
    ? (fins[fins.length - 1] as Record<string, number | null>)["eps"] ?? null
    : null;
  const peNow = ltp && latestEps && latestEps > 0 ? ltp / latestEps : null;
  const avgPe5yr = (() => {
    const pes = fins
      .map((r) => (r as Record<string, number | null>)["pe_ratio_cont_basic"] ?? (r as Record<string, number | null>)["pe_ratio_basic"])
      .filter((v): v is number => v != null && v > 0);
    return pes.length >= 2 ? pes.reduce((a, b) => a + b, 0) / pes.length : null;
  })();

  const peContext =
    peNow && avgPe5yr
      ? peNow / avgPe5yr < 0.85
        ? "CHEAP"
        : peNow / avgPe5yr > 1.15
        ? "EXPENSIVE"
        : "FAIR"
      : null;
  const peContextColor =
    peContext === "CHEAP"
      ? "var(--positive)"
      : peContext === "EXPENSIVE"
      ? "var(--negative)"
      : "var(--text-muted)";

  // Div yield
  const divYield = score_row?.div_yield_pct as number | null;

  const changeColor =
    latest_price.change_pct == null
      ? "text-gray-400"
      : latest_price.change_pct > 0
      ? "text-[var(--positive)]"
      : latest_price.change_pct < 0
      ? "text-[var(--negative)]"
      : "text-gray-500";

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 mb-4">
      <div className="flex flex-wrap items-start gap-4">
        {/* Score block */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <ScoreBadge score={score} size="lg" />
          <TierPill tier={tier} />
          {rank && total && (
            <span className="text-xs text-[var(--text-muted)]">#{rank} of {total}</span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-[var(--border)] hidden sm:block" />

        {/* Price */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--text-muted)]">Last Price</span>
          <span className="text-xl font-bold">{taka(ltp)}</span>
          {latest_price.change_pct != null && (
            <span className={`text-sm font-medium ${changeColor}`}>
              {signed(latest_price.change_pct)}%
            </span>
          )}
        </div>

        <div className="w-px self-stretch bg-[var(--border)] hidden sm:block" />

        {/* P/E */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--text-muted)]">P/E vs 5yr Avg</span>
          <span className="text-sm font-bold">{peNow ? peNow.toFixed(1) : "--"}</span>
          {peContext && (
            <span className="text-xs font-semibold" style={{ color: peContextColor }}>
              {peContext}
            </span>
          )}
        </div>

        <div className="w-px self-stretch bg-[var(--border)] hidden sm:block" />

        {/* Dividend yield */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--text-muted)]">Dividend Yield</span>
          <span className="text-sm font-bold">{divYield != null ? pct(divYield) : "--"}</span>
          <span className="text-xs text-[var(--text-muted)]">cash div / LTP</span>
        </div>

        {/* 52w range */}
        <div className="flex flex-col gap-0.5 ml-auto">
          <span className="text-xs text-[var(--text-muted)]">52W Range</span>
          {latest_price.w52_high && (
            <span className="text-xs text-[var(--positive)] font-medium">
              H: {taka(latest_price.w52_high)}
            </span>
          )}
          {latest_price.w52_low && (
            <span className="text-xs text-[var(--negative)] font-medium">
              L: {taka(latest_price.w52_low)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
