import Link from "next/link";
import TierPill from "@/components/ui/TierPill";
import { pct, taka } from "@/lib/formatters";
import type { SectorStockRow } from "@/lib/api";

type Metric = "change_pct" | "return_7d_pct" | "div_yield_pct";

function value(s: SectorStockRow, metric: Metric) {
  const v = s[metric];
  if (v == null) return { text: "—", color: "var(--text-muted)" };
  if (metric === "div_yield_pct") {
    return { text: pct(v, 1), color: "var(--positive)" };
  }
  return {
    text: `${v > 0 ? "+" : ""}${pct(v, metric === "change_pct" ? 2 : 1)}`,
    color: v > 0 ? "var(--positive)" : v < 0 ? "var(--negative)" : "var(--text-muted)",
  };
}

function List({ title, note, stocks, metric, accent }: {
  title: string;
  note: string;
  stocks: SectorStockRow[];
  metric: Metric;
  accent: string;
}) {
  if (stocks.length === 0) return null;

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        background: `color-mix(in srgb, ${accent} 5%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${accent} 22%, var(--border))`,
      }}
    >
      <h3 className="text-[0.9rem] font-extrabold tracking-tight text-[var(--text)]">{title}</h3>
      <p className="mt-0.5 text-[0.72rem] font-semibold text-[var(--text-muted)]">{note}</p>

      <div className="mt-2.5 flex flex-col">
        {stocks.map((s) => {
          const v = value(s, metric);
          return (
            <div
              key={s.trading_code}
              className="flex items-center justify-between gap-2 border-t border-[var(--border)] py-2 first:border-0 first:pt-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/stock/${s.trading_code}`}
                  className="font-display text-[0.86rem] font-extrabold tracking-tight text-[var(--text)] hover:text-[var(--primary)]"
                >
                  {s.trading_code}
                </Link>
                {s.tier && <TierPill tier={s.tier} />}
              </div>
              <div className="flex flex-shrink-0 items-baseline gap-2.5 tabular-nums">
                <span className="text-[0.76rem] font-semibold text-[var(--text-muted)]">
                  {s.ltp != null ? taka(s.ltp) : "—"}
                </span>
                <span className="text-[0.84rem] font-extrabold" style={{ color: v.color }}>
                  {v.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Four short lists that answer "what stands out here" — today's extremes, the
 * week's leaders, and who pays the most. The tier pill rides along on every row
 * because a big move or a fat yield says nothing about company strength.
 */
export default function SectorHighlights({
  gainers,
  losers,
  weekLeaders,
  topDividend,
}: {
  gainers: SectorStockRow[];
  losers: SectorStockRow[];
  weekLeaders: SectorStockRow[];
  topDividend: SectorStockRow[];
}) {
  if (!gainers.length && !losers.length && !weekLeaders.length && !topDividend.length) return null;

  return (
    <section className="mb-8" id="standouts">
      <div className="section-rule-modern">
        <span className="section-rule-text">What Stands Out</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <List
          title="Up most today"
          note="Latest trading day"
          stocks={gainers}
          metric="change_pct"
          accent="var(--positive)"
        />
        <List
          title="Down most today"
          note="Latest trading day"
          stocks={losers}
          metric="change_pct"
          accent="var(--negative)"
        />
        <List
          title="Strongest week"
          note="Last 7 trading days"
          stocks={weekLeaders}
          metric="return_7d_pct"
          accent="var(--info)"
        />
        <List
          title="Highest dividend yield"
          note="Gross, before tax — a high yield often means a fallen price"
          stocks={topDividend}
          metric="div_yield_pct"
          accent="var(--gold)"
        />
      </div>
    </section>
  );
}
