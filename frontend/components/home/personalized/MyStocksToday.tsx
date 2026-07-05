import Link from "next/link";
import {
  type ScoreItem,
  type NearExtremesData,
  type DividendsUpcoming,
  type PortfolioHolding,
} from "@/lib/api";
import { signed } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import TierPill from "@/components/ui/TierPill";

const MAX_ROWS = 6;

interface AlertChip {
  label: string;
  color: string;
}

/** Merged movers list: holdings and watchlist in one feed, sorted by today's
 *  move size, tagged H (holding) / ★ (watching) with 52w + dividend chips. */
export default function MyStocksToday({
  holdings,
  codes,
  priceMap,
  extremes,
  dividends,
}: {
  holdings: PortfolioHolding[];
  codes: string[];
  priceMap: Map<string, ScoreItem>;
  extremes: NearExtremesData | null;
  dividends: DividendsUpcoming | null;
}) {
  const held = new Set(holdings.map((h) => h.trading_code.toUpperCase()));
  const watched = new Set(codes.map((c) => c.toUpperCase()));
  const universe = Array.from(new Set([...held, ...watched]));

  const nearHigh = new Set((extremes?.near_high ?? []).map((e) => e.trading_code.toUpperCase()));
  const nearLow = new Set((extremes?.near_low ?? []).map((e) => e.trading_code.toUpperCase()));
  const divSoon = new Set(
    [...(dividends?.upcoming_declarations ?? []), ...(dividends?.upcoming_record_dates ?? [])].map((d) =>
      d.trading_code.toUpperCase(),
    ),
  );

  const rows = universe
    .map((c) => priceMap.get(c))
    .filter((x): x is ScoreItem => !!x)
    .sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0))
    .slice(0, MAX_ROWS);
  if (rows.length === 0) return null;

  function alertsFor(code: string): AlertChip[] {
    const c = code.toUpperCase();
    const out: AlertChip[] = [];
    if (nearHigh.has(c)) out.push({ label: "Near 52W high", color: "var(--positive)" });
    if (nearLow.has(c)) out.push({ label: "Near 52W low", color: "var(--negative)" });
    if (divSoon.has(c)) out.push({ label: "Dividend soon", color: "var(--watch)" });
    return out;
  }

  const viewHref = watched.size > 0 ? "/watchlist" : "/portfolio";

  return (
    <Card as="section" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border)]">
        <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Your stocks today</h2>
        <Link href={viewHref} className="text-xs font-semibold text-[var(--primary)] hover:underline">
          View all {universe.length} →
        </Link>
      </div>

      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((item) => {
          const code = item.trading_code.toUpperCase();
          const chg = item.change_pct;
          const chgColor = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
          const chips = alertsFor(code);
          return (
            <Link
              key={item.trading_code}
              prefetch={false}
              href={`/stock/${item.trading_code}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-[var(--text)] tracking-wide max-w-[6.5rem] shrink-0 truncate">
                    {item.trading_code}
                  </span>
                  <TierPill score={item.score} variant="solid" size="sm" />
                  {held.has(code) && (
                    <span
                      title="In your portfolio"
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-[0.6rem] font-extrabold"
                      style={{
                        color: "var(--primary)",
                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--primary) 26%, var(--border))",
                      }}
                    >
                      H
                    </span>
                  )}
                  {watched.has(code) && (
                    <span
                      title="On your watchlist"
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-[0.6rem] font-extrabold"
                      style={{
                        color: "var(--watch)",
                        background: "color-mix(in srgb, var(--watch) 14%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--watch) 30%, var(--border))",
                      }}
                    >
                      ★
                    </span>
                  )}
                </span>
                {chips.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {chips.map((a) => (
                      <span
                        key={a.label}
                        className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: a.color, background: "var(--surface-2)", border: "1px solid var(--border)" }}
                      >
                        {a.label}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-semibold tabular-nums nums text-[var(--text)]">
                  {item.ltp != null ? `৳${item.ltp.toFixed(2)}` : "—"}
                </span>
                <span className="block text-xs font-bold tabular-nums nums" style={{ color: chgColor }}>
                  {chg == null ? "--" : `${signed(chg)}%`}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
