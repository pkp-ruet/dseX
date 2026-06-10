import Link from "next/link";
import type { Top20Item } from "@/lib/api";
import { taka } from "@/lib/formatters";
import StarButton from "@/components/ui/StarButton";

interface Props {
  item: Top20Item;
}

const MEDAL_COLORS: Record<1 | 2 | 3, { bg: string; ring: string; text: string }> = {
  1: { bg: "#F5D169", ring: "#B8860B", text: "#3B2A00" },
  2: { bg: "#E0E0E0", ring: "#9A9A9A", text: "#2A2A2A" },
  3: { bg: "#E0986A", ring: "#8C4A1F", text: "#3B1F00" },
};

function fmtSigned(val: number | null, decimals = 1): string {
  if (val == null) return "—";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(decimals)}%`;
}

function chgColor(val: number | null) {
  if (val == null) return "var(--ink-muted)";
  if (val > 0) return "#34D399";
  if (val < 0) return "#F87171";
  return "var(--ink-muted)";
}

export default function Top20Card({ item }: Props) {
  const medal = item.rank <= 3 ? MEDAL_COLORS[item.rank as 1 | 2 | 3] : null;
  const days = item.days_counted || 7;
  const upBars = "▰".repeat(item.up_days_7d) + "▱".repeat(Math.max(0, days - item.up_days_7d));

  const sweetSpot =
    item.pct_in_52w_range != null && item.pct_in_52w_range >= 60 && item.pct_in_52w_range <= 90;
  const extended = item.pct_in_52w_range != null && item.pct_in_52w_range >= 95;

  const volPct = item.volume_ratio != null ? Math.round((item.volume_ratio - 1) * 100) : null;

  return (
    <article className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {/* Header: rank + ticker + sector + star */}
      <div className="flex items-start gap-3">
        {medal ? (
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-full font-extrabold"
            style={{
              width: 36,
              height: 36,
              background: medal.bg,
              border: `2px solid ${medal.ring}`,
              color: medal.text,
              fontSize: 15,
            }}
          >
            {item.rank}
          </span>
        ) : (
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-full font-bold text-sm border border-[var(--border)] bg-[var(--bg)] text-[var(--ink-muted)]"
            style={{ width: 36, height: 36 }}
          >
            {item.rank}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              prefetch={false} href={`/stock/${item.trading_code}`}
              className="text-base font-bold hover:opacity-80 transition-opacity"
              style={{ color: "#60A5FA" }}
            >
              {item.trading_code}
            </Link>
            {item.sector && (
              <span className="text-xs text-[var(--ink-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
                {item.sector}
              </span>
            )}
            {sweetSpot && (
              <span
                className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                style={{ color: "#34D399", border: "1px solid #34D39955", background: "#34D39918" }}
                title="Trading in the 60–90% range of its 52-week high — momentum sweet spot"
              >
                Sweet spot
              </span>
            )}
            {extended && (
              <span
                className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                style={{ color: "#FBBF24", border: "1px solid #FBBF2455", background: "#FBBF2418" }}
                title="Within 5% of 52-week high — extension risk"
              >
                Extended
              </span>
            )}
          </div>
          {item.company_name && (
            <p className="mt-1 text-sm text-[var(--ink)]">{item.company_name}</p>
          )}
        </div>

        <div className="shrink-0 flex items-start">
          <StarButton code={item.trading_code} size="sm" />
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wide">LTP</div>
          <div className="font-bold text-[var(--ink)]">{taka(item.ltp ?? null, 1)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wide">7d Return</div>
          <div className="font-bold" style={{ color: chgColor(item.return_7d_pct ?? null) }}>
            {fmtSigned(item.return_7d_pct ?? null, 2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wide">vs DSEX</div>
          <div className="font-semibold" style={{ color: chgColor(item.rs_vs_dsex_pct ?? null) }}>
            {fmtSigned(item.rs_vs_dsex_pct ?? null, 2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wide">Turnover</div>
          <div className="font-semibold text-[var(--ink)]">
            {volPct != null ? (volPct >= 0 ? `+${volPct}%` : `${volPct}%`) : "—"}{" "}
            <span className="text-xs text-[var(--ink-muted)]">vs 30d</span>
          </div>
        </div>
      </div>

      {/* Up/down day bar */}
      <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
        <span className="font-mono tracking-tighter" style={{ color: "#34D399" }}>
          {upBars}
        </span>
        <span>
          {item.up_days_7d}/{days} up days
        </span>
      </div>

      {/* Rationale */}
      <p className="text-sm text-[var(--ink)] leading-relaxed border-l-2 border-[var(--primary)] pl-3">
        {item.rationale}
      </p>

      {/* CTA */}
      <Link
        prefetch={false} href={`/stock/${item.trading_code}`}
        className="inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
      >
        View full analysis →
      </Link>
    </article>
  );
}
