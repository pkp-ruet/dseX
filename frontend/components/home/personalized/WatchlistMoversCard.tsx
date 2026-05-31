import Link from "next/link";
import { type ScoreItem, type NearExtremesData, type DividendsUpcoming } from "@/lib/api";
import { getTier, TIER_LABELS, type TierKey } from "@/lib/constants";
import { signed } from "@/lib/formatters";

const TIER_VAR: Record<TierKey, string> = {
  strong_buy: "var(--strong-buy)",
  buy: "var(--np-good)",
  keep_watching: "var(--watch)",
  avoid: "var(--avoid)",
};

interface Alert {
  label: string;
  color: string;
}

export default function WatchlistMoversCard({
  codes,
  priceMap,
  extremes,
  dividends,
}: {
  codes: string[];
  priceMap: Map<string, ScoreItem>;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
}) {
  const nearHigh = new Set((extremes?.near_high ?? []).map((e) => e.trading_code.toUpperCase()));
  const nearLow = new Set((extremes?.near_low ?? []).map((e) => e.trading_code.toUpperCase()));
  const divSoon = new Set(
    [...(dividends?.upcoming_declarations ?? []), ...(dividends?.upcoming_record_dates ?? [])].map((d) =>
      d.trading_code.toUpperCase(),
    ),
  );

  const rows = codes
    .map((c) => priceMap.get(c.toUpperCase()))
    .filter((x): x is ScoreItem => !!x)
    .sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0))
    .slice(0, 6);

  function alertsFor(code: string): Alert[] {
    const c = code.toUpperCase();
    const out: Alert[] = [];
    if (nearHigh.has(c)) out.push({ label: "Near 52W high", color: "var(--positive)" });
    if (nearLow.has(c)) out.push({ label: "Near 52W low", color: "var(--negative)" });
    if (divSoon.has(c)) out.push({ label: "Dividend soon", color: "var(--watch)" });
    return out;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_16px_rgba(15,23,42,0.05)] overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border)]">
        <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">★ Your Watchlist Today</h2>
        <Link href="/watchlist" className="text-xs font-semibold text-[var(--primary)] hover:underline">View all →</Link>
      </div>

      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((item) => {
          const tier = getTier(item.score);
          const chg = item.change_pct;
          const chgColor = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
          const alerts = alertsFor(item.trading_code);
          return (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[var(--text)] tracking-wide w-[5.5rem] shrink-0 truncate">{item.trading_code}</span>
                  <span className="text-[0.58rem] font-bold uppercase px-1.5 py-0.5 rounded text-white whitespace-nowrap" style={{ background: TIER_VAR[tier] }}>
                    {TIER_LABELS[tier]}
                  </span>
                </span>
                {alerts.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {alerts.map((a) => (
                      <span key={a.label} className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: a.color, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                        {a.label}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-semibold tabular-nums text-[var(--text)]">
                  {item.ltp != null ? `৳${item.ltp.toFixed(2)}` : "—"}
                </span>
                <span className="block text-xs font-bold tabular-nums" style={{ color: chgColor }}>
                  {chg == null ? "--" : `${signed(chg)}%`}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
