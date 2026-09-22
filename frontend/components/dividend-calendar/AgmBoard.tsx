import Bn from "@/components/i18n/Bn";
import StockRow, { StockRowValue } from "@/components/ui/StockRow";
import { formatDate, pct } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";

function dividendLabel(e: CorporateActionEvent) {
  const parts: string[] = [];
  if (e.cash_pct) parts.push(`${pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0)} cash`);
  if (e.stock_pct) parts.push(`${pct(e.stock_pct, e.stock_pct % 1 ? 2 : 0)} bonus`);
  return parts.length ? parts.join(" + ") : "No dividend";
}

function daysLabel(days: number | null | undefined) {
  if (days == null) return undefined;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Announced AGM dates — where the dividend gets approved before it's paid. */
export default function AgmBoard({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8" id="agms">
      <div className="section-rule-modern">
        <span className="section-rule-text">Upcoming AGMs</span>
      </div>

      <p className="mb-1 text-sm font-semibold text-text-main">
        A final dividend is only a recommendation until shareholders approve it at the
        AGM. Payment follows after that, usually within 30 days.
      </p>
      <Bn className="mb-4 text-sm font-medium leading-[1.85] text-text-muted">
        AGM-তে শেয়ারহোল্ডাররা অনুমোদন দিলেই চূড়ান্ত লভ্যাংশ পাওয়া যায় — এরপর সাধারণত 30 দিনের মধ্যে টাকা আসে।
      </Bn>

      <ul className="stock-list">
        {events.map((e) => (
          <StockRow
            key={`${e.trading_code}-${e.agm_date}`}
            code={e.trading_code}
            name={e.company_name}
            sub={<span className="font-semibold">{dividendLabel(e)} up for approval</span>}
            subTone={e.cash_pct ? "positive" : "muted"}
            right={
              <StockRowValue
                value={<span className="text-xs">AGM {formatDate(e.agm_date)}</span>}
                sub={daysLabel(e.agm_days_left)}
                subTone={e.agm_days_left != null && e.agm_days_left <= 1 ? "watch" : "muted"}
              />
            }
          />
        ))}
      </ul>
    </section>
  );
}
