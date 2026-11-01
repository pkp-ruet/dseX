import Link from "next/link";
import Stat from "@/components/ui/Stat";
import { T } from "@/components/i18n/T";
import { changePct, companyShort, money, takaGroup } from "@/lib/formatters";
import type { ComputedRow, PortfolioAnalysis } from "@/lib/portfolio-analysis";

/**
 * The sample's money and shares (2026-11-02): what the portfolio page's hero
 * and shares list show, as one card — worth now, profit since bought, money
 * put in, how many shares and businesses — then one row per share (company
 * name first, code · shares · bought at, value and profit on the right).
 * Server-rendered: both languages are in the HTML.
 */
export default function SampleHoldings({ rows, analysis }: { rows: ComputedRow[]; analysis: PortfolioAnalysis }) {
  const cost = rows.reduce((a, r) => a + r.cost_basis, 0);
  const priced = rows.filter((r) => r.current_value != null);
  const value = priced.reduce((a, r) => a + (r.current_value as number), 0);
  const pnl = priced.length ? value - priced.reduce((a, r) => a + r.cost_basis, 0) : null;
  const pnlPct = pnl != null && cost > 0 ? (pnl / cost) * 100 : null;
  const tone = pnl == null || pnl === 0 ? "default" : pnl > 0 ? "positive" : "negative";
  const sectors = analysis.sectorSpread.length;
  const sorted = [...rows].sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0));

  return (
    <section id="smp-shares" className="dash-section smp-card soft-card" aria-labelledby="smp-shares-h">
      <h2 id="smp-shares-h" className="text-lg font-bold text-text-main">
        <T en="The money and the shares" bn="টাকা আর শেয়ার" />
      </h2>
      <div className="smp-stats">
        <Stat
          size="lg"
          value={priced.length ? takaGroup(value) : "—"}
          label={<T en="Worth today" bn="আজকের মূল্য" />}
        />
        <Stat
          size="lg"
          tone={tone}
          value={pnl == null ? "—" : `${pnl > 0 ? "+" : pnl < 0 ? "−" : ""}${takaGroup(Math.abs(pnl))}`}
          label={<T en="Profit since bought" bn="কেনার পর থেকে লাভ" />}
          sub={pnlPct != null ? changePct(pnlPct, 1) : undefined}
          subTone={tone === "default" ? "muted" : tone}
        />
        <Stat size="lg" value={takaGroup(cost)} label={<T en="Money put in" bn="বিনিয়োগ" />} />
        <Stat
          size="lg"
          value={String(rows.length)}
          label={<T en={sectors === 1 ? "Shares, in 1 business" : `Shares, in ${sectors} businesses`} bn={`শেয়ার, ${sectors}টি ব্যবসায়`} />}
        />
      </div>

      <ul className="smp-rows">
        {sorted.map((r) => {
          const code = r.holding.trading_code;
          const name = companyShort(r.company_name) || code;
          const t = r.pnl_pct == null ? "" : r.pnl_pct > 0 ? "text-positive" : r.pnl_pct < 0 ? "text-negative" : "";
          return (
            <li key={code}>
              <Link href={`/stock/${code}`} prefetch={false} className="smp-row">
                <span className="min-w-0">
                  <b className="smp-name">{name}</b>
                  <span className="smp-sub">
                    <T
                      en={`${code} · ${r.holding.qty} shares · bought at ${money(r.holding.buy_price)}`}
                      bn={`${code} · ${r.holding.qty}টি শেয়ার · কেনা ${money(r.holding.buy_price)}-এ`}
                    />
                  </span>
                </span>
                <span className="smp-right">
                  <b className="nums">{r.current_value != null ? takaGroup(r.current_value) : "—"}</b>
                  {r.pnl_pct != null && <span className={`nums ${t}`}>{changePct(r.pnl_pct, 1)}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
